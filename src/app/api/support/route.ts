/**
 * v1.0 工程表 4.8: ユーザー向けAIサポート
 *
 * アプリ内でユーザーが質問すると、ASTAの使い方・トラブル対処を
 * AIが日本語で回答する。要件定義書 v1.0 §4.1.5。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from '@/lib/retry';
import { checkRateLimit, getRequestIdentifier } from '@/lib/rate-limit';
import { maskPII } from '@/lib/pii-masking';

export const dynamic = 'force-dynamic';

// 問い合わせ先（かずき判断待ち 2026-09-12：今のメールアドレスのまま。決まったらここ1か所を差し替える）
const SUPPORT_CONTACT = 'サポート（takanazukaki6429@gmail.com）';

// 2026-09-12 書き直し：画面にある機能だけを書く（無くなった「字幕PiP」などは載せない）。
// 授業や教え方の相談はホームの「ASTAに聞く（授業の相談）」が受け持つ（かずき決定：案A）
const SYSTEM_CONTEXT = `あなたはASTA（日本語教師向けの授業支援アプリ）の「使い方ヘルプ」です。
日本語教師のユーザーからの、ASTAの使い方と困りごとの質問に、親切・簡潔な日本語で答えてください。

# ASTAの画面（左のナビは「ホーム」「生徒」「教材」「設定」の4つ）
- ホーム：生徒の様子（今の課・前回のつまずき・最終授業日）、ASTAからの声かけ、その場での生徒の追加、ASTAに聞く（授業の相談）
- 生徒：生徒の一覧と、生徒ごとの1枚（学習の現在地・授業の記録）。体験レッスンの聞き取りから学習計画（ロードマップ）を作れる
- 授業前の準備（レッスン準備）：次の授業の準備
- ライブ授業：先生の話した日本語を文字にし、生徒の母語に翻訳して表示する。「翻訳を始める」を押して生徒の声が流れるタブを共有すると、生徒の声も日本語と母語で表示される。下の4つのボタン（絵で見せる・例文・練習問題・やさしく言い換え）で、その場で見せる物を作れる。ASTAが「ヒント（進め方）」「ことばのヒント」を自動で出す
- 授業の記録（レッスン記録）：授業の記録と、生徒に送るフィードバック文の作成（英語・スペイン語・ポルトガル語・韓国語・中国語・フランス語・日本語の7言語）
- 教材：教材の一覧と中身
- 設定：パスワード変更、二段階認証、データのエクスポート、プランとお支払い、アカウントの削除

# 生徒に画面を見せるとき（Zoomなどの画面共有）
- ライブ授業の画面をそのまま共有する。共有する前に、上の帯の「共有モード」をオンにし、「ASTAのヒント」をオフにする（ASTAのヒントが生徒に見えないように）
- 左下の「授業前のメモ」を開いた時と、下の欄から先生がASTAに聞いた質問と答えは、共有中は生徒にも見える

# よくある困りごとと対処
- ライブ授業はChromeで使う
- 先生の吹き出しが出ない → 上の帯に出ているマイクの名前を確認する。iPhoneのマイクになっていたら、Macの「システム設定→サウンド→入力」で切り替えるか、iPhoneの「設定→一般→AirPlayとHandoff→連係カメラ」をオフにする
- 「マイクの音が取れません」と出る → 別のアプリがマイクを使っていないか確認する
- 生徒の声が出ない → 共有の画面で「Chromeタブ」を選び、下の「タブの音声も共有」にチェックを入れて、生徒の声が流れるタブ（Zoomなど）を共有する
- 生徒の声が先生の吹き出しに混ざる → スピーカーでなくヘッドホンを使う
- 翻訳が止まった → 利用量の上限に達した時は1時間ほど置いてから再開する。連続90分で自動停止した時は、もう一度「翻訳を始める」を押す
- ASTAが答えない → 少し待ってからもう一度試す

# 回答ルール
- 3文程度で簡潔に。手順は番号付きリストで
- 授業や教え方の相談（例：て形の教え方）は「ホームの『ASTAに聞く（授業の相談）』で聞いてください」と案内する
- ここに書いていない機能を聞かれたら、あると断定しない。機能の範囲外・アカウント固有の問題は「${SUPPORT_CONTACT}にお問い合わせください」と案内する
- 推測で断定しない`;

export async function POST(req: NextRequest) {
    // レート制限（AIサポート: 20回/分）
    const rate = checkRateLimit(getRequestIdentifier(req), {
        limit: 20, windowMs: 60_000, scope: 'support',
    });
    if (!rate.allowed) {
        return NextResponse.json(
            { error: 'リクエストが多すぎます。少し待ってからお試しください。' },
            { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
        );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    let question: string;
    try {
        const body = await req.json();
        question = String(body.question || '').slice(0, 1000);
    } catch {
        return NextResponse.json({ error: '入力が不正です' }, { status: 400 });
    }
    if (!question.trim()) {
        return NextResponse.json({ error: '質問を入力してください' }, { status: 400 });
    }

    // AI送信前にPIIマスキング
    const maskedQuestion = maskPII(question);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    try {
        const result = await withRetry(
            () => model.generateContent(`${SYSTEM_CONTEXT}\n\n# ユーザーの質問\n${maskedQuestion}`),
            { label: 'support', maxRetries: 2 }
        );
        return NextResponse.json({ answer: result.response.text() });
    } catch {
        return NextResponse.json(
            { answer: '申し訳ございません、ただいま回答を生成できませんでした。お急ぎの場合は takanazukaki6429@gmail.com までお問い合わせください。' },
        );
    }
}
