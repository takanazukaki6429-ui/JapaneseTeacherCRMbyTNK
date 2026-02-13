import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

// Initialize Gemini API
// Ensure GEMINI_API_KEY is set in .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { type, prompt, context, ...otherParams } = body;
        const supabase = await createClient();

        // Debug logging
        console.log('Environment Check:', {
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
        });

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
        const { data: { user } } = await supabase.auth.getUser();
        let selectedModel = 'gemini-1.5-flash';

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

        const model = genAI.getGenerativeModel({ model: selectedModel }); // Use selected model

        // Generate content
        const result = await model.generateContent(finalPrompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({
            text,
            model: selectedModel // Return used model for debugging/verification if needed
        });

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
