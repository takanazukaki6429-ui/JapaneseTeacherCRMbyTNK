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

const SYSTEM_CONTEXT = `あなたはASTA（日本語教師向けCRM・AI授業支援SaaS）のカスタマーサポートAIです。
日本語教師のユーザーからの質問に、親切・簡潔な日本語で答えてください。

# ASTAの主な機能
- 生徒管理：生徒の登録・JLPTレベル・学習目的の管理
- 初回ヒアリング：生徒の会話からAIがレベル・目標を判定しロードマップ生成
- ライブ授業アシスタント：授業中にAIが次の進め方をサジェスト（Chrome専用・マイク必要）
- リアルタイム翻訳・字幕：生徒の発話を翻訳。字幕PiPでPreplyの上に浮かせられる（Chrome 116+）
- 多言語フィードバック：7言語でレッスンフィードバックを自動生成
- 教材生成：マスター教材から生徒に最適化した教材を生成

# よくあるトラブルと対処
- マイクが動かない → Chromeで開き直す・マイク許可を確認
- 翻訳が届かない → 同一ブラウザ・同一PCで2タブを使う
- 字幕PiPボタンが出ない → Chrome 116以上に更新
- AIが応答しない → 少し待って再試行。続く場合はサポートへ

# 回答ルール
- 3文程度で簡潔に
- 手順は番号付きリストで
- 機能の範囲外・アカウント固有の問題は「サポート（takanazukaki6429@gmail.com）にお問い合わせください」と案内
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
