import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

// Initialize Gemini API
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

        // [Rate Limiting] Check usage in the last hour
        // Limit: 20 requests per hour
        // Note: This requires 'ai_usage_log' table in Supabase
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count, error: usageError } = await supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', oneHourAgo);

        if (usageError) {
            console.error('Rate limit check failed:', usageError);
            // Optionally fail open or closed. Failing open for now to avoid blocking on DB errors, but logging it.
        } else if (count !== null && count >= 20) {
            return NextResponse.json(
                {
                    error: 'Rate limit exceeded',
                    details: 'You have reached the limit of 20 AI requests per hour. Please try again later.'
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
        if (type === 'profile_analysis') {
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
  "teaching_strategy": "この生徒への指導方針や接し方（性格や目的に合わせる）",
  "week_schedule": "推奨学習スケジュール案（例：週2回レッスン、毎日15分単語学習など）"
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
        let selectedModel = 'gemini-2.0-flash';

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
            'gemini-2.0-flash',
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
                if (user) {
                    await supabase.from('ai_usage_log').insert({
                        user_id: user.id,
                        model: modelName,
                        prompt_type: type || 'general',
                        token_usage: 0
                    });
                }

                return NextResponse.json({
                    text,
                    model: modelName
                });
            } catch (error: any) {

                lastError = error;
                // If it's not a 404 (Not Found) or 400 (Bad Request), strictly speaking we might want to stop, 
                // but for now we try the next model if it's a model-related error.
                // Continue to next model
            }
        }

        throw lastError; // If all fail, throw the last error

    } catch (error: any) {
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
