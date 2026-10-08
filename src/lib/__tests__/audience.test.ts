import { describe, it, expect } from 'vitest';
import {
    courseFinished,
    memberPriceDaysLeft,
    memberPriceLastDay,
    normalizeAudience,
    priceSetFor,
    trialPlanFor,
    MEMBER_PRICE_GRACE_DAYS,
} from '../audience';

// 日本時間の日付で考える（UTC 03:00＝日本時間 12:00）
const at = (ymd: string) => new Date(`${ymd}T03:00:00Z`);
const COURSE = { audience: 'course', courseEndDate: '2026-12-31' };

describe('normalizeAudience', () => {
    it('一般・受講生・卒業生だけ通す', () => {
        expect(normalizeAudience('general')).toBe('general');
        expect(normalizeAudience('course')).toBe('course');
        expect(normalizeAudience('alumni')).toBe('alumni');
        expect(normalizeAudience('vip')).toBeNull();
        expect(normalizeAudience(null)).toBeNull();
    });
});

describe('priceSetFor（どちらの料金で申し込むか・2026-10-07 かずき決定）', () => {
    it('一般の先生は一般価格', () => {
        expect(priceSetFor({ audience: 'general', now: at('2026-11-01') })).toBe('general');
    });
    it('卒業生・区分なし（既存の先生）は受講生価格（期限なし）', () => {
        expect(priceSetFor({ audience: 'alumni', now: at('2030-01-01') })).toBe('member');
        expect(priceSetFor({ audience: null, now: at('2030-01-01') })).toBe('member');
    });
    it('受講生：受講中と、コースが終わってから30日までは受講生価格。その翌日から一般価格', () => {
        expect(MEMBER_PRICE_GRACE_DAYS).toBe(30);
        expect(priceSetFor({ ...COURSE, now: at('2026-12-01') })).toBe('member');   // 受講中
        expect(priceSetFor({ ...COURSE, now: at('2027-01-30') })).toBe('member');   // 終わって30日目
        expect(priceSetFor({ ...COURSE, now: at('2027-01-31') })).toBe('general');  // 31日目
    });
    it('受講生でも終わる日が読めない時は、受講生に不利にしない（受講生価格）', () => {
        expect(priceSetFor({ audience: 'course', courseEndDate: null, now: at('2030-01-01') })).toBe('member');
    });
});

describe('受講生価格の期限', () => {
    it('最後の日は、コースが終わる日から30日後', () => {
        expect(memberPriceLastDay(COURSE)).toBe('2027-01-30');
        expect(memberPriceLastDay({ audience: 'alumni', courseEndDate: '2026-12-31' })).toBeNull();
    });
    it('残りの日数は、受講が終わってから出す（受講中・期限後は null）', () => {
        expect(memberPriceDaysLeft({ ...COURSE, now: at('2026-12-31') })).toBeNull(); // まだ受講中（当日）
        expect(memberPriceDaysLeft({ ...COURSE, now: at('2027-01-01') })).toBe(29);
        expect(memberPriceDaysLeft({ ...COURSE, now: at('2027-01-30') })).toBe(0);
        expect(memberPriceDaysLeft({ ...COURSE, now: at('2027-01-31') })).toBeNull();
    });
    it('courseFinished：終わる日の翌日から true', () => {
        expect(courseFinished({ ...COURSE, now: at('2026-12-31') })).toBe(false);
        expect(courseFinished({ ...COURSE, now: at('2027-01-01') })).toBe(true);
        expect(courseFinished({ courseEndDate: null })).toBe(false);
    });
});

describe('trialPlanFor（申込みの時の無料の期間）', () => {
    it('受講中に申し込むと、コースが終わるまで無料', () => {
        expect(trialPlanFor({ ...COURSE, hadSubscription: false, now: at('2026-12-01') }))
            .toEqual({ kind: 'until_course_end', courseEndDate: '2026-12-31' });
    });
    it('受講を終えた受講生・卒業生・前に申し込んだことがある人は、お試しなし', () => {
        expect(trialPlanFor({ ...COURSE, hadSubscription: false, now: at('2027-01-05') })).toEqual({ kind: 'none' });
        expect(trialPlanFor({ audience: 'alumni', hadSubscription: false })).toEqual({ kind: 'none' });
        expect(trialPlanFor({ audience: 'general', hadSubscription: true })).toEqual({ kind: 'none' });
    });
    it('一般・区分なしで初めての人は7日間のお試し', () => {
        expect(trialPlanFor({ audience: 'general', hadSubscription: false })).toEqual({ kind: 'days', days: 7 });
        expect(trialPlanFor({ audience: null, hadSubscription: false })).toEqual({ kind: 'days', days: 7 });
    });
});
