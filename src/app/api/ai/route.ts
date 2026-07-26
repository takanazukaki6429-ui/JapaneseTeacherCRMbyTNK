import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const profileAnalysisSchema = z.object({
    recommended_textbooks: z.array(z.object({
        title: z.string(),
        reason: z.string()
    })),
    teaching_strategy: z.string(),
});

const initialHearingSchema = z.object({
    estimated_jlpt_level: z.enum(['N5', 'N4', 'N3', 'N2', 'N1']),
    estimated_level_score: z.number().min(0).max(100),
    detected_purpose: z.enum(['anime', 'friends', 'travel', 'culture', 'live', 'work', 'beauty', 'challenge', 'other']),
    purpose_label: z.string(),
    kanji_necessity: z.enum(['required', 'optional', 'minimal']),
    focus_areas: z.array(z.string()),
    skip_recommendations: z.array(z.string()),
    period_months_suggestion: z.number().min(1).max(36),
    summary: z.string(),
    confidence: z.enum(['high', 'medium', 'low']),
    clarification_questions: z.array(z.string())
});
// Ensure GEMINI_API_KEY is set in .env.local
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, prompt, context, ...otherParams } = body;
        const supabase = await createClient();


        // [Security Fix] Authenticate user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json(
                { error: 'Unauthorized', details: 'Authentication required' },
                { status: 401 }
            );
        }

        // [Rate Limiting] 直近1時間の利用回数で制限する。
        // 用途ごとに発生頻度が桁違いなので枠を分ける（同じ枠にすると授業中に即枯れる）:
        //   - student_translation: 教師の発話ごとに生徒向け翻訳が飛ぶ。50分授業で数百回想定 → 600/時
        //   - それ以外（教材生成・ヒアリング解析・手動チャット等）: 20/時
        //   - transcribe（2.5秒チャンク）は /api/ai/transcribe 側の別枠なので常に除外
        const isStudentTranslation = type === 'student_translation';
        const hourlyLimit = isStudentTranslation ? 600 : 20;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let usageQuery = supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .neq('prompt_type', 'transcribe')
            .gte('created_at', oneHourAgo);

        usageQuery = isStudentTranslation
            ? usageQuery.eq('prompt_type', 'student_translation')
            : usageQuery.neq('prompt_type', 'student_translation');

        const { count, error: usageError } = await usageQuery;

        if (usageError) {
            console.error('Rate limit check failed:', usageError);
            // Optionally fail open or closed. Failing open for now to avoid blocking on DB errors, but logging it.
        } else if (count !== null && count >= hourlyLimit) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    details: `You have reached the limit of ${hourlyLimit} AI requests per hour for this feature. Please try again later.`
                },
                { status: 429 }
            );
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                {
                    error: 'API key not configured',
                    details: 'GEMINI_API_KEY is missing from process.env.'
                },
                { status: 500 }
            );
        }

        let finalPrompt = '';

        // Handle specific request types
        if (type === 'initial_hearing') {
            const { conversation_notes, student_name, nationality, native_language } = otherParams;
            if (!conversation_notes || typeof conversation_notes !== 'string') {
                return NextResponse.json(
                    { error: 'conversation_notes is required' },
                    { status: 400 }
                );
            }
            finalPrompt = `
あなたはベテラン日本語教師です。初回無料レッスン（30分）での生徒との会話メモを受け取り、最適なカリキュラムを設計するための判定を行います。

## 生徒情報
- 名前: ${student_name || '不明'}
- 国籍: ${nationality || '不明'}
- 母語: ${native_language || '不明'}

## 教師が取った会話メモ
${conversation_notes}

## 判定してほしい項目
1. 現在のJLPTレベル（N5〜N1）とスコア（0〜100の数値、N5=0-20/N4=20-40/N3=40-60/N2=60-80/N1=80-100）
2. 本当の学習目的（9カテゴリから選ぶ）
   - anime: アニメ・マンガ・ゲーム
   - friends: 日本人の友達を作りたい
   - travel: 旅行用
   - culture: 日本文化・伝統
   - live: 日本に住む・生活
   - work: 仕事・ビジネス
   - beauty: 美容・ファッション
   - challenge: JLPT受験・資格
   - other: その他
3. 漢字の必要度（required=必須 / optional=任意 / minimal=最小限）
4. 重点的にやるべき項目（3〜5個、具体的に）
5. 飛ばしてよい・優先度の低い項目（2〜4個、具体的に）
6. 推奨学習期間（月数、1〜36の整数）
7. 判定の確信度（high/medium/low）
8. 情報が不足している場合は、次回生徒に確認すべき質問を1〜3個

## 出力フォーマット（純粋なJSON、Markdownコードブロック禁止）
{
  "estimated_jlpt_level": "N4",
  "estimated_level_score": 30,
  "detected_purpose": "travel",
  "purpose_label": "旅行用",
  "kanji_necessity": "minimal",
  "focus_areas": ["場面別フレーズ（レストラン・駅・ホテル）", "基本的な質問表現", "カタカナの読み"],
  "skip_recommendations": ["ビジネス敬語", "難解な漢字の書き取り"],
  "period_months_suggestion": 3,
  "summary": "N4手前のレベル。旅行での日常会話を目的としており、漢字より場面別フレーズと発音に重点を置くのが最適。",
  "confidence": "medium",
  "clarification_questions": ["具体的にどの都市に旅行予定か？", "旅行までの期間はどのくらいか？"]
}
`;
        } else if (type === 'multilingual_feedback') {
            const LANG_CODE_MAP: Record<string, string> = {
                en: 'English', es: 'Español', pt: 'Português',
                ko: '한국어', zh: '中文', fr: 'Français', ja: '日本語',
            };
            const { topics, vocabulary, mistakes, homework, next_goal, understanding_level, language, language_name } = otherParams;
            // language code → derive name server-side; fall back to language_name for backward compat
            const resolvedLangName = (language && LANG_CODE_MAP[language as string]) || language_name;
            if (!resolvedLangName) {
                return NextResponse.json({ error: 'language (code) or language_name is required' }, { status: 400 });
            }
            const level = Number(understanding_level) || 3;
            const toneGuidance = level <= 2
                ? 'とても優しく励ます。難しかった部分を「よくチャレンジした」とポジティブに言い換え、自信を持たせることを最優先にする。'
                : level >= 4
                ? '進歩を具体的に称える。「着実に上達している」という自信を持たせ、次のステップへの期待感を高めるトーンにする。'
                : '温かく励ましながら、改善点を自然な形で含める。バランスの取れた建設的なトーンにする。';

            finalPrompt = `あなたはプロの日本語教師です。以下のレッスン記録をもとに、生徒に送る${resolvedLangName}のフィードバックメッセージを作成してください。

## 授業記録
- 学習トピック: ${topics || '未記録'}
- 語彙・表現: ${vocabulary || '未記録'}
- つまずき・弱点: ${mistakes || 'なし'}
- 宿題: ${homework || 'なし'}
- 次回目標: ${next_goal || '未設定'}
- 理解度: ${level}/5

## フィードバックの条件
- 生徒の母国語（${resolvedLangName}）で書く
- トーン調整（理解度${level}/5に応じて）: ${toneGuidance}
- 3〜5文程度のコンパクトなメッセージ
- 宿題と次回目標を自然に含める
- 絵文字を1〜2個使ってOK

フィードバックメッセージのみ出力してください（JSONや説明文は不要）。`;
        } else if (type === 'profile_analysis') {
            const { name, level, objective, weak_points, notes } = otherParams;
            finalPrompt = `
あなたはプロの日本語教師コンサルタントです。
以下の生徒プロフィールを分析し、最適化された学習プランを提案してください。
必ず以下のJSON形式**のみ**で出力してください。Markdownのコードブロック（\`\`\`jsonなど）は不要です。純粋なJSON文字列として返してください。

## 生徒プロフィール
- 名前: ${name || '不明'}
- 現在のレベル: ${level || '不明'}
- 学習目的: ${objective || '不明'}
- 苦手分野・補足: ${weak_points || 'なし'}
- その他メモ: ${notes || 'なし'}

## 出力フォーマット (JSON)
{
  "recommended_textbooks": [
    {"title": "教材名", "reason": "その教材を勧める具体的な理由"}
  ],
  "teaching_strategy": "この生徒への指導方針や接し方（性格や目的に合わせる）"
}
`;
        } else {
            // Default/Legacy behavior
            if (!prompt) {
                return NextResponse.json(
                    { error: 'Prompt is required' },
                    { status: 400 }
                );
            }

            finalPrompt = context
                ? `CONTEXT:\n${context}\n\nUSER PROMPT:\n${prompt}`
                : prompt;
        }

        // Fetch User Settings for Model Preference
        // User is already authenticated from above
        let selectedModel = 'gemini-2.5-flash';

        if (user) {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('ai_model')
                .eq('user_id', user.id)
                .single();

            if (settings?.ai_model) {
                selectedModel = settings.ai_model;
            }
        }

        // Initialize Gemini API here to ensure we use the current env var and handle missing keys gracefully
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // Define fallback models (all 1.x models are deprecated as of 2026)
        const modelsToTry = Array.from(new Set([
            selectedModel,
            'gemini-2.5-flash',
            'gemini-2.5-flash',
            'gemini-2.5-pro'
        ]));

        let lastError;
        for (const modelName of modelsToTry) {
            try {

                const model = genAI.getGenerativeModel({ model: modelName });

                const result = await model.generateContent(finalPrompt);
                const response = await result.response;
                const text = response.text();

                // [Audit] Log usage to DB
                // token_usage は実測値を記録する（従来0固定で原価が算出できなかった）。
                // 価格確定（2026-09末）に必要な1ユーザーあたり実原価の集計元になる。
                if (user) {
                    const usage = response.usageMetadata;
                    await supabase.from('ai_usage_log').insert({
                        user_id: user.id,
                        model: modelName,
                        prompt_type: type || 'general',
                        token_usage: usage?.totalTokenCount ?? 0
                    });
                }

                // AI Response Schema Validation (Enterprise Hardening)
                if (type === 'profile_analysis' || type === 'initial_hearing') {
                    try {
                        let cleanText = text.trim();
                        // Remove markdown formatting if LLM includes it despite instructions
                        if (cleanText.startsWith('\`\`\`json')) {
                            cleanText = cleanText.replace(/^\`\`\`json/, '').replace(/\`\`\`$/, '').trim();
                        } else if (cleanText.startsWith('\`\`\`')) {
                            cleanText = cleanText.replace(/^\`\`\`/, '').replace(/\`\`\`$/, '').trim();
                        }

                        const parsedData = JSON.parse(cleanText);
                        // Validate with Zod based on type
                        const validatedData = type === 'profile_analysis'
                            ? profileAnalysisSchema.parse(parsedData)
                            : initialHearingSchema.parse(parsedData);

                        return NextResponse.json({
                            text: JSON.stringify(validatedData),
                            data: validatedData,
                            model: modelName
                        });
                    } catch (validationErr) {
                        console.error('LLM Output Validation Failed:', validationErr);
                        // Retry next model if validation fails, otherwise handled below
                        throw new Error('LLM response did not match expected schema.');
                    }
                }

                return NextResponse.json({
                    text,
                    model: modelName
                });
            } catch (error: unknown) {

                lastError = error;
                // If it's not a 404 (Not Found) or 400 (Bad Request), strictly speaking we might want to stop, 
                // but for now we try the next model if it's a model-related error.
                // Continue to next model
            }
        }

        throw lastError; // If all fail, throw the last error

    } catch (error: unknown) {
        console.error('AI API Error Details:', error);

        return NextResponse.json(
            {
                error: 'Failed to generate content',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
