/**
 * 招待コードの守り（2026-10-07 かずき決定・カード）
 *
 * - コードは1人1回で使い切り・毎回ちがう8文字（前から）。出せるのは管理者（かずき）だけ（当面）
 * - 使える期限：発行から INVITE_VALID_DAYS_DEFAULT 日（発行の画面で変えられる）
 * - まとめて出す：同じ種類・同じコースのコードを、人数分まとめて出す（最大 INVITE_BATCH_MAX）
 * - メールアドレスに紐づける：そのメールアドレスでしか登録できないコード（任意）
 * - 使っていないコードの取り消し
 * - コースが終わる日の打ち間違いを止める：3か月コースは今日から4か月以内・6か月コースは7か月以内（延長は印を付けた時だけ・2年まで）
 * ここは判定だけの純粋な関数（テスト対象）。
 */
import { formatJpDate, todayJst, type CourseMonths } from '@/lib/course';

export const INVITE_VALID_DAYS_DEFAULT = 14;
export const INVITE_VALID_DAYS_MAX = 90;
export const INVITE_BATCH_MAX = 30;
/** 延長の印を付けた時でも、ここより先の日付は入れられない（打ち間違いの止め） */
export const COURSE_END_EXTENSION_MAX_MONTHS = 24;

/** 'YYYY-MM-DD' に月を足す（足した先の月に同じ日が無ければ、その月の末日） */
export function addMonthsYmd(ymd: string, months: number): string {
    const [y, m, d] = ymd.split('-').map(Number);
    const target = new Date(Date.UTC(y, m - 1 + months, 1));
    const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
    target.setUTCDate(Math.min(d, lastDay));
    return target.toISOString().slice(0, 10);
}

/** コースが終わる日として受け付ける最後の日（3か月コース＝今日から4か月・6か月コース＝今日から7か月） */
export function courseEndDateMax(months: CourseMonths, now: Date = new Date()): string {
    return addMonthsYmd(todayJst(now), months + 1);
}

/** コースが終わる日を確かめる。おかしければ、画面に出す文を返す（よければ null） */
export function validateCourseEndDate(
    months: CourseMonths,
    endDate: string,
    now: Date = new Date(),
    options: { allowExtension?: boolean } = {},
): string | null {
    const today = todayJst(now);
    if (endDate < today) return 'コースが終わる日が、もう過ぎています';
    if (options.allowExtension) {
        const hardMax = addMonthsYmd(today, COURSE_END_EXTENSION_MAX_MONTHS);
        return endDate > hardMax ? `延長でも、${formatJpDate(hardMax)}より先の日付は入れられません` : null;
    }
    const max = courseEndDateMax(months, now);
    return endDate > max
        ? `${months}か月コースの終わる日は、${formatJpDate(max)}までです（打ち間違いの止め）。延長する時は「延長」に印を付けてください`
        : null;
}

/** メールアドレスをそろえる（前後の空白を落とし、小文字に）。形がおかしければ null */
export function normalizeEmail(raw: unknown): string | null {
    if (typeof raw !== 'string') return null;
    const s = raw.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 254 ? s : null;
}

/** 1行に1人のメールアドレスの一覧を読む（空行は無視・同じ物は1つに） */
export function parseEmailList(text: unknown): { emails: string[]; invalid: string[] } {
    if (typeof text !== 'string') return { emails: [], invalid: [] };
    const emails: string[] = [];
    const invalid: string[] = [];
    for (const line of text.split(/[\n,、]+/)) {
        const raw = line.trim();
        if (!raw) continue;
        const email = normalizeEmail(raw);
        if (!email) invalid.push(raw);
        else if (!emails.includes(email)) emails.push(email);
    }
    return { emails, invalid };
}

export type InviteCodeState = {
    used_at: string | null;
    expires_at?: string | null;
    revoked_at?: string | null;
    email?: string | null;
};

export type InviteCodeStatus = 'used' | 'revoked' | 'expired' | 'unused';

export const INVITE_STATUS_LABEL: Record<InviteCodeStatus, string> = {
    used: '使用済み',
    revoked: '取り消し済み',
    expired: '期限切れ',
    unused: '未使用（有効）',
};

/** コードの状態（使用済み → 取り消し → 期限切れ → 未使用の順に見る） */
export function inviteCodeStatus(code: InviteCodeState, now: Date = new Date()): InviteCodeStatus {
    if (code.used_at) return 'used';
    if (code.revoked_at) return 'revoked';
    if (code.expires_at && Date.parse(code.expires_at) < now.getTime()) return 'expired';
    return 'unused';
}

/** 登録の時に、このコードで登録してよいかを確かめる。だめなら画面に出す文を返す（よければ null） */
export function inviteCodeRejection(code: InviteCodeState, email: string, now: Date = new Date()): string | null {
    const status = inviteCodeStatus(code, now);
    if (status === 'used') return 'この招待コードは既に使用されています。';
    if (status === 'revoked') return 'この招待コードは使えません。コンサルタントにご確認ください。';
    if (status === 'expired') return 'この招待コードは有効期限切れです。コンサルタントに再発行を依頼してください。';
    const bound = normalizeEmail(code.email ?? null);
    if (bound && normalizeEmail(email) !== bound) {
        return 'この招待コードは、別のメールアドレス用です。コンサルタントにご確認ください。';
    }
    return null;
}

/** 使える期限（日数）をそろえる。おかしければ既定の日数 */
export function normalizeValidDays(raw: unknown): number {
    const n = typeof raw === 'string' ? Number(raw) : raw;
    return typeof n === 'number' && Number.isInteger(n) && n >= 1 && n <= INVITE_VALID_DAYS_MAX ? n : INVITE_VALID_DAYS_DEFAULT;
}
