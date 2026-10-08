/**
 * コンサルタント別の契約の数（2026-09-29・紹介の取り分を決めるための記録）
 *
 * 招待コードに「渡した相手（invite_codes.consultant）」を記録し、そのコードで登録した先生の
 * 今の契約の状態を、コンサルタントごとに数える。
 * 取り分のルール（何%・いつまで）は未決（HANDOFF「最優先の論点」）。ここは数えるだけ。
 *
 * 数え方：
 *   - 有料＝subscription_status が active（お試し中 trialing は含めない）
 *   - コンサルの受講中（コースが終わる日まで無料・2026-10-06）は「受講中」として別に数える（紹介の取り分なし）。
 *     受講中の ASTA 代は ASTA の外でやり取りするので、ここでは数えない
 *   - 受講が終わって申し込んでいない受講生は「受講後・未申込み」（2026-10-07 案2：かずき・あいちゃんが声をかける）
 *   - コードの数（2026-10-07）：出したコード・使われたコード・使われていない有効なコード（期限切れ・取り消しは数えない）。
 *     使われていないコードが多い時は、漏れや渡し忘れの目印
 *   - 無料の印（is_free）の先生で契約していない人は「無料の先生」として別に数える
 *   - 金額＝有料の先生の段の月額（税込）の合計。実際の入金額ではない（手数料・日割り・返金は入らない）
 *
 * 'server-only' の管理者権限接続はここで import しない（テストから純粋な集計だけ呼べるように）。
 * 読み込み（loadConsultantReport）は呼び出し側が渡した接続を使う。
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_TIERS, PLAN_TIER_KEYS, isPlanTier, type PlanTier } from '@/lib/pricing';
import { isInCourse } from '@/lib/course';
import { courseFinished } from '@/lib/audience';
import { inviteCodeStatus } from '@/lib/invite-code';

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
    /** 使える期限・取り消し（2026-10-07）。列が無い保管庫では来ない */
    expires_at?: string | null;
    revoked_at?: string | null;
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
    bucket: 'paid' | 'course' | 'course_finished' | 'trialing' | 'past_due' | 'canceled' | 'free' | 'none';
    tier: PlanTier;
    registeredAt: string | null;
};

export type ConsultantSummary = {
    consultant: string;
    /** そのコンサルタントに渡したコードの数（使われた物・期限切れ・取り消しも含む） */
    issued: number;
    /** 使われていない有効なコードの数（期限切れ・取り消しは除く） */
    unusedValid: number;
    /** そのコンサルタントに渡したコードで登録した先生 */
    registered: number;
    paid: Record<PlanTier, number>;
    paidTotal: number;
    /** コンサルの受講中（コースが終わる日まで無料・紹介の取り分なし） */
    course: number;
    /** 受講が終わって申し込んでいない受講生 */
    courseFinished: number;
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

export type ConsultantReport = {
    summaries: ConsultantSummary[];
    /** 記録を始めた日より後に、渡した相手が空のコードで登録した先生の数（入れ忘れの可能性） */
    unattributedSinceStart: number;
};

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
    if (s?.is_free) return 'free';
    return courseFinished({ courseEndDate: s?.course_end_date, now }) ? 'course_finished' : 'none';
}

/** 出したコードと先生の設定から、コンサルタントごとに数える（純粋な集計・テスト対象） */
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
        const consultant = normalizeConsultant(code.consultant);
        if (!consultant) {
            if (code.used_by && code.used_at && Date.parse(code.used_at) >= startMs) unattributedSinceStart++;
            continue;
        }

        let summary = byConsultant.get(consultant);
        if (!summary) {
            summary = {
                consultant,
                issued: 0,
                unusedValid: 0,
                registered: 0,
                paid: { light: 0, regular: 0, pro: 0 },
                paidTotal: 0,
                course: 0,
                courseFinished: 0,
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

        summary.issued++;
        if (!code.used_by) {
            if (inviteCodeStatus({ used_at: code.used_at, expires_at: code.expires_at, revoked_at: code.revoked_at }, now) === 'unused') {
                summary.unusedValid++;
            }
            continue;
        }

        const s = settingsById.get(code.used_by);
        const tier: PlanTier = isPlanTier(s?.plan_tier) ? s!.plan_tier as PlanTier : 'light';
        const bucket = bucketOf(s, now);
        summary.registered++;
        if (bucket === 'paid') {
            summary.paid[tier]++;
            summary.paidTotal++;
        } else if (bucket === 'course') summary.course++;
        else if (bucket === 'course_finished') summary.courseFinished++;
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
    return { summaries, unattributedSinceStart };
}

const SETTINGS_COLUMNS = [
    'user_id, display_name, is_free, subscription_status, plan_tier, course_end_date',
    'user_id, display_name, is_free, subscription_status, plan_tier',
    'user_id, display_name, is_free, subscription_status',
] as const;

/** 保管庫から読んで数える。consultant の列がまだ無ければ columnMissing を返す */
export async function loadConsultantReport(
    db: SupabaseClient,
): Promise<ConsultantReport & { columnMissing: boolean }> {
    // 出したコードの数・使われていない数も数えるので、使われていないコードも読む（期限・取り消しの列が無い保管庫では列を減らす）
    let codes: unknown[] | null = null;
    let error: { message?: string } | null = null;
    for (const columns of ['consultant, used_by, used_at, expires_at, revoked_at', 'consultant, used_by, used_at, expires_at', 'consultant, used_by, used_at']) {
        const result = await db.from('invite_codes').select(columns);
        if (!result.error) {
            codes = result.data;
            error = null;
            break;
        }
        error = result.error;
        if (isMissingConsultantColumn(result.error)) break;
    }

    if (error) {
        if (isMissingConsultantColumn(error)) {
            return { summaries: [], unattributedSinceStart: 0, columnMissing: true };
        }
        throw new Error(`invite_codes read failed: ${error.message}`);
    }

    const rows = (codes ?? []) as UsedCodeRow[];
    const ids = [...new Set(rows.filter(r => r.used_by && normalizeConsultant(r.consultant)).map(r => r.used_by as string))];

    let settings: TeacherSettingsRow[] = [];
    if (ids.length > 0) {
        // コースの列（2026-10-06）・plan_tier の列が無い保管庫でも、列を減らして読み直して数だけは出す（無い列は「受講中でない」「ライト」扱い）
        let lastError: string | null = null;
        let loaded = false;
        for (const columns of SETTINGS_COLUMNS) {
            const { data, error: readError } = await db.from('user_settings').select(columns).in('user_id', ids);
            if (!readError) {
                settings = (data ?? []) as unknown as TeacherSettingsRow[];
                loaded = true;
                break;
            }
            lastError = readError.message;
        }
        if (!loaded) throw new Error(`user_settings read failed: ${lastError}`);
    }

    return { ...buildConsultantReport(rows, settings), columnMissing: false };
}

const BUCKET_LABEL: Record<ReferredTeacher['bucket'], string> = {
    paid: '有料',
    course: '受講中',
    course_finished: '受講後・未申込み',
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
        lines.push(`  出したコード ${s.issued}件（使われていない有効なコード ${s.unusedValid}件）`);
        lines.push(`  登録した先生 ${s.registered}人／有料 ${s.paidTotal}人${tiers ? `（${tiers}）` : ''}／受講中 ${s.course}人／受講後・未申込み ${s.courseFinished}人／お試し中 ${s.trialing}人／支払い遅れ ${s.pastDue}人／解約 ${s.canceled}人／無料の先生 ${s.free}人／未契約 ${s.none}人`);
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
    lines.push('※ 有料＝契約中（active）。お試し中は含めない。金額は段の月額の合計で、実際の入金額（手数料・日割り・返金）とは違う。');
    lines.push('※ 受講中＝コンサルの受講生（特別優待プランの無料の期間中＝登録した日から2か月・5か月）。紹介の取り分は無い。受講後・未申込み＝無料の期間が終わって、まだ申し込んでいない受講生（声をかける相手）。');
    lines.push('※ 取り分のルールは未決。この知らせは数えるだけ。');
    return lines.join('\n');
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
