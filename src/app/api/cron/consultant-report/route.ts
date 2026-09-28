/**
 * 毎月1日 9:00（日本時間）に、コンサルタント別の契約の数を運営者へメールで送る（2026-09-29）
 *
 * 呼ぶのは Vercel の定時実行（vercel.json の crons・本番だけで動く）。
 * 憲法 §6(B)：数字の観測は機械の義務。かずきが手で数え続ける前提にしない。
 *
 * 外から呼ばれても害が出ないように：
 *   - CRON_SECRET が設定されていれば、Vercel が付ける合言葉（Authorization: Bearer ...）を確かめる
 *   - 設定が無くても、monthly_reports の表で「その月に1回だけ」送る（主キーの重複で2回目以降は何もしない）
 *     → 呼べるのは月1回・宛先は運営者だけ・返すのは送ったかどうかだけ
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyAdmin } from '@/lib/notify';
import { formatConsultantReportText, jstPeriod, loadConsultantReport } from '@/lib/consultant-report';

export const dynamic = 'force-dynamic';

const KIND = 'consultant';

export async function GET(req: NextRequest) {
    const secret = process.env.CRON_SECRET;
    if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const admin = createAdminClient();
    const { period, label } = jstPeriod(new Date());

    // その月の分を先に押さえる（同じ月の2回目以降はここで止まる）
    const { error: claimError } = await admin.from('monthly_reports').insert({ kind: KIND, period });
    if (claimError) {
        if (claimError.code === '23505' || /duplicate|unique/i.test(claimError.message)) {
            return NextResponse.json({ skipped: true, period });
        }
        console.error('[cron/consultant-report] claim failed:', claimError.message);
        return NextResponse.json({ error: 'claim failed' }, { status: 500 });
    }

    const release = () => admin.from('monthly_reports').delete().match({ kind: KIND, period });

    try {
        const report = await loadConsultantReport(admin);
        if (report.columnMissing) {
            await release();
            console.error('[cron/consultant-report] invite_codes.consultant の列がありません（SQL 未実行）');
            return NextResponse.json({ error: 'consultant column missing' }, { status: 500 });
        }

        const sent = await notifyAdmin({
            level: 'info',
            title: `コンサルタント別の契約（${period}）`,
            body: formatConsultantReportText(report, label),
        });
        if (!sent) {
            await release(); // 送れなかった月は押さえを外す（手で呼び直せば送れる）
            return NextResponse.json({ error: 'notify failed' }, { status: 500 });
        }
        return NextResponse.json({ sent: true, period });
    } catch (e) {
        await release();
        console.error('[cron/consultant-report] failed:', e instanceof Error ? e.message : e);
        return NextResponse.json({ error: 'failed' }, { status: 500 });
    }
}
