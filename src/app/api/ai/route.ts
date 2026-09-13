import { NextRequest, NextResponse } from 'next/server';
import { AI_USAGE_TYPE, OUTSIDE_GENERAL_BUCKET } from '@/lib/ai-usage';
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

// ホームの「ASTAに聞く（授業の相談）」への指示（2026-09-12 かずき指示：ふつうのAIでなく日本語教師の相談相手として答える）
const HOME_ASK_INSTRUCTIONS = `あなたは「ASTA」。日本語教師の授業づくりを助ける相談相手です。
相談してくるのは、オンラインで外国人に日本語を教える日本人の先生です。教えるのが初めての先生も多いので、専門用語は避け、使うときは短く言い換えてください。

# 答え方
- 結論から。すぐ次の授業で使える形で答える（先生の言い方の例・例文・進める順番・時間の目安など）
- 要点は3〜5個まで。1つの要点は2文以内
- 相談に生徒の名前が出てきたら、下の「この先生の生徒」の情報（レベル・使用教材・前回の内容・前回のつまずき）を踏まえて答える
- 生徒の情報に書かれていないことは推測で断定しない。分からない時は、先生が生徒に確かめるとよいことを挙げる
- ASTAの画面の操作方法を聞かれたら「画面右下の『？』（使い方ヘルプ）で聞いてください」と案内する
- 記号（** や #）は使わない。箇条書きは「・」で始める`;
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

        // [Rate Limiting] 先生1人ごとに、直近1時間の利用回数で制限する。
        // 用途ごとに発生頻度が桁違いなので枠を分け、各枠は自分の機能の分だけを数える（2026-09-13 かずき決定：案A）:
        //   - student_translation: 教師の発話ごとに生徒向け翻訳が飛ぶ。50分授業で数百回想定 → 600/時
        //   - それ以外（相談・準備・記録・体験レッスンなど）: 20/時。ほかの呼び出し先が自分の枠で数えている分
        //     （文字起こし・生徒向け翻訳・授業中のヒント・4つのボタン・絵・記録からの抜き出し）は入れない（lib/ai-usage.ts）
        const isStudentTranslation = type === 'student_translation';
        const hourlyLimit = isStudentTranslation ? 600 : 20;

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        let usageQuery = supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', oneHourAgo);

        usageQuery = isStudentTranslation
            ? usageQuery.eq('prompt_type', AI_USAGE_TYPE.studentTranslation)
            : usageQuery.not('prompt_type', 'in', OUTSIDE_GENERAL_BUCKET);

        const { count, error: usageError } = await usageQuery;

        if (usageError) {
            console.error('Rate limit check failed:', usageError);
            // Optionally fail open or closed. Failing open for now to avoid blocking on DB errors, but logging it.
        } else if (count !== null && count >= hourlyLimit) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    details: `この機能の利用が1時間あたりの上限（${hourlyLimit}回）に達しました。しばらく置いてからお試しください。`
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
        } else if (type === 'home_ask' || type === 'student_ask') {
            // ホームと生徒の1枚の「ASTAに聞く」：先生の生徒の情報をこの場で集めて、相談相手として答える
            if (!prompt) {
                return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
            }
            const [studentsResult, lessonsResult] = await Promise.all([
                supabase.from('students').select('id, name, nationality, jlpt_level, textbook').eq('user_id', user.id).limit(40),
                supabase.from('lessons').select('student_id, date, topics, mistakes, status, students!inner(user_id)')
                    .eq('students.user_id', user.id).order('date', { ascending: false }).limit(300),
            ]);
            const now = Date.now();
            const lastLesson = new Map<string, { date: string; topics: string | null; mistakes: string | null }>();
            for (const l of (lessonsResult.data ?? []) as { student_id: string; date: string; topics: string | null; mistakes: string | null; status: string | null }[]) {
                if (!lastLesson.has(l.student_id) && l.status !== 'scheduled' && new Date(l.date).getTime() <= now) lastLesson.set(l.student_id, l);
            }
            const students = (studentsResult.data ?? []) as { id: string; name: string; nationality: string | null; jlpt_level: string | null; textbook: string | null }[];
            const roster = students.map(st => {
                const last = lastLesson.get(st.id);
                return `- ${st.name}さん／国：${st.nationality ?? '不明'}／レベル：${st.jlpt_level ?? '不明'}／使用教材：${st.textbook ?? '未設定'}／前回の内容：${last?.topics?.trim() || '記録なし'}／前回のつまずき：${last?.mistakes?.trim() || '記録なし'}／最終授業日：${last ? last.date.slice(0, 10) : 'なし'}`;
            }).join('\n');
            finalPrompt = `${HOME_ASK_INSTRUCTIONS}\n\n# この先生の生徒（${students.length}人）\n${roster || '（まだ生徒が登録されていません）'}\n\n# 先生からの相談\n${prompt}`;
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
