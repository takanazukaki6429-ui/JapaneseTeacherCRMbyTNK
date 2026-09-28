/**
 * コンサルタント別の契約の数（管理者専用API・2026-09-29）
 *
 * 招待コードの「渡した相手」ごとに、登録した先生の今の契約の状態を数える。
 * 管理画面「招待コード」で今の時点の数を見るために使う。毎月1日の自動の知らせは /api/cron/consultant-report
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/admin';
import { loadConsultantReport } from '@/lib/consultant-report';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    try {
        const report = await loadConsultantReport(createAdminClient());
        return NextResponse.json(report);
    } catch (e) {
        console.error('[consultant-report] load failed:', e instanceof Error ? e.message : e);
        return NextResponse.json({ error: 'コンサルタント別の数を取得できませんでした' }, { status: 500 });
    }
}
