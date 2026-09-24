/**
 * 先生が生徒に渡すロードマップのリンクを作る
 *
 * - 呼べるのはログイン中の先生だけ。自分の生徒（students.user_id が本人）のリンクしか作れない
 * - リンクの番号は shared_links の id（推測できない長い番号）。リンク先 /roadmap-view/[id] はログイン不要
 * - リンク先は開くたびに生徒の最新の記録から作り直すので、授業でレベルを更新すれば中身も変わる
 * - 同じ生徒・同じ言語で期限内のリンクがあれば、新しく作らずにそれを返す（先生が何度押しても同じリンク）
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { locales, type Locale } from '@/app/(main)/roadmap/i18n';
import { roadmapInputFromStudent } from '@/lib/roadmap/from-student';
import { hasPaidPlan, PAID_ONLY_MESSAGE } from '@/lib/plan-access-server';

export const dynamic = 'force-dynamic';

const VALID_DAYS = 180;

type StudentRow = { id: string; jlpt_level: string | null; current_phase: string | null; purposes: string | null };
type LinkRow = { id: string; expires_at: string; roadmap_data: { locale?: string } | null };

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
    }

    // 生徒に渡すリンクは有料の機能（2026-09-24 案A）
    if (!(await hasPaidPlan(supabase, user.id))) {
        return NextResponse.json({ error: PAID_ONLY_MESSAGE }, { status: 402 });
    }

    const body = await req.json().catch(() => null);
    const studentId = typeof body?.studentId === 'string' ? body.studentId : '';
    const locale: Locale = typeof body?.locale === 'string' && body.locale in locales ? body.locale : 'en';
    if (!studentId) {
        return NextResponse.json({ error: '生徒が指定されていません' }, { status: 400 });
    }

    const { data: studentData } = await supabase
        .from('students')
        .select('id, jlpt_level, current_phase, purposes')
        .eq('id', studentId)
        .eq('user_id', user.id)
        .maybeSingle();
    const student = studentData as unknown as StudentRow | null;
    if (!student) {
        return NextResponse.json({ error: '生徒が見つかりません' }, { status: 404 });
    }
    if (!roadmapInputFromStudent(student)) {
        return NextResponse.json({ error: 'この生徒のロードマップがまだ作成されていません（体験レッスンの画面で作成できます）' }, { status: 400 });
    }

    const { data: existingData } = await supabase
        .from('shared_links')
        .select('id, expires_at, roadmap_data')
        .eq('student_id', studentId)
        .eq('teacher_id', user.id)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20);
    const existing = (existingData as unknown as LinkRow[] | null) ?? [];
    const reuse = existing.find(l => l.roadmap_data?.locale === locale);

    let id = reuse?.id;
    let expiresAt = reuse?.expires_at;
    if (!id) {
        expiresAt = new Date(Date.now() + VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const { data: inserted, error } = await supabase
            .from('shared_links')
            .insert({ teacher_id: user.id, student_id: studentId, roadmap_data: { kind: 'roadmap', locale }, expires_at: expiresAt })
            .select('id')
            .single();
        if (error || !inserted) {
            console.error('[roadmap/share] insert failed', error);
            return NextResponse.json({ error: 'リンクを作れませんでした。時間をおいてもう一度お試しください' }, { status: 500 });
        }
        id = (inserted as { id: string }).id;
    }

    return NextResponse.json({ url: `${req.nextUrl.origin}/roadmap-view/${id}`, expiresAt });
}
