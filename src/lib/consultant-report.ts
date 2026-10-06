/**
 * コンサルタント別の契約の数（2026-09-29・紹介の取り分を決めるための記録）
 *
 * 招待コードに「渡した相手（invite_codes.consultant）」を記録し、そのコードで登録した先生の
 * 今の契約の状態を、コンサルタントごとに数える。
 * 取り分のルール（何%・いつまで）は未決（HANDOFF「最優先の論点」）。ここは数えるだけ。
 *
 * 数え方：
 *   - 有料＝subscription_status が active（お試し中 trialing は含めない）
 *   - コンサルの受講中（コースが終わる日まで無料・2026-10-06）は「受講中」として別に数える。紹介の取り分なし
 *   - 無料の印（is_free）の先生で契約していない人は「無料の先生」として別に数える
 *   - 金額＝有料の先生の段の月額（税込）の合計。実際の入金額ではない（手数料・日割り・返金は入らない）
 *
 * 受講生の ASTA 代（2026-10-04 MTG・10/6 かずき決定）：受講生1人ごとに、受講開始時にまとめてコンサルタントから受け取る
 *   （3か月コース＝1万円・6か月コース＝2.5万円・lib/course.ts）。ここでは「その月に、コースつきのコードで登録した受講生」を
 *   コンサルタントごとに並べ、請求の目安にする（登録した月で数える）
 *
 * 'server-only' の管理者権限接続はここで import しない（テストから純粋な集計だけ呼べるように）。
 * 読み込み（loadConsultantReport）は呼び出し側が渡した接続を使う。
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_TIERS, PLAN_TIER_KEYS, isPlanTier, type PlanTier } from '@/lib/pricing';
import { COURSE_FEE_JPY, formatJpDate, isInCourse, isMissingCourseColumn, normalizeCourseEndDate, normalizeCourseMonths, type CourseMonths } from '@/lib/course';

/** 渡した相手を記録し始めた日（これより後に、相手が空のコードで登録した先生は「入れ忘れ」の可能性として数える） */
export const ATTRIBUTION_START_ISO = '2026-10-01T00:00:00+09:00';

/** 渡した相手の呼び名の長さの上限 */
export const CONSULTANT_MAX_LENGTH = 40;

/** 呼び名をそろえる（前後の空白を落とし、長すぎれば切る）。空なら null＝記録しない */
export function normalizeConsultant(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const s = raw.trim().replace(/\s+/g, ' ');
    if (!s) return null;
    return s.slice(0, CONSULTANT_MAX_LENGTH);
}

/** 保管庫に consultant の列がまだ無いときのエラーか（SQL を流す前でも画面が落ちないように見分ける） */
export function isMissingConsultantColumn(error: { message?: string } | null | undefined): boolean {
    const m = error?.message ?? '';
    return /consultant/i.test(m) && /column|schema cache/i.test(m);
}

export type UsedCodeRow = {
    consultant: string | null;
    used_by: string | null;
    used_at: string | null;
    /** コンサルの受講生に渡したコード（2026-10-06）。列が無い保管庫では来ない */
    course_months?: number | null;
    course_end_date?: string | null;
};

export type TeacherSettingsRow = {
    user_id: string;
    display_name?: string | null;
    is_free?: boolean | null;
    subscription_status?: string | null;
    plan_tier?: string | null;
    course_end_date?: string | null;
};

export type ReferredTeacher = {
    userId: string;
    name: string | null;
    bucket: 'paid' | 'course' | 'trialing' | 'past_due' | 'canceled' | 'free' | 'none';
    tier: PlanTier;
    registeredAt: string | null;
};

export type ConsultantSummary = {
    consultant: string;
    /** そのコンサルタントに渡したコードで登録した先生 */
    registered: number;
    paid: Record<PlanTier, number>;
    paidTotal: number;
    /** コンサルの受講中（コースが終わる日まで無料・紹介の取り分なし） */
    course: number;
    trialing: number;
    pastDue: number;
    canceled: number;
    /** 無料の印あり・契約なし */
    free: number;
    /** 未契約（無料の印なし） */
    none: number;
    /** 有料の先生の月額（税込）の合計。有料の先生がいる段の金額が未設定なら null */
    monthlyYen: number | null;
    teachers: ReferredTeacher[];
};

/** 受講生の ASTA 代の1行（その月に、コースつきのコードで登録した受講生1人） */
export type CourseInvoiceLine = {
    /** 渡した相手（空のコードは NO_CONSULTANT_LABEL） */
    consultant: string;
    name: string | null;
    months: CourseMonths;
    endDate: string | null;
    registeredAt: string;
    feeYen: number;
};

export type CourseInvoice = {
    /** 'YYYY-MM'（日本時間） */
    period: string;
    lines: CourseInvoiceLine[];
    byConsultant: { consultant: string; count: number; totalYen: number }[];
    totalYen: number;
};

export type ConsultantReport = {
    summaries: ConsultantSummary[];
    /** 記録を始めた日より後に、渡した相手が空のコードで登録した先生の数（入れ忘れの可能性） */
    unattributedSinceStart: number;
    /** 受講生の ASTA 代（previous＝先月・請求の目安／current＝今月のここまで） */
    courseInvoices: { previous: CourseInvoice; current: CourseInvoice };
};

/** コースつきのコードに渡した相手が入っていない時の表示 */
export const NO_CONSULTANT_LABEL = '（渡した相手なし）';

type Prices = Record<PlanTier, number | null>;
const DEFAULT_PRICES: Prices = {
    light: PLAN_TIERS.light.priceJpy,
    regular: PLAN_TIERS.regular.priceJpy,
    pro: PLAN_TIERS.pro.priceJpy,
};

function bucketOf(s: TeacherSettingsRow | undefined, now: Date): ReferredTeacher['bucket'] {
    const status = s?.subscription_status ?? 'inactive';
    if (status === 'active') return 'paid';
    // 受講中は、先回りして申し込んで Stripe でお試し中になっている人も「受講中」（コースが終わるまで料金はかからない）
    if (isInCourse(s?.course_end_date, now)) return 'course';
    if (status === 'trialing') return 'trialing';
    if (status === 'past_due' || status === 'unpaid') return 'past_due';
    if (status === 'canceled' || status === 'incomplete_expired') return 'canceled';
    return s?.is_free ? 'free' : 'none';
}

/** 日本時間で、その時刻が何日か（'YYYY-MM-DD'）。読めなければ null */
export function jstDateOf(iso: string | null | undefined): string | null {
    const t = Date.parse(iso ?? '');
    if (Number.isNaN(t)) return null;
    return new Date(t + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 日本時間で、その時刻がどの月か（'YYYY-MM'）。読めなければ null */
export function jstMonthOf(iso: string | null | undefined): string | null {
    return jstDateOf(iso)?.slice(0, 7) ?? null;
}

/** 日本時間で、now の前の月（'YYYY-MM'） */
export function previousJstPeriod(now: Date): string {
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return new Date(Date.UTC(jst.getUTCFullYear(), jst.getUTCMonth() - 1, 1)).toISOString().slice(0, 7);
}

/** 'YYYY-MM' を「2026年10月」の形にする */
export function periodLabel(period: string): string {
    const [y, m] = period.split('-').map(Number);
    return `${y}年${m}月`;
}

/** その月（日本時間）に、コースつきのコードで登録した受講生の ASTA 代を、渡した相手ごとにまとめる（純粋な集計・テスト対象） */
export function buildCourseInvoice(codes: UsedCodeRow[], settings: TeacherSettingsRow[], period: string): CourseInvoice {
    const nameById = new Map(settings.map(s => [s.user_id, s.display_name ?? null]));
    const lines: CourseInvoiceLine[] = [];
    for (const code of codes) {
        if (!code.used_by || !code.used_at) continue;
        const months = normalizeCourseMonths(code.course_months ?? null);
        if (!months || jstMonthOf(code.used_at) !== period) continue;
        lines.push({
            consultant: normalizeConsultant(code.consultant) ?? NO_CONSULTANT_LABEL,
            name: nameById.get(code.used_by) ?? null,
            months,
            endDate: normalizeCourseEndDate(code.course_end_date ?? null),
            registeredAt: code.used_at,
            feeYen: COURSE_FEE_JPY[months],
        });
    }
    // 相手ごと（渡した相手なしは最後）・登録した順
    const last = (c: string) => (c === NO_CONSULTANT_LABEL ? 1 : 0);
    lines.sort((a, b) =>
        last(a.consultant) - last(b.consultant) ||
        a.consultant.localeCompare(b.consultant, 'ja') ||
        Date.parse(a.registeredAt) - Date.parse(b.registeredAt));

    const groups = new Map<string, { consultant: string; count: number; totalYen: number }>();
    for (const line of lines) {
        const g = groups.get(line.consultant) ?? { consultant: line.consultant, count: 0, totalYen: 0 };
        g.count++;
        g.totalYen += line.feeYen;
        groups.set(line.consultant, g);
    }
    return {
        period,
        lines,
        byConsultant: [...groups.values()],
        totalYen: lines.reduce((sum, l) => sum + l.feeYen, 0),
    };
}

/** 使われたコードと先生の設定から、コンサルタントごとに数える（純粋な集計・テスト対象） */
export function buildConsultantReport(
    codes: UsedCodeRow[],
    settings: TeacherSettingsRow[],
    prices: Prices = DEFAULT_PRICES,
    now: Date = new Date(),
): ConsultantReport {
    const settingsById = new Map(settings.map(s => [s.user_id, s]));
    const byConsultant = new Map<string, ConsultantSummary>();
    const startMs = Date.parse(ATTRIBUTION_START_ISO);
    let unattributedSinceStart = 0;

    for (const code of codes) {
        if (!code.used_by) continue;
        const consultant = normalizeConsultant(code.consultant);
        if (!consultant) {
            if (code.used_at && Date.parse(code.used_at) >= startMs) unattributedSinceStart++;
            continue;
        }

        let summary = byConsultant.get(consultant);
        if (!summary) {
            summary = {
                consultant,
                registered: 0,
                paid: { light: 0, regular: 0, pro: 0 },
                paidTotal: 0,
                course: 0,
                trialing: 0,
                pastDue: 0,
                canceled: 0,
                free: 0,
                none: 0,
                monthlyYen: 0,
                teachers: [],
            };
            byConsultant.set(consultant, summary);
        }

        const s = settingsById.get(code.used_by);
        const tier: PlanTier = isPlanTier(s?.plan_tier) ? s!.plan_tier as PlanTier : 'light';
        const bucket = bucketOf(s, now);
        summary.registered++;
        if (bucket === 'paid') {
            summary.paid[tier]++;
            summary.paidTotal++;
        } else if (bucket === 'course') summary.course++;
        else if (bucket === 'trialing') summary.trialing++;
        else if (bucket === 'past_due') summary.pastDue++;
        else if (bucket === 'canceled') summary.canceled++;
        else if (bucket === 'free') summary.free++;
        else summary.none++;

        summary.teachers.push({
            userId: code.used_by,
            name: s?.display_name ?? null,
            bucket,
            tier,
            registeredAt: code.used_at,
        });
    }

    for (const summary of byConsultant.values()) {
        let total = 0;
        let unknownPrice = false;
        for (const t of PLAN_TIER_KEYS) {
            if (summary.paid[t] === 0) continue;
            const p = prices[t];
            if (p === null) unknownPrice = true;
            else total += p * summary.paid[t];
        }
        summary.monthlyYen = unknownPrice ? null : total;
    }

    const summaries = [...byConsultant.values()].sort((a, b) =>
        b.paidTotal - a.paidTotal ||
        b.registered - a.registered ||
        a.consultant.localeCompare(b.consultant, 'ja'),
    );
    const courseInvoices = {
        previous: buildCourseInvoice(codes, settings, previousJstPeriod(now)),
        current: buildCourseInvoice(codes, settings, jstMonthOf(now.toISOString()) ?? previousJstPeriod(now)),
    };
    return { summaries, unattributedSinceStart, courseInvoices };
}

const CODE_COLUMNS = ['consultant, used_by, used_at, course_months, course_end_date', 'consultant, used_by, used_at'] as const;
const SETTINGS_COLUMNS = [
    'user_id, display_name, is_free, subscription_status, plan_tier, course_end_date',
    'user_id, display_name, is_free, subscription_status, plan_tier',
    'user_id, display_name, is_free, subscription_status',
] as const;

/**
 * 保管庫から読んで数える。consultant の列がまだ無ければ columnMissing を返す。
 * コースの列（2026-10-06）・plan_tier の列が無い保管庫でも、列を減らして読み直して数だけは出す
 */
export async function loadConsultantReport(
    db: SupabaseClient,
    now: Date = new Date(),
): Promise<ConsultantReport & { columnMissing: boolean }> {
    let rows: UsedCodeRow[] | null = null;
    for (const columns of CODE_COLUMNS) {
        const { data, error } = await db.from('invite_codes').select(columns).not('used_by', 'is', null);
        if (!error) {
            rows = (data ?? []) as unknown as UsedCodeRow[];
            break;
        }
        if (isMissingConsultantColumn(error)) {
            return { ...buildConsultantReport([], [], DEFAULT_PRICES, now), columnMissing: true };
        }
        if (!isMissingCourseColumn(error)) throw new Error(`invite_codes read failed: ${error.message}`);
    }
    if (!rows) throw new Error('invite_codes read failed');

    // 渡した相手のあるコードと、コースつきのコード（請求に名前を出す）で登録した先生
    const ids = [...new Set(rows
        .filter(r => r.used_by && (normalizeConsultant(r.consultant) || normalizeCourseMonths(r.course_months ?? null)))
        .map(r => r.used_by as string))];

    let settings: TeacherSettingsRow[] = [];
    if (ids.length > 0) {
        let lastError: string | null = null;
        let loaded = false;
        for (const columns of SETTINGS_COLUMNS) {
            const { data, error } = await db.from('user_settings').select(columns).in('user_id', ids);
            if (!error) {
                settings = (data ?? []) as unknown as TeacherSettingsRow[];
                loaded = true;
                break;
            }
            lastError = error.message;
        }
        if (!loaded) throw new Error(`user_settings read failed: ${lastError}`);
    }

    return { ...buildConsultantReport(rows, settings, DEFAULT_PRICES, now), columnMissing: false };
}

const BUCKET_LABEL: Record<ReferredTeacher['bucket'], string> = {
    paid: '有料',
    course: '受講中',
    trialing: 'お試し中',
    past_due: '支払い遅れ',
    canceled: '解約',
    free: '無料の先生',
    none: '未契約',
};

const yenOrUnknown = (n: number | null) => (n === null ? '（段の金額が未設定）' : `¥${n.toLocaleString('ja-JP')}`);

/** 運営者へのメール本文（毎月1日に自動で送る） */
export function formatConsultantReportText(report: ConsultantReport, asOfLabel: string): string {
    const lines: string[] = [`コンサルタント別の契約（${asOfLabel} 時点）`, ''];

    if (report.summaries.length === 0) {
        lines.push('渡した相手が記録されたコードで登録した先生は、まだいません。');
    }

    let paidAll = 0;
    let yenAll: number | null = 0;
    for (const s of report.summaries) {
        const tiers = PLAN_TIER_KEYS.filter(t => s.paid[t] > 0).map(t => `${PLAN_TIERS[t].label}${s.paid[t]}`).join('・');
        lines.push(`■ ${s.consultant}`);
        lines.push(`  登録した先生 ${s.registered}人／有料 ${s.paidTotal}人${tiers ? `（${tiers}）` : ''}／受講中 ${s.course}人／お試し中 ${s.trialing}人／支払い遅れ ${s.pastDue}人／解約 ${s.canceled}人／無料の先生 ${s.free}人／未契約 ${s.none}人`);
        lines.push(`  有料の月額の合計（税込・目安）：${yenOrUnknown(s.monthlyYen)}`);
        for (const t of s.teachers) {
            lines.push(`   - ${t.name ?? '（表示名なし）'}：${BUCKET_LABEL[t.bucket]}${t.bucket === 'paid' ? `・${PLAN_TIERS[t.tier].label}` : ''}`);
        }
        lines.push('');
        paidAll += s.paidTotal;
        yenAll = yenAll === null || s.monthlyYen === null ? null : yenAll + s.monthlyYen;
    }

    if (report.summaries.length > 0) {
        lines.push(`合計：有料 ${paidAll}人・有料の月額の合計（税込・目安） ${yenOrUnknown(yenAll)}`);
        lines.push('');
    }
    if (report.unattributedSinceStart > 0) {
        lines.push(`⚠️ 10/1以降に、渡した相手が空のコードで登録した先生：${report.unattributedSinceStart}人（管理画面の「招待コード」で相手を入れ忘れていないか確かめる）`);
        lines.push('');
    }
    lines.push(...formatCourseInvoiceLines(report.courseInvoices.previous));
    lines.push('');
    lines.push('※ 有料＝契約中（active）。お試し中は含めない。金額は段の月額の合計で、実際の入金額（手数料・日割り・返金）とは違う。');
    lines.push('※ 受講中＝コンサルの受講生（コースが終わる日まで無料）。紹介の取り分は無い。');
    lines.push('※ 取り分のルールは未決。この知らせは数えるだけ。');
    return lines.join('\n');
}

/** 受講生の ASTA 代（請求の目安）の文 */
export function formatCourseInvoiceLines(invoice: CourseInvoice): string[] {
    const lines = [`■ 受講生の ASTA 代（${periodLabel(invoice.period)}に、コースつきのコードで登録した受講生・請求の目安）`];
    if (invoice.lines.length === 0) {
        lines.push('  該当なし');
        return lines;
    }
    for (const g of invoice.byConsultant) {
        lines.push(`  ${g.consultant}：${g.count}人 ¥${g.totalYen.toLocaleString('ja-JP')}`);
        for (const l of invoice.lines.filter(x => x.consultant === g.consultant)) {
            const day = jstDateOf(l.registeredAt);
            lines.push(`   - ${l.name ?? '（表示名なし）'}：${l.months}か月コース${l.endDate ? `（${formatJpDate(l.endDate)}まで）` : ''}・${day ? `${formatJpDate(day)}登録・` : ''}¥${l.feeYen.toLocaleString('ja-JP')}`);
        }
    }
    lines.push(`  合計 ¥${invoice.totalYen.toLocaleString('ja-JP')}（受講開始時にまとめて受け取る分・2026-10-04 決定）`);
    return lines;
}

/** 日本時間の年月（'YYYY-MM'）と、メールに書く時点の表記 */
export function jstPeriod(now: Date): { period: string; label: string } {
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const iso = jst.toISOString();
    const [y, m, d] = [jst.getUTCFullYear(), jst.getUTCMonth() + 1, jst.getUTCDate()];
    const hh = String(jst.getUTCHours()).padStart(2, '0');
    const mm = String(jst.getUTCMinutes()).padStart(2, '0');
    return { period: iso.slice(0, 7), label: `${y}年${m}月${d}日 ${hh}:${mm}（日本時間）` };
}
