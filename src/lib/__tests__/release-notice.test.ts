import { describe, it, expect } from 'vitest';
import { RELEASE_NOTICE_DAYS, parseJpDate, releaseNoticeDismissKey, showReleaseNotice } from '../release-notice';

const at = (iso: string) => new Date(iso);

describe('本番へ入れた時のお知らせ（2026-10-10 かずき決定）', () => {
    it('施行日の「2026年10月12日」の形を読む。読めない形は null', () => {
        expect(parseJpDate('2026年10月12日')).toBe('2026-10-12');
        expect(parseJpDate('2026年1月5日')).toBe('2026-01-05');
        expect(parseJpDate('2026-10-12')).toBeNull();
        expect(parseJpDate('2026年13月1日')).toBeNull();
        expect(parseJpDate(undefined)).toBeNull();
    });

    it('既存の無料の先生に、施行日から30日の間だけ出す（日本時間）', () => {
        const base = { isFree: true, effectiveDate: '2026年10月12日', dismissed: false };
        expect(showReleaseNotice({ ...base, now: at('2026-10-11T14:59:00Z') })).toBe(false);   // 日本時間 10/11 23:59
        expect(showReleaseNotice({ ...base, now: at('2026-10-11T15:00:00Z') })).toBe(true);    // 日本時間 10/12 0:00
        expect(showReleaseNotice({ ...base, now: at('2026-11-10T14:59:00Z') })).toBe(true);    // 日本時間 11/10 23:59（30日目）
        expect(showReleaseNotice({ ...base, now: at('2026-11-10T15:00:00Z') })).toBe(false);   // 日本時間 11/11（31日目）
        expect(RELEASE_NOTICE_DAYS).toBe(30);
    });

    it('閉じた先生・無料の印が無い先生・施行日が読めない時は出さない', () => {
        const now = at('2026-10-15T03:00:00Z');
        expect(showReleaseNotice({ isFree: true, effectiveDate: '2026年10月12日', dismissed: true, now })).toBe(false);
        expect(showReleaseNotice({ isFree: false, effectiveDate: '2026年10月12日', dismissed: false, now })).toBe(false);
        expect(showReleaseNotice({ isFree: true, effectiveDate: '10/12', dismissed: false, now })).toBe(false);
    });

    it('閉じたことを覚える名前は、お知らせごとに分ける', () => {
        expect(releaseNoticeDismissKey()).toBe('asta_notice_dismissed_release-2026-10');
        expect(releaseNoticeDismissKey('next')).toBe('asta_notice_dismissed_next');
    });
});
