/**
 * 招待コードの一覧・発行・渡した相手の記録（管理者専用API）
 *
 * これまで画面側がデータ口を直接叩いていた（RLSで全教師に開放）のを、
 * サーバ側の管理者チェック＋管理者権限接続に寄せる。
 * データ層の匿名・一般ポリシーは廃止済みのため、この経路が唯一の操作口。
 *
 * 2026-09-29：コードごとに「渡した相手（consultant＝コンサルタントの呼び名）」を記録する。
 * 紹介の取り分を数えるため（lib/consultant-report.ts）。保管庫に列が無い間（SQL を流す前）も
 * 一覧と相手なしの発行は動くようにし、相手を記録しようとしたときだけ分かる言葉で止める。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/admin';
import { logAudit } from '@/lib/audit';
import { randomInt } from 'crypto';
import { isMissingConsultantColumn, normalizeConsultant } from '@/lib/consultant-report';
import { isMissingCourseColumn, normalizeCourseEndDate, normalizeCourseMonths } from '@/lib/course';

export const dynamic = 'force-dynamic';

/**
 * 2026-10-06：コンサルの受講生に渡すコードには「コース（3か月・6か月）」と「コースが終わる日」を入れる（lib/course.ts）。
 * 受講生はその日まで無料。列がまだ無い保管庫（SQL を流す前）でも、一覧とコースなしの発行は動く
 */
const COURSE_MISSING_MESSAGE =
    '保管庫に「コース」の列がまだありません。sql_2026-10-06_受講中の無料と課金の列を守る.sql を Supabase Studio で流してください';

const LIST_COLUMNS = [
    { columns: 'id, code, used_at, used_by, created_at, consultant, course_months, course_end_date', consultantColumn: true, courseColumn: true },
    { columns: 'id, code, used_at, created_at, consultant', consultantColumn: true, courseColumn: false },
    { columns: 'id, code, used_at, created_at', consultantColumn: false, courseColumn: false },
] as const;

/** コースの入力を確かめる。コースを選んだら終わる日も要る（片方だけは受け付けない） */
function parseCourse(body: { course_months?: unknown; course_end_date?: unknown } | null): { ok: true; months: number | null; endDate: string | null } | { ok: false; error: string } {
    const rawMonths = body?.course_months;
    const rawEnd = body?.course_end_date;
    const months = normalizeCourseMonths(rawMonths);
    const endDate = normalizeCourseEndDate(rawEnd);
    const monthsGiven = rawMonths !== undefined && rawMonths !== null && rawMonths !== '';
    const endGiven = rawEnd !== undefined && rawEnd !== null && rawEnd !== '';
    if (!monthsGiven && !endGiven) return { ok: true, months: null, endDate: null };
    if (monthsGiven && !months) return { ok: false, error: 'コースは 3か月 か 6か月 を選んでください' };
    if (endGiven && !endDate) return { ok: false, error: 'コースが終わる日の書き方が正しくありません' };
    if (!months || !endDate) return { ok: false, error: 'コースを選んだら、コースが終わる日も入れてください（両方そろえる）' };
    return { ok: true, months, endDate };
}

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
        return null;
    }
    return user;
}

// 紛らわしい文字（I, 1, O, 0）を除いた8文字コード: A8F3-K9P2 形式
function generateCodeString(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codeStr = '';
    for (let i = 0; i < 8; i++) {
        if (i === 4) codeStr += '-';
        codeStr += chars.charAt(randomInt(chars.length));
    }
    return codeStr;
}

export async function GET() {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const admin = createAdminClient();
    // 列が無い保管庫（SQL を流す前）でも一覧は出す：列を減らして読み直す
    let lastError: { message?: string } | null = null;
    for (const set of LIST_COLUMNS) {
        const { data, error } = await admin
            .from('invite_codes')
            .select(set.columns)
            .order('created_at', { ascending: false });
        if (!error) {
            return NextResponse.json({ codes: data ?? [], consultantColumn: set.consultantColumn, courseColumn: set.courseColumn });
        }
        lastError = error;
        if (!isMissingConsultantColumn(error) && !isMissingCourseColumn(error) && !/used_by/i.test(error.message ?? '')) break;
    }

    console.error('invite_codes list failed:', lastError);
    return NextResponse.json({ error: '招待コードの取得に失敗しました' }, { status: 500 });
}

const MISSING_COLUMN_MESSAGE =
    '保管庫に「渡した相手」の列がまだありません。sql_2026-09-29_招待コードに渡した相手.sql を Supabase Studio で流してください';

export async function POST(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const consultant = normalizeConsultant((body as { consultant?: unknown }).consultant);
    const course = parseCourse(body as { course_months?: unknown; course_end_date?: unknown });
    if (!course.ok) {
        return NextResponse.json({ error: course.error }, { status: 400 });
    }

    const admin = createAdminClient();

    const row: Record<string, unknown> = { created_by: user.id };
    if (consultant) row.consultant = consultant;
    if (course.endDate) {
        row.course_months = course.months;
        row.course_end_date = course.endDate;
    }
    const selectColumns = [
        'id, code, used_at, created_at',
        consultant ? 'consultant' : null,
        course.endDate ? 'course_months, course_end_date' : null,
    ].filter(Boolean).join(', ');

    // code列はUNIQUEのため、万一の衝突は再生成でリトライ
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        const codeStr = generateCodeString();
        const { data, error } = await admin
            .from('invite_codes')
            .insert({ ...row, code: codeStr })
            .select(selectColumns)
            .single();

        if (!error && data) {
            const created = data as unknown as { id: string };
            await logAudit({
                action: 'invite_code.create',
                actorUserId: user.id,
                actorEmail: user.email,
                resourceType: 'invite_code',
                resourceId: created.id,
                outcome: 'success',
                metadata: {
                    ...(consultant ? { consultant } : {}),
                    ...(course.endDate ? { course_months: course.months, course_end_date: course.endDate } : {}),
                },
                req,
            });
            return NextResponse.json({ code: data });
        }

        if (isMissingConsultantColumn(error)) {
            return NextResponse.json({ error: MISSING_COLUMN_MESSAGE }, { status: 409 });
        }
        if (isMissingCourseColumn(error)) {
            return NextResponse.json({ error: COURSE_MISSING_MESSAGE }, { status: 409 });
        }
        lastError = error?.message ?? 'unknown';
        if (!/duplicate|unique/i.test(lastError)) break;
    }

    console.error('invite_codes create failed:', lastError);
    return NextResponse.json({ error: 'コードの発行に失敗しました' }, { status: 500 });
}

/**
 * 発行済みのコードの「渡した相手」と「コース」を記録・直す（空にすると記録を消す）。
 * 本文に consultant があれば渡した相手を、course_months / course_end_date があればコースを直す（2026-10-06）。
 * コースを直した時、そのコードで登録済みの先生がいれば、先生の設定のコースが終わる日も同じに直す
 * （今の本番で先に登録した受講生に、後から終わる日を入れる時にも使う）
 */
export async function PATCH(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as { id?: unknown; consultant?: unknown; course_months?: unknown; course_end_date?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id : null;
    if (!id) {
        return NextResponse.json({ error: 'コードの指定がありません' }, { status: 400 });
    }
    const touchConsultant = !!body && 'consultant' in body;
    const touchCourse = !!body && ('course_months' in body || 'course_end_date' in body);
    if (!touchConsultant && !touchCourse) {
        return NextResponse.json({ error: '直す中身がありません' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    const consultant = normalizeConsultant(body?.consultant);
    if (touchConsultant) update.consultant = consultant;
    let course: { months: number | null; endDate: string | null } | null = null;
    if (touchCourse) {
        const parsed = parseCourse(body);
        if (!parsed.ok) {
            return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        course = { months: parsed.months, endDate: parsed.endDate };
        update.course_months = parsed.months;
        update.course_end_date = parsed.endDate;
    }

    const admin = createAdminClient();
    const selectColumns = [
        'id, code, used_at, used_by, created_at',
        touchConsultant ? 'consultant' : null,
        touchCourse ? 'course_months, course_end_date' : null,
    ].filter(Boolean).join(', ');
    const { data, error } = await admin
        .from('invite_codes')
        .update(update)
        .eq('id', id)
        .select(selectColumns)
        .maybeSingle();

    if (error) {
        if (isMissingConsultantColumn(error)) {
            return NextResponse.json({ error: MISSING_COLUMN_MESSAGE }, { status: 409 });
        }
        if (isMissingCourseColumn(error)) {
            return NextResponse.json({ error: COURSE_MISSING_MESSAGE }, { status: 409 });
        }
        console.error('invite_codes update failed:', error);
        return NextResponse.json({ error: '記録に失敗しました' }, { status: 500 });
    }
    if (!data) {
        return NextResponse.json({ error: 'コードが見つかりません' }, { status: 404 });
    }

    // そのコードで登録済みの先生がいれば、先生の設定のコースも同じに直す
    const usedBy = (data as unknown as { used_by?: string | null }).used_by ?? null;
    let teacherUpdated = false;
    if (course && usedBy) {
        const { error: teacherError } = await admin
            .from('user_settings')
            .update({ course_months: course.months, course_end_date: course.endDate })
            .eq('user_id', usedBy);
        if (teacherError) {
            console.error('user_settings course update failed:', teacherError);
            return NextResponse.json({ error: `コードは直しましたが、先生の設定を直せませんでした（${teacherError.message}）` }, { status: 500 });
        }
        teacherUpdated = true;
    }

    // 監査ログの操作種別は保管庫の側で決まった値しか入らないため、管理者の操作として残し、中身は metadata に書く
    await logAudit({
        action: 'admin.access',
        actorUserId: user.id,
        actorEmail: user.email,
        resourceType: 'invite_code',
        resourceId: id,
        outcome: 'success',
        metadata: {
            op: touchCourse ? 'invite_code.set_course' : 'invite_code.set_consultant',
            ...(touchConsultant ? { consultant } : {}),
            ...(course ? { course_months: course.months, course_end_date: course.endDate, teacher_updated: teacherUpdated } : {}),
        },
        req,
    });

    return NextResponse.json({ code: data, teacherUpdated });
}
