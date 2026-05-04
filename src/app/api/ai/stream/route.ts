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
            prompt = `あなたはベテラン日本語教師の判断力を持つリアルタイム授業アシスタントです。
教師の発言から今この瞬間の授業状況を分析し、「課の進め方」と「翻訳補助」の2種類のサジェストを出力してください。

${studentContext ? `【生徒情報・カリキュラム】\n${studentContext}\n` : ''}

【直近の授業会話】
${transcript}

## 出力フォーマット（必ずこの形式で）

[COURSE]
・ 課の進め方サジェストを最大2点、各1〜2文で記載。
　 例：「Unit5（漢字）はこの生徒のゴールには不要→スキップ推奨」
　 例：「Unit3の助詞が定着していない→10分戻ることを推奨」
　 例：「旅行ゴールにはUnit8の場面フレーズを今すぐ前倒しで」
　 ※ 特に指摘がない場合は「現在のペースで進めてOK」と記載
[/COURSE]

[TRANSLATION]
・ 翻訳補助サジェストを最大2点、各1〜3文で記載。
　 例：「『高い』の補足 → EN: That's expensive. / ES: Eso es caro.」
　 例：「『ください』のニュアンス → Please / Could you〜の違いを説明」
　 ※ 翻訳が不要な場面なら「翻訳補助の出番なし」と記載
[/TRANSLATION]

⚠️ 日本語で回答。箇条書き・簡潔に。「〜してください」等の敬語前置き不要。[COURSE]と[/COURSE]、[TRANSLATION]と[/TRANSLATION]のタグは必ず含めること。`;
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
