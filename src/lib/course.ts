/**
 * コンサルの受講生は無料（2026-10-04 あいちゃんとの MTG・10/4〜10/8 かずき決定）
 *
 * - 招待コードを出す時に「コース（3か月・6か月）」を選ぶ（管理画面の招待コード）
 * - 無料の期間は、受講生が ASTA に登録した日から数える（2026-10-08 かずき決定・案A）：
 *   3か月コース＝2か月・6か月コース＝5か月（講座の最初の1か月は準備で ASTA を使わないため。あいちゃんが払う額＝レギュラー2か月分・5か月分）。
 *   登録した時に、無料の期間が終わる日を先生の設定（course_end_date）に入れる
 * - 無料の期間が終わる日（その日を含む・日本時間）までは、レギュラーと同じ機能・翻訳の分数で無料（カードは要らない）
 * - 終わったらカードで申し込む。7日間の無料お試しは付けない（受講中に使っているため）
 * - 受講中の ASTA 代は ASTA の外でやり取りする（ASTA では数えない）。受講中は紹介の取り分なし
 *
 * ここは判定だけの純粋な関数（テスト対象）。
 */

export const COURSE_MONTHS = [3, 6] as const;
export type CourseMonths = (typeof COURSE_MONTHS)[number];

/** コースごとの無料の月数（登録した日から・2026-10-08 かずき決定・案A） */
export const COURSE_FREE_MONTHS: Record<CourseMonths, number> = { 3: 2, 6: 5 };

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

/** 'YYYY-MM-DD' に月を足す（足した先の月に同じ日が無ければ、その月の末日） */
export function addMonthsYmd(ymd: string, months: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const target = new Date(Date.UTC(y, m - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, lastDay));
    return target.toISOString().slice(0, 10);
}

/**
 * 登録した日から数えた、無料の期間が終わる日（その日を含む）。
 * 例：3か月コース（無料2か月）で 10/8 に登録 → 12/7 まで
 */
export function freeEndDateFromRegistration(months: CourseMonths, registeredAt: Date = new Date()): string {
    const start = todayJst(registeredAt);
    const next = addMonthsYmd(start, COURSE_FREE_MONTHS[months]);
    return new Date(Date.parse(`${next}T00:00:00Z`) - 86400000).toISOString().slice(0, 10);
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
