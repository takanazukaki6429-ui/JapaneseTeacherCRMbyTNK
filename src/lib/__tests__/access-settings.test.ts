import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { loadAccessSettings } from '../access-settings';

/** 保管庫にある列だけ読める、偽の接続（列が無いと PostgREST と同じ形のエラーを返す） */
function fakeDb(existing: string[], row: Record<string, unknown> | null, calls: string[]) {
    return {
        from: () => ({
            select: (columns: string) => {
                calls.push(columns);
                const missing = columns.split(',').map(c => c.trim()).find(c => !existing.includes(c));
                const result = missing
                    ? { data: null, error: { message: `column user_settings.${missing} does not exist`, code: '42703' } }
                    : { data: row && Object.fromEntries(columns.split(',').map(c => [c.trim(), row[c.trim()]])), error: null };
                return { eq: () => ({ maybeSingle: async () => result }) };
            },
        }),
    } as unknown as SupabaseClient;
}

const ROW = { is_free: false, subscription_status: 'inactive', plan_tier: 'light', course_end_date: '2026-12-31', audience: 'course' };

describe('loadAccessSettings（門番などが使う、先生の設定の読み込み）', () => {
    it('全部の列がある保管庫では、区分とコースが終わる日まで1回で読む', async () => {
        const calls: string[] = [];
        const s = await loadAccessSettings(fakeDb(Object.keys(ROW), ROW, calls), 'u');
        expect(s?.course_end_date).toBe('2026-12-31');
        expect(s?.audience).toBe('course');
        expect(calls).toHaveLength(1);
    });
    it('区分の列だけ無い保管庫（10/6 の列はある）でも、コースが終わる日は読める', async () => {
        const calls: string[] = [];
        const s = await loadAccessSettings(fakeDb(['is_free', 'subscription_status', 'plan_tier', 'course_end_date'], ROW, calls), 'u');
        expect(s).toEqual({ is_free: false, subscription_status: 'inactive', plan_tier: 'light', course_end_date: '2026-12-31' });
        expect(calls).toHaveLength(2);
    });
    it('コースの列がまだ無い保管庫（SQL を流す前）でも、列を減らして読み直す＝門番が全員を料金の画面へ回さない', async () => {
        const calls: string[] = [];
        const s = await loadAccessSettings(fakeDb(['is_free', 'subscription_status', 'plan_tier'], ROW, calls), 'u');
        expect(s).toEqual({ is_free: false, subscription_status: 'inactive', plan_tier: 'light' });
        expect(calls).toHaveLength(3);
    });
    it('プランの段の列も無い保管庫でも読める', async () => {
        const s = await loadAccessSettings(fakeDb(['is_free', 'subscription_status'], { ...ROW, is_free: true }, []), 'u');
        expect(s).toEqual({ is_free: true, subscription_status: 'inactive' });
    });
    it('行が無い先生は null', async () => {
        expect(await loadAccessSettings(fakeDb(Object.keys(ROW), null, []), 'u')).toBeNull();
    });
});
