/**
 * v1.0 工程表 4.6: ヘルスチェック
 *
 * 各依存サービス（Supabase / Gemini / 環境変数）の死活を確認する。
 * ステータスページ（/status）と外部監視（UptimeRobot等）から叩く。
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type CheckResult = {
    name: string;
    status: 'ok' | 'degraded' | 'down';
    latencyMs?: number;
    detail?: string;
};

async function checkSupabase(): Promise<CheckResult> {
    const start = Date.now();
    try {
        const supabase = await createClient();
        // 軽量クエリ（RLSで0件でもOK・接続確認が目的）
        const { error } = await supabase.from('user_settings').select('user_id').limit(1);
        const latencyMs = Date.now() - start;
        if (error && !/permission|RLS|JWT/i.test(error.message)) {
            return { name: 'supabase', status: 'down', latencyMs, detail: error.message };
        }
        return { name: 'supabase', status: latencyMs > 2000 ? 'degraded' : 'ok', latencyMs };
    } catch (e) {
        return { name: 'supabase', status: 'down', detail: e instanceof Error ? e.message : String(e) };
    }
}

function checkEnvVars(): CheckResult {
    const required = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'GEMINI_API_KEY',
    ];
    const missing = required.filter(k => !process.env[k]);
    if (missing.length > 0) {
        return { name: 'env', status: 'down', detail: `missing: ${missing.join(', ')}` };
    }
    // オプショナル（あれば良い）
    const optional = ['SENTRY_DSN', 'OPENAI_API_KEY', 'GOOGLE_APPLICATION_CREDENTIALS_JSON'];
    const missingOpt = optional.filter(k => !process.env[k]);
    return {
        name: 'env',
        status: missingOpt.length > 0 ? 'degraded' : 'ok',
        detail: missingOpt.length > 0 ? `optional missing: ${missingOpt.join(', ')}` : undefined,
    };
}

export async function GET() {
    const [supabase, env] = await Promise.all([
        checkSupabase(),
        Promise.resolve(checkEnvVars()),
    ]);

    const checks = [supabase, env];
    const hasDown = checks.some(c => c.status === 'down');
    const hasDegraded = checks.some(c => c.status === 'degraded');
    const overall = hasDown ? 'down' : hasDegraded ? 'degraded' : 'ok';

    return NextResponse.json(
        {
            status: overall,
            timestamp: new Date().toISOString(),
            checks,
        },
        { status: overall === 'down' ? 503 : 200 }
    );
}
