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
 *
 * 2026-10-06〜10-08（かずき決定）：
 *   - 種類（一般・受講生・卒業生。lib/audience.ts）。受講生はコース（3か月・6か月）を選ぶ。
 *     無料の期間は ASTA に登録した日から数える（3か月コース＝2か月・6か月コース＝5か月・lib/course.ts）ので、発行の時に日付は入れない
 *   - 守り（lib/invite-code.ts）：使える期限・まとめて出す・メールアドレスに紐づける・取り消し・
 *     登録済みの受講生の終わる日を直す時の打ち間違いを止める
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/admin';
import { logAudit } from '@/lib/audit';
import { randomInt } from 'crypto';
import { isMissingConsultantColumn, normalizeConsultant } from '@/lib/consultant-report';
import { COURSE_FREE_MONTHS, normalizeCourseEndDate, normalizeCourseMonths, type CourseMonths } from '@/lib/course';
import { normalizeAudience, type Audience } from '@/lib/audience';
import { INVITE_BATCH_MAX, normalizeValidDays, parseEmailList, validateCourseEndDate } from '@/lib/invite-code';

export const dynamic = 'force-dynamic';

const GUARD_SQL_FILE = 'sql_2026-10-07_受講生と一般の区分と課金の列を守る.sql';
const GUARD_MISSING_MESSAGE =
    `保管庫に「種類・コース・期限・取り消し」の列がまだありません。${GUARD_SQL_FILE} を Supabase Studio で流してください`;
const MISSING_COLUMN_MESSAGE =
    '保管庫に「渡した相手」の列がまだありません。sql_2026-09-29_招待コードに渡した相手.sql を Supabase Studio で流してください';

/** SQL（10/7）で足す列が無い時のエラーか */
const isMissingGuardColumn = (error: { message?: string } | null | undefined) => {
    const m = error?.message ?? '';
    return /(course_|audience|revoked_at|\bemail\b)/i.test(m) && /column|schema cache/i.test(m);
};

const LIST_COLUMNS = [
    { columns: 'id, code, used_at, used_by, created_at, expires_at, revoked_at, email, audience, consultant, course_months, course_end_date', consultantColumn: true, guardColumns: true },
    { columns: 'id, code, used_at, used_by, created_at, expires_at, consultant', consultantColumn: true, guardColumns: false },
    { columns: 'id, code, used_at, created_at', consultantColumn: false, guardColumns: false },
] as const;

const RETURN_COLUMNS = 'id, code, used_at, used_by, created_at, expires_at, revoked_at, email, audience, consultant, course_months, course_end_date';

/** コース（3か月・6か月）を読む。空なら null（コースなし）。おかしければ error */
function parseCourseMonths(raw: unknown): { ok: true; months: CourseMonths | null } | { ok: false; error: string } {
    if (raw === undefined || raw === null || raw === '') return { ok: true, months: null };
    const months = normalizeCourseMonths(raw);
    return months ? { ok: true, months } : { ok: false, error: 'コースは 3か月 か 6か月 を選んでください' };
}

/** 登録済みの受講生の、無料の期間が終わる日を読む（打ち間違いを止める）。おかしければ error */
function parseFreeEndDate(
    months: CourseMonths,
    raw: unknown,
    options: { allowExtension?: boolean } = {},
): { ok: true; endDate: string } | { ok: false; error: string } {
    const endDate = normalizeCourseEndDate(raw);
    if (!endDate) return { ok: false, error: '登録済みの受講生は、無料の期間が終わる日も入れてください' };
    const invalid = validateCourseEndDate(months, endDate, new Date(), options);
    return invalid ? { ok: false, error: invalid } : { ok: true, endDate };
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
            return NextResponse.json({
                codes: data ?? [],
                consultantColumn: set.consultantColumn,
                // 画面は、この印で「種類・コース・期限・取り消し」の入力を出すかを決める
                courseColumn: set.guardColumns,
                guardColumns: set.guardColumns,
            });
        }
        lastError = error;
        if (!isMissingConsultantColumn(error) && !isMissingGuardColumn(error) && !/column|schema cache/i.test(error.message ?? '')) break;
    }

    console.error('invite_codes list failed:', lastError);
    return NextResponse.json({ error: '招待コードの取得に失敗しました' }, { status: 500 });
}

/**
 * 発行。本文：{ audience, consultant?, course_months?, course_end_date?, valid_days?, count?, emails? }
 *   - audience：general（一般・既定）／course（受講生）／alumni（卒業生）
 *   - emails：1行に1人。入れた時は、メールアドレスの数だけ出し、それぞれのアドレスでしか使えないコードにする
 *   - count：メールアドレスを入れない時に、まとめて出す数（1〜INVITE_BATCH_MAX）
 */
export async function POST(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const consultant = normalizeConsultant(body.consultant);
    const audience: Audience | null = body.audience === undefined || body.audience === '' ? 'general' : normalizeAudience(body.audience);
    if (!audience) {
        return NextResponse.json({ error: '種類は「一般」「受講生」「卒業生」から選んでください' }, { status: 400 });
    }
    const parsedMonths = parseCourseMonths(body.course_months);
    if (!parsedMonths.ok) {
        return NextResponse.json({ error: parsedMonths.error }, { status: 400 });
    }
    const courseMonths = parsedMonths.months;
    if (audience === 'course' && !courseMonths) {
        return NextResponse.json({ error: '受講生のコードは、コース（3か月・6か月）を選んでください' }, { status: 400 });
    }
    if (audience !== 'course' && courseMonths) {
        return NextResponse.json({ error: 'コースを選べるのは、受講生のコードだけです' }, { status: 400 });
    }

    const { emails, invalid } = parseEmailList(body.emails);
    if (invalid.length > 0) {
        return NextResponse.json({ error: `メールアドレスの形が正しくありません：${invalid.join('、')}` }, { status: 400 });
    }
    const rawCount = Number(body.count ?? 1);
    const count = emails.length > 0 ? emails.length : rawCount;
    if (!Number.isInteger(count) || count < 1 || count > INVITE_BATCH_MAX) {
        return NextResponse.json({ error: `まとめて出せるのは1〜${INVITE_BATCH_MAX}件です` }, { status: 400 });
    }
    const validDays = normalizeValidDays(body.valid_days);
    const expiresAt = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString();

    const admin = createAdminClient();
    const base: Record<string, unknown> = { created_by: user.id, audience, expires_at: expiresAt };
    if (consultant) base.consultant = consultant;
    // 無料の期間が終わる日は、受講生が登録した時に決まる（api/auth/signup）。コードには入れない
    if (courseMonths) base.course_months = courseMonths;

    const created: Record<string, unknown>[] = [];
    for (let i = 0; i < count; i++) {
        const row = { ...base, ...(emails[i] ? { email: emails[i] } : {}) };
        // code列はUNIQUEのため、万一の衝突は再生成でリトライ
        let done = false;
        let lastError: { message?: string } | null = null;
        for (let attempt = 0; attempt < 3 && !done; attempt++) {
            const { data, error } = await admin
                .from('invite_codes')
                .insert({ ...row, code: generateCodeString() })
                .select(RETURN_COLUMNS)
                .single();
            if (!error && data) {
                created.push(data as unknown as Record<string, unknown>);
                done = true;
                break;
            }
            lastError = error;
            if (isMissingGuardColumn(error)) {
                return NextResponse.json({ error: GUARD_MISSING_MESSAGE, codes: created }, { status: 409 });
            }
            if (isMissingConsultantColumn(error)) {
                return NextResponse.json({ error: MISSING_COLUMN_MESSAGE, codes: created }, { status: 409 });
            }
            if (!/duplicate|unique/i.test(error?.message ?? '')) break;
        }
        if (!done) {
            console.error('invite_codes create failed:', lastError);
            return NextResponse.json({ error: `コードの発行に失敗しました（${created.length}件は発行済み）`, codes: created }, { status: 500 });
        }
    }

    await logAudit({
        action: 'invite_code.create',
        actorUserId: user.id,
        actorEmail: user.email,
        resourceType: 'invite_code',
        resourceId: String(created[0]?.id ?? ''),
        outcome: 'success',
        metadata: {
            count: created.length,
            audience,
            valid_days: validDays,
            email_bound: emails.length > 0,
            ...(consultant ? { consultant } : {}),
            ...(courseMonths ? { course_months: courseMonths, free_months: COURSE_FREE_MONTHS[courseMonths] } : {}),
        },
        req,
    });

    return NextResponse.json({ codes: created, code: created[0] });
}

/**
 * 発行済みのコードを直す。本文の中身で、することが決まる：
 *   - { id, consultant }：渡した相手を記録・直す（空にすると記録を消す）
 *   - { id, course_months }：使っていないコードのコースを直す（無料の期間は、登録した日から数える）
 *   - { id, course_months, course_end_date, allow_extension? }：登録済みのコードのコースと、無料の期間が終わる日を直す。
 *     先生の設定も同じに直し、区分を「受講生」にする（今の本番で先に登録した受講生に、後から入れる時にも使う）。
 *     終わる日の打ち間違いを止める（無料の月数＋1か月以内）。延長する時は allow_extension
 *   - { id, action: 'revoke' }：使っていないコードを取り消す（2026-10-07）
 */
export async function PATCH(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const id = typeof body?.id === 'string' ? body.id : null;
    if (!id) {
        return NextResponse.json({ error: 'コードの指定がありません' }, { status: 400 });
    }
    const admin = createAdminClient();

    // 取り消し：使っていない・まだ取り消していないコードだけ
    if (body?.action === 'revoke') {
        const { data, error } = await admin
            .from('invite_codes')
            .update({ revoked_at: new Date().toISOString() })
            .eq('id', id)
            .is('used_at', null)
            .is('revoked_at', null)
            .select(RETURN_COLUMNS)
            .maybeSingle();
        if (error) {
            if (isMissingGuardColumn(error)) return NextResponse.json({ error: GUARD_MISSING_MESSAGE }, { status: 409 });
            console.error('invite_codes revoke failed:', error);
            return NextResponse.json({ error: '取り消しに失敗しました' }, { status: 500 });
        }
        if (!data) {
            return NextResponse.json({ error: '使用済み・取り消し済みのコードは取り消せません' }, { status: 409 });
        }
        await logAudit({
            action: 'admin.access',
            actorUserId: user.id,
            actorEmail: user.email,
            resourceType: 'invite_code',
            resourceId: id,
            outcome: 'success',
            metadata: { op: 'invite_code.revoke' },
            req,
        });
        return NextResponse.json({ code: data });
    }

    const touchConsultant = !!body && 'consultant' in body;
    const touchCourse = !!body && ('course_months' in body || 'course_end_date' in body);
    if (!touchConsultant && !touchCourse) {
        return NextResponse.json({ error: '直す中身がありません' }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    const consultant = normalizeConsultant(body?.consultant);
    if (touchConsultant) update.consultant = consultant;
    let course: { months: CourseMonths; endDate: string | null } | null = null;
    if (touchCourse) {
        const parsedMonths = parseCourseMonths(body?.course_months);
        if (!parsedMonths.ok) {
            return NextResponse.json({ error: parsedMonths.error }, { status: 400 });
        }
        // 登録済みかどうかで、入れる物が変わる（登録済みなら、無料の期間が終わる日も要る）
        const { data: current, error: readError } = await admin.from('invite_codes').select('id, used_by').eq('id', id).maybeSingle();
        if (readError) {
            console.error('invite_codes read failed:', readError);
            return NextResponse.json({ error: '記録に失敗しました' }, { status: 500 });
        }
        if (!current) {
            return NextResponse.json({ error: 'コードが見つかりません' }, { status: 404 });
        }
        const registered = !!(current as { used_by?: string | null }).used_by;
        if (parsedMonths.months) {
            if (registered) {
                const parsedEnd = parseFreeEndDate(parsedMonths.months, body?.course_end_date, { allowExtension: body?.allow_extension === true });
                if (!parsedEnd.ok) {
                    return NextResponse.json({ error: parsedEnd.error }, { status: 400 });
                }
                course = { months: parsedMonths.months, endDate: parsedEnd.endDate };
            } else {
                course = { months: parsedMonths.months, endDate: null };
            }
        }
        update.course_months = course?.months ?? null;
        update.course_end_date = course?.endDate ?? null;
        if (course) update.audience = 'course';
    }

    const { data, error } = await admin
        .from('invite_codes')
        .update(update)
        .eq('id', id)
        .select(touchCourse ? RETURN_COLUMNS : 'id, code, used_at, used_by, created_at, consultant')
        .maybeSingle();

    if (error) {
        if (isMissingConsultantColumn(error)) {
            return NextResponse.json({ error: MISSING_COLUMN_MESSAGE }, { status: 409 });
        }
        if (isMissingGuardColumn(error)) {
            return NextResponse.json({ error: GUARD_MISSING_MESSAGE }, { status: 409 });
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
    if (touchCourse && usedBy) {
        const teacherUpdate: Record<string, unknown> = { course_months: course?.months ?? null, course_end_date: course?.endDate ?? null };
        if (course) teacherUpdate.audience = 'course';
        const { error: teacherError } = await admin
            .from('user_settings')
            .update(teacherUpdate)
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
            ...(touchCourse ? { course_months: course?.months ?? null, course_end_date: course?.endDate ?? null, allow_extension: body?.allow_extension === true, teacher_updated: teacherUpdated } : {}),
        },
        req,
    });

    return NextResponse.json({ code: data, teacherUpdated });
}
