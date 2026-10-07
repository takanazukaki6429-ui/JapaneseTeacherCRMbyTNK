/**
 * 先生の区分と、どちらの料金で申し込むか（2026-10-07 かずき決定・カード）
 *
 * 基準の料金と機能は「一般の先生」向け。受講生・卒業生は、招待コードの種類で見分ける
 * （Stripe のプロモーションコードは、支払い画面で1つしか使えず「無料の期間」と「受講後の受講生価格」を両方付けられないため使わない）。
 *   - general（一般）：一般価格。初めての申込みは7日間のお試し
 *   - course（受講生）：コースが終わる日まで無料（lib/course.ts）。終わってから MEMBER_PRICE_GRACE_DAYS 日以内の申込みなら受講生価格、
 *     その後は一般価格。お試しなし
 *   - alumni（卒業生）：コンサルの講座をこれまでに修了し、まだ ASTA を使っていない人。受講生価格・期限なし。無料の期間もお試しもなし
 *   - 区分なし（null）：区分を作る前からいる先生（既存の先生）。受講生価格。お試しは今まで通り（初めての申込みだけ）
 * 金額は lib/pricing.ts（環境変数）。ここは判定だけの純粋な関数（テスト対象）。
 */
import { TRIAL_DAYS, type PriceSet } from '@/lib/pricing';
import { isInCourse, normalizeCourseEndDate, todayJst } from '@/lib/course';

export const AUDIENCES = ['general', 'course', 'alumni'] as const;
export type Audience = (typeof AUDIENCES)[number];

export const AUDIENCE_LABEL: Record<Audience, string> = { general: '一般', course: '受講生', alumni: '卒業生' };

export function normalizeAudience(raw: unknown): Audience | null {
    return typeof raw === 'string' && (AUDIENCES as readonly string[]).includes(raw) ? (raw as Audience) : null;
}

/** 受講生が、コースが終わってから受講生価格で申し込める日数（2026-10-07 かずき・あいちゃんの合意待ち） */
export const MEMBER_PRICE_GRACE_DAYS = 30;

export type { PriceSet };
export const PRICE_SET_LABEL: Record<PriceSet, string> = { member: '受講生価格', general: '一般価格' };

export type AudienceInput = {
    audience?: string | null;
    courseEndDate?: string | null;
    /** 判定する時点（テスト用。省略すると今） */
    now?: Date;
};

/** 'YYYY-MM-DD' に日数を足す */
export function addDaysYmd(ymd: string, days: number): string {
    return new Date(Date.parse(`${ymd}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
}

const daysBetween = (fromYmd: string, toYmd: string) =>
    Math.round((Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`)) / 86400000);

/** 受講が終わったか（コースが終わる日を過ぎた・日本時間） */
export function courseFinished(input: AudienceInput): boolean {
    const end = normalizeCourseEndDate(input.courseEndDate ?? null);
    return !!end && !isInCourse(end, input.now);
}

/** 受講生が受講生価格で申し込める最後の日（'YYYY-MM-DD'・日本時間）。受講生でなければ null */
export function memberPriceLastDay(input: AudienceInput): string | null {
    if (normalizeAudience(input.audience) !== 'course') return null;
    const end = normalizeCourseEndDate(input.courseEndDate ?? null);
    return end ? addDaysYmd(end, MEMBER_PRICE_GRACE_DAYS) : null;
}

/** どちらの料金で申し込むか（ログインしていない人は呼び出し側で一般価格にする） */
export function priceSetFor(input: AudienceInput): PriceSet {
    const audience = normalizeAudience(input.audience);
    if (audience === 'general') return 'general';
    if (audience === 'course') {
        const last = memberPriceLastDay(input);
        if (!last) return 'member'; // 終わる日が読めない時は、受講生に不利にしない
        return todayJst(input.now) <= last ? 'member' : 'general';
    }
    return 'member'; // 卒業生・区分なし（既存の先生）
}

/** 受講が終わってから、受講生価格で申し込める残りの日数（最後の日は 0）。受講中・受講生でない・期限を過ぎた時は null */
export function memberPriceDaysLeft(input: AudienceInput): number | null {
    const last = memberPriceLastDay(input);
    if (!last || !courseFinished(input)) return null;
    const today = todayJst(input.now);
    return today > last ? null : daysBetween(today, last);
}

export type TrialPlan =
    | { kind: 'until_course_end'; courseEndDate: string }
    | { kind: 'days'; days: number }
    | { kind: 'none' };

/**
 * 申込みの時の無料の期間：
 *   受講中 → コースが終わるまで（料金は無料の期間の後から）
 *   受講を終えた人・卒業生・前に申し込んだことがある人 → なし
 *   それ以外（一般・区分なしで初めて）→ 7日間のお試し
 */
export function trialPlanFor(input: AudienceInput & { hadSubscription: boolean }): TrialPlan {
    const end = normalizeCourseEndDate(input.courseEndDate ?? null);
    if (end && isInCourse(end, input.now)) return { kind: 'until_course_end', courseEndDate: end };
    if (end) return { kind: 'none' };
    if (normalizeAudience(input.audience) === 'alumni') return { kind: 'none' };
    if (input.hadSubscription) return { kind: 'none' };
    return { kind: 'days', days: TRIAL_DAYS };
}
