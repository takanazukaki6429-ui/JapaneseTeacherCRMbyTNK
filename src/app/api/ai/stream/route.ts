import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // 認証チェック
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 });
        }

        const body = await req.json();
        const { type, transcript, studentContext } = body;

        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
        }

        // レート制限（1時間あたり40リクエスト：ライブ授業は通常より上限を高く）
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .gte('created_at', oneHourAgo);

        if (count !== null && count >= 40) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        // プロンプト構築
        let prompt = '';
        if (type === 'live_assistant') {
            prompt = `あなたは日本語授業のリアルタイムアシスタントです。
教師の授業会話を分析して、教師に役立つアドバイスを簡潔に提供してください。

${studentContext ? `【生徒情報】\n${studentContext}\n` : ''}
【授業会話（直近）】
${transcript}

以下の観点から、教師に有益な情報を3点以内・各1〜2文で答えてください：
- 生徒が理解しにくそうな箇所への補足案
- より自然な言い回し・言い換え候補
- 英語での補足説明が有効な場合はその例文

⚠️ 日本語で回答。箇条書きで簡潔に。余計な前置きは不要。`;
        } else {
            prompt = transcript;
        }

        // Geminiストリーミング
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContentStream(prompt);

        // 使用ログ記録（非同期・ノンブロッキング）
        supabase.from('ai_usage_log').insert({
            user_id: user.id,
            model: 'gemini-2.0-flash',
            prompt_type: type || 'live_assistant',
            token_usage: 0
        }).then(() => {}, console.error);

        // SSE (Server-Sent Events) ストリームを返す
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of result.stream) {
                        const text = chunk.text();
                        if (text) {
                            controller.enqueue(
                                encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                            );
                        }
                    }
                    controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                    controller.close();
                } catch (err) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: String(err) })}\n\n`)
                    );
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: unknown) {
        console.error('Stream API Error:', error);
        return NextResponse.json(
            { error: 'Failed to stream content', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
