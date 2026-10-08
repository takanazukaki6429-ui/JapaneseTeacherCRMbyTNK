import { describe, it, expect } from 'vitest';
import {
    COURSE_FREE_MONTHS,
    addMonthsYmd,
    freeEndDateFromRegistration,
    courseBillingStart,
    courseDaysLeft,
    formatJpDate,
    isInCourse,
    isMissingCourseColumn,
    normalizeCourseEndDate,
    normalizeCourseMonths,
    todayJst,
} from '../course';

describe('normalizeCourseMonths', () => {
    it('3・6 だけ通す（数でも文字でも）', () => {
        expect(normalizeCourseMonths(3)).toBe(3);
        expect(normalizeCourseMonths('6')).toBe(6);
        expect(normalizeCourseMonths(4)).toBeNull();
        expect(normalizeCourseMonths('')).toBeNull();
        expect(normalizeCourseMonths(null)).toBeNull();
    });
});

describe('normalizeCourseEndDate', () => {
    it('正しい日付だけ通す（保管庫の日付の形・時刻つきも日付にそろえる）', () => {
        expect(normalizeCourseEndDate('2026-12-31')).toBe('2026-12-31');
        expect(normalizeCourseEndDate('2026-12-31T00:00:00')).toBe('2026-12-31');
        expect(normalizeCourseEndDate('2026-02-30')).toBeNull();
        expect(normalizeCourseEndDate('12/31')).toBeNull();
        expect(normalizeCourseEndDate(null)).toBeNull();
    });
});

describe('isInCourse・courseDaysLeft（日本時間で、終わる日の当日まで受講中）', () => {
    it('終わる日の当日 23:59（日本時間）までは受講中・翌日 0:00 から受講中ではない', () => {
        expect(isInCourse('2026-12-31', new Date('2026-12-31T14:59:00Z'))).toBe(true);   // 日本時間 12/31 23:59
        expect(isInCourse('2026-12-31', new Date('2026-12-31T15:00:00Z'))).toBe(false);  // 日本時間 1/1 0:00
        expect(isInCourse(null)).toBe(false);
        expect(isInCourse('壊れた日付')).toBe(false);
    });
    it('残りの日数（当日は 0・受講中でなければ null）', () => {
        expect(courseDaysLeft('2026-12-31', new Date('2026-12-24T03:00:00Z'))).toBe(7);
        expect(courseDaysLeft('2026-12-31', new Date('2026-12-31T03:00:00Z'))).toBe(0);
        expect(courseDaysLeft('2026-12-31', new Date('2027-01-01T03:00:00Z'))).toBeNull();
    });
    it('todayJst：UTC の夜は日本時間の翌日', () => {
        expect(todayJst(new Date('2026-10-06T15:30:00Z'))).toBe('2026-10-07');
    });
});

describe('無料の期間（登録した日から・2026-10-08 かずき決定・案A）', () => {
    it('3か月コースは2か月・6か月コースは5か月', () => {
        expect(COURSE_FREE_MONTHS).toEqual({ 3: 2, 6: 5 });
    });
    it('登録した日（日本時間）から数えて、その前の日までを含む', () => {
        expect(freeEndDateFromRegistration(3, new Date('2026-10-08T03:00:00Z'))).toBe('2026-12-07');
        expect(freeEndDateFromRegistration(6, new Date('2026-10-08T03:00:00Z'))).toBe('2027-03-07');
        // 日本時間では翌日（UTC の夜）
        expect(freeEndDateFromRegistration(3, new Date('2026-10-07T15:30:00Z'))).toBe('2026-12-07');
        // 月末に登録：足した先の月に同じ日が無ければ末日 → その前の日
        expect(freeEndDateFromRegistration(3, new Date('2026-12-31T03:00:00Z'))).toBe('2027-02-27');
    });
    it('addMonthsYmd', () => {
        expect(addMonthsYmd('2026-10-31', 1)).toBe('2026-11-30');
        expect(addMonthsYmd('2026-10-08', 5)).toBe('2027-03-08');
    });
});

describe('courseBillingStart（先回りして申し込んだ受講生の課金の始まり）', () => {
    it('コースが終わった翌日 0:00（日本時間）', () => {
        const start = courseBillingStart('2026-12-31', new Date('2026-11-01T00:00:00Z'));
        expect(new Date(start * 1000).toISOString()).toBe('2026-12-31T15:00:00.000Z'); // 日本時間 2027/1/1 0:00
    });
    it('近すぎる時は 49時間後（Stripe は 48時間以上先が必要）', () => {
        const now = new Date('2026-12-31T03:00:00Z');
        expect(courseBillingStart('2026-12-31', now)).toBe(Math.floor((now.getTime() + 49 * 60 * 60 * 1000) / 1000));
    });
});

describe('そのほか', () => {
    it('formatJpDate', () => {
        expect(formatJpDate('2027-03-05')).toBe('2027年3月5日');
    });
    it('isMissingCourseColumn：コースの列が無い時のエラー文を見分ける', () => {
        expect(isMissingCourseColumn({ message: 'column user_settings.course_end_date does not exist' })).toBe(true);
        expect(isMissingCourseColumn({ message: "Could not find the 'course_months' column of 'invite_codes' in the schema cache" })).toBe(true);
        expect(isMissingCourseColumn({ message: 'permission denied for table user_settings' })).toBe(false);
        expect(isMissingCourseColumn(null)).toBe(false);
    });
});
