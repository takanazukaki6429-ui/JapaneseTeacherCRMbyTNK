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

const ROW = { is_free: false, subscription_status: 'inactive', plan_tier: 'light', course_end_date: '2026-12-31' };

describe('loadAccessSettings（門番などが使う、先生の設定の読み込み）', () => {
    it('コースの列がある保管庫では、コースが終わる日まで読む', async () => {
        const calls: string[] = [];
        const s = await loadAccessSettings(fakeDb(Object.keys(ROW), ROW, calls), 'u');
        expect(s?.course_end_date).toBe('2026-12-31');
        expect(calls).toHaveLength(1);
    });
    it('コースの列がまだ無い保管庫（SQL を流す前）でも、列を減らして読み直す＝門番が全員を料金の画面へ回さない', async () => {
        const calls: string[] = [];
        const s = await loadAccessSettings(fakeDb(['is_free', 'subscription_status', 'plan_tier'], ROW, calls), 'u');
        expect(s).toEqual({ is_free: false, subscription_status: 'inactive', plan_tier: 'light' });
        expect(calls).toHaveLength(2);
    });
    it('プランの段の列も無い保管庫でも読める', async () => {
        const s = await loadAccessSettings(fakeDb(['is_free', 'subscription_status'], { ...ROW, is_free: true }, []), 'u');
        expect(s).toEqual({ is_free: true, subscription_status: 'inactive' });
    });
    it('行が無い先生は null', async () => {
        expect(await loadAccessSettings(fakeDb(Object.keys(ROW), null, []), 'u')).toBeNull();
    });
});
