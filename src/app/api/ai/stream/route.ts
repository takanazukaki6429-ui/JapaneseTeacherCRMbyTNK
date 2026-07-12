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
        const { type, transcript, studentContext, prepContext } = body;

        if (!transcript || transcript.trim().length === 0) {
            return NextResponse.json({ error: 'transcript is required' }, { status: 400 });
        }

        // レート制限（1時間あたり40リクエスト：ライブ授業は通常より上限を高く）
        // transcribe（2.5秒チャンクの翻訳）は別枠のため集計から除外
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .neq('prompt_type', 'transcribe')
            .gte('created_at', oneHourAgo);

        if (count !== null && count >= 40) {
            return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
        }

        // プロンプト構築
        let prompt = '';
        if (type === 'live_assistant') {
            const prepSection = prepContext
                ? `\n【本日の授業計画（準備ページより）】\n${prepContext}\n`
                : '';

            prompt = `あなたはベテラン日本語教師の判断力を持つリアルタイム授業アシスタントです。
教師の発言から今この瞬間の授業状況を分析し、「課の進め方」と「翻訳補助」の2種類のサジェストを出力してください。

${studentContext ? `【生徒情報・カリキュラム】\n${studentContext}\n` : ''}${prepSection}
【直近の授業会話（最新）】
${transcript}

## 出力フォーマット（必ずこの形式で）

[COURSE]
・課の進め方サジェストを最大2点、各1〜2文で記載。
・各サジェストの冒頭に緊急度ラベルを付けること：[今すぐ] / [この課で] / [次回以降]
　例：「[今すぐ] Unit5（漢字）はこの生徒のゴールには不要→Unit8へ飛ぶことを推奨」
　例：「[この課で] Unit3の助詞が定着していない→10分追加練習してから次へ」
　例：「[次回以降] 旅行フレーズUnit8を前倒し検討を」
　※ 特に指摘がない場合は「現在のペースで進めてOK」と記載
[/COURSE]

[TRANSLATION]
・教師が説明に迷いそうな語・表現の翻訳補助を最大2点、各1〜2文で記載。
・生徒の母国語（生徒情報参照）での言い方を優先して示すこと。
　例：「『〜てもらえますか』→ Could you ~? (EN) / ¿Podría ~? (ES)（丁寧依頼）」
　例：「『高い』→ expensive(価格) / tall(高さ) の違い—使い分けを強調」
　※ 翻訳補助が不要な場面なら「翻訳補助の出番なし」と記載
[/TRANSLATION]

⚠️ 日本語で回答。箇条書き・簡潔に。前置き・敬語・説明不要。[COURSE][/COURSE]、[TRANSLATION][/TRANSLATION]のタグは必ず含めること。`;
        } else {
            prompt = transcript;
        }

        // Geminiストリーミング
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const result = await model.generateContentStream(prompt);

        // 使用ログ記録（非同期・ノンブロッキング）
        supabase.from('ai_usage_log').insert({
            user_id: user.id,
            model: 'gemini-2.5-flash',
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
