/**
 * コンサルの受講中は無料（2026-10-04 あいちゃんとの MTG・10/4〜10/6 かずき決定）
 *
 * - 招待コードを出す時に「コース（3か月・6か月）」と「コースが終わる日」を入れる（管理画面の招待コード）
 * - 受講生がそのコードで登録すると、先生の設定にもコースが終わる日が入る
 * - コースが終わる日（その日を含む・日本時間）までは、レギュラーと同じ機能・翻訳の分数で無料（カードは要らない）
 * - 終わったらカードで申し込む。7日間の無料お試しは付けない（受講中に使っているため）
 * - 受講中の ASTA 代は ASTA の外でやり取りする（ASTA では数えない）。受講中は紹介の取り分なし
 *
 * ここは判定だけの純粋な関数（テスト対象）。
 */

export const COURSE_MONTHS = [3, 6] as const;
export type CourseMonths = (typeof COURSE_MONTHS)[number];

/** コースが終わる何日前から、終わりの案内を出すか（2026-10-07 案2：14日前・7日前・前日。7日前と前日は強く出す） */
export const COURSE_NOTICE_DAYS = 14;

export const isCourseMonths = (v: unknown): v is CourseMonths => v === 3 || v === 6;

/** 数・文字のどちらで来ても 3／6 に直す。それ以外は null */
export function normalizeCourseMonths(raw: unknown): CourseMonths | null {
    const n = typeof raw === 'string' ? Number(raw) : raw;
    return isCourseMonths(n) ? n : null;
}

/** 'YYYY-MM-DD' の正しい日付だけ通す（それ以外は null） */
export function normalizeCourseEndDate(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const s = raw.trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    const d = new Date(`${s}T00:00:00Z`);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return null;
    return s;
}

/** 日本時間の今日（'YYYY-MM-DD'） */
export function todayJst(now: Date = new Date()): string {
    return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 受講中か（コースが終わる日の当日までは受講中・日本時間） */
export function isInCourse(courseEndDate: string | null | undefined, now: Date = new Date()): boolean {
    const end = normalizeCourseEndDate(courseEndDate ?? null);
    if (!end) return false;
    return todayJst(now) <= end;
}

/** コースが終わる日までの残りの日数（当日は 0）。受講中でなければ null */
export function courseDaysLeft(courseEndDate: string | null | undefined, now: Date = new Date()): number | null {
    const end = normalizeCourseEndDate(courseEndDate ?? null);
    if (!end || !isInCourse(end, now)) return null;
    const today = Date.parse(`${todayJst(now)}T00:00:00Z`);
    return Math.round((Date.parse(`${end}T00:00:00Z`) - today) / 86400000);
}

/**
 * 受講中の先生が先回りして申し込んだ時、課金を始める時刻（Stripe に渡す・秒）。
 * コースが終わった翌日 0:00（日本時間）。Stripe の決まりで 48時間以上先でないといけないので、近すぎる時は 49時間後にする
 */
export function courseBillingStart(courseEndDate: string, now: Date = new Date()): number {
    const nextDayJst = Date.parse(`${courseEndDate}T00:00:00+09:00`) + 24 * 60 * 60 * 1000;
    const earliest = now.getTime() + 49 * 60 * 60 * 1000;
    return Math.floor(Math.max(nextDayJst, earliest) / 1000);
}

/** 保管庫にコースの列がまだ無い時のエラーか（SQL を流す前でも画面が落ちないように見分ける） */
export function isMissingCourseColumn(error: { message?: string } | null | undefined): boolean {
    const m = error?.message ?? '';
    return /course_/i.test(m) && /column|schema cache/i.test(m);
}

/** 'YYYY-MM-DD' を「2026年12月31日」の形にする */
export function formatJpDate(ymd: string): string {
    const s = normalizeCourseEndDate(ymd);
    if (!s) return ymd;
    const [y, m, d] = s.split('-').map(Number);
    return `${y}年${m}月${d}日`;
}
