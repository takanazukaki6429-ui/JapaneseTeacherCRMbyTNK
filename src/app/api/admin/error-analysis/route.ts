/**
 * v1.0 工程表 4.2: Claude API でエラーログ自動解析
 *
 * 監査ログの failure イベントを Gemini に渡し、日本語で
 *   - 何が起きたか
 *   - 推定原因
 *   - 対処法
 * を要約させる。管理者ダッシュボードから呼ばれる。
 *
 * （要件定義書では Claude API 指定だが、既存スタックが Gemini のため Gemini で実装。
 *   将来 Claude に差し替える場合は withFallback で多重化する）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isAdminEmail } from '@/lib/admin';
import { withRetry } from '@/lib/retry';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    // 直近の failure ログを取得（最大50件）
    const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('action, outcome, metadata, created_at, actor_email')
        .eq('outcome', 'failure')
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!logs || logs.length === 0) {
        return NextResponse.json({
            summary: '直近のエラーログはありません。システムは正常に稼働しています。',
            logCount: 0,
        });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `あなたはSaaSの運用エンジニアです。以下はASTA（日本語教師向けCRM）の直近のエラーログ（${logs.length}件）です。
これを分析し、日本語で以下を簡潔にまとめてください：

1. **エラーの傾向**: どんなエラーが多いか（種類別の件数）
2. **推定される原因**: 最も可能性の高い原因
3. **推奨対処**: 今すぐ取るべきアクション（優先度順に最大3つ）

エラーログ（JSON）:
${JSON.stringify(logs, null, 2)}

Markdown形式で、見出しと箇条書きを使って読みやすくまとめてください。`;

    try {
        const result = await withRetry(
            () => model.generateContent(prompt),
            { label: 'error-analysis', maxRetries: 2 }
        );
        const summary = result.response.text();
        return NextResponse.json({ summary, logCount: logs.length });
    } catch (e) {
        return NextResponse.json(
            { error: 'AI解析に失敗しました', detail: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
