import { describe, it, expect } from 'vitest';
import {
    addMonthsYmd,
    courseEndDateMax,
    inviteCodeRejection,
    inviteCodeStatus,
    normalizeEmail,
    normalizeValidDays,
    parseEmailList,
    validateCourseEndDate,
    INVITE_VALID_DAYS_DEFAULT,
} from '../invite-code';

const NOW = new Date('2026-10-08T03:00:00Z'); // 日本時間 10/8 12:00

describe('addMonthsYmd', () => {
    it('月を足す。足した先の月に同じ日が無ければ末日', () => {
        expect(addMonthsYmd('2026-10-08', 4)).toBe('2027-02-08');
        expect(addMonthsYmd('2026-10-31', 4)).toBe('2027-02-28');
        expect(addMonthsYmd('2027-08-31', 6)).toBe('2028-02-29');
    });
});

describe('無料の期間が終わる日の打ち間違いを止める（登録済みの受講生の終わる日を直す時）', () => {
    it('3か月コース（無料2か月）は今日から3か月以内・6か月コース（無料5か月）は6か月以内', () => {
        expect(courseEndDateMax(3, NOW)).toBe('2027-01-08');
        expect(courseEndDateMax(6, NOW)).toBe('2027-04-08');
        expect(validateCourseEndDate(3, '2026-12-07', NOW)).toBeNull();
        expect(validateCourseEndDate(3, '2027-01-08', NOW)).toBeNull();
        expect(validateCourseEndDate(3, '2027-01-09', NOW)).toContain('2027年1月8日まで');
        expect(validateCourseEndDate(6, '2028-03-07', NOW)).toContain('打ち間違い'); // 2027 を 2028 と打った
    });
    it('過ぎた日は入れられない', () => {
        expect(validateCourseEndDate(3, '2026-10-07', NOW)).toContain('過ぎています');
        expect(validateCourseEndDate(3, '2026-10-08', NOW)).toBeNull(); // 今日は入れられる
    });
    it('延長の印を付けた時は上限を超えてよい。ただし2年より先は止める', () => {
        expect(validateCourseEndDate(3, '2027-06-30', NOW, { allowExtension: true })).toBeNull();
        expect(validateCourseEndDate(3, '2028-10-09', NOW, { allowExtension: true })).toContain('延長でも');
    });
});

describe('メールアドレス', () => {
    it('前後の空白を落とし、小文字にそろえる。形がおかしければ null', () => {
        expect(normalizeEmail('  Taro@Example.COM ')).toBe('taro@example.com');
        expect(normalizeEmail('taro@example')).toBeNull();
        expect(normalizeEmail('')).toBeNull();
        expect(normalizeEmail(null)).toBeNull();
    });
    it('1行に1人の一覧を読む（空行は無視・同じ物は1つ・おかしい物は別に返す）', () => {
        expect(parseEmailList('a@example.com\n\n B@example.com \na@example.com\nnot-an-email')).toEqual({
            emails: ['a@example.com', 'b@example.com'],
            invalid: ['not-an-email'],
        });
        expect(parseEmailList(undefined)).toEqual({ emails: [], invalid: [] });
    });
});

describe('コードの状態と、登録してよいか', () => {
    const fresh = { used_at: null, expires_at: '2026-10-22T03:00:00Z', revoked_at: null, email: null };
    it('使用済み → 取り消し → 期限切れ → 未使用の順に見る', () => {
        expect(inviteCodeStatus({ ...fresh, used_at: '2026-10-01T00:00:00Z', revoked_at: '2026-10-02T00:00:00Z' }, NOW)).toBe('used');
        expect(inviteCodeStatus({ ...fresh, revoked_at: '2026-10-02T00:00:00Z' }, NOW)).toBe('revoked');
        expect(inviteCodeStatus({ ...fresh, expires_at: '2026-10-08T02:59:00Z' }, NOW)).toBe('expired');
        expect(inviteCodeStatus(fresh, NOW)).toBe('unused');
        expect(inviteCodeStatus({ used_at: null }, NOW)).toBe('unused'); // 期限の列が無い古いコード
    });
    it('取り消し・期限切れ・使用済みのコードでは登録できない', () => {
        expect(inviteCodeRejection({ ...fresh, used_at: '2026-10-01T00:00:00Z' }, 'a@example.com', NOW)).toContain('既に使用');
        expect(inviteCodeRejection({ ...fresh, revoked_at: '2026-10-02T00:00:00Z' }, 'a@example.com', NOW)).toContain('使えません');
        expect(inviteCodeRejection({ ...fresh, expires_at: '2026-10-01T00:00:00Z' }, 'a@example.com', NOW)).toContain('有効期限切れ');
        expect(inviteCodeRejection(fresh, 'a@example.com', NOW)).toBeNull();
    });
    it('メールアドレスに紐づけたコードは、そのアドレスでしか登録できない（大文字・空白の違いは同じ扱い）', () => {
        const bound = { ...fresh, email: 'taro@example.com' };
        expect(inviteCodeRejection(bound, ' Taro@Example.com', NOW)).toBeNull();
        expect(inviteCodeRejection(bound, 'jiro@example.com', NOW)).toContain('別のメールアドレス用');
    });
});

describe('normalizeValidDays', () => {
    it('1〜90日だけ。それ以外は既定の14日', () => {
        expect(normalizeValidDays(30)).toBe(30);
        expect(normalizeValidDays('7')).toBe(7);
        expect(normalizeValidDays(0)).toBe(INVITE_VALID_DAYS_DEFAULT);
        expect(normalizeValidDays(91)).toBe(INVITE_VALID_DAYS_DEFAULT);
        expect(normalizeValidDays(undefined)).toBe(14);
    });
});
