/**
 * v1.0 工程表 4.8: ユーザー向けAIサポート
 *
 * アプリ内でユーザーが質問すると、ASTAの使い方・トラブル対処を
 * AIが日本語で回答する。要件定義書 v1.0 §4.1.5。
 */

import { NextRequest, NextResponse } from 'next/server';
import { BUSINESS_CONTACT_EMAIL } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { withRetry } from '@/lib/retry';
import { checkRateLimit, getRequestIdentifier } from '@/lib/rate-limit';
import { maskPII } from '@/lib/pii-masking';
import { manualPlainText } from '@/lib/manual';
import { MANUAL_CHAPTERS } from '@/content/manual/chapters';

export const dynamic = 'force-dynamic';

// 問い合わせ先（2026-09-13 かずき決定：案A＝support@asta-crm.com を作って転送）。規約・プライバシーポリシーと同じ1つの設定値から読む。
// 受け取りの準備ができたら、かずきが Vercel の NEXT_PUBLIC_BUSINESS_EMAIL に support@asta-crm.com を入れる（コードは変えない）
const SUPPORT_CONTACT = `サポート（${BUSINESS_CONTACT_EMAIL}）`;

// 2026-10-09 書き直し（9-4）：画面の説明・困りごとは、アプリの中のマニュアル（content/manual/chapters.ts）と同じ文を読む。
// 「使い方」のページ・各画面の「この画面の使い方」と答えがずれないように、ここには画面の説明を書かない。
// 授業や教え方の相談はホームの「ASTAに聞く（授業の相談）」が受け持つ（2026-09-12 かずき決定：案A）
const SYSTEM_CONTEXT = `あなたはASTA（日本語教師向けの授業支援アプリ）の「使い方ヘルプ」です。
日本語教師のユーザーからの、ASTAの使い方と困りごとの質問に、親切・簡潔な日本語で答えてください。
答えは、下の「ASTAのマニュアル」に書いてあることだけをもとにしてください。

# ASTAのマニュアル（アプリの中の「使い方」のページと同じ文。［ ］はボタンの名前）
${manualPlainText(MANUAL_CHAPTERS)}

# 回答ルール
- 3文程度で簡潔に。手順は番号付きリストで
- ボタンや欄の名前は、マニュアルの名前をそのまま使う
- くわしい説明は、各画面の右上の「この画面の使い方」か、左の並びの「使い方」で読めると案内してよい
- 授業や教え方の相談（例：て形の教え方）は「ホームの『ASTAに聞く（授業の相談）』で聞いてください」と案内する
- マニュアルに書いていない機能を聞かれたら、あると断定しない。機能の範囲外・アカウント固有の問題は「${SUPPORT_CONTACT}にお問い合わせください」と案内する
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
            { answer: `申し訳ございません、ただいま回答を生成できませんでした。お急ぎの場合は ${BUSINESS_CONTACT_EMAIL} までお問い合わせください。` },
        );
    }
}
