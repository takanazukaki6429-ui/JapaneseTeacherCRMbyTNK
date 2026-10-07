/**
 * 門番・プランの機能・翻訳の上限が使う「先生の設定」の読み込み（2026-10-06）
 *
 * 保管庫の列は段階的に足してきた（plan_tier＝9/23・course_end_date＝10/6・audience＝10/7）。
 * 列がまだ無い保管庫（SQL を流す前）でも止まらないよう、読めなければ列を減らして読み直す。
 * 特に門番は、ここが失敗すると全員を料金の画面へ回してしまうので、必ず読み直す。
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type AccessSettings = {
    is_free?: boolean | null;
    subscription_status?: string | null;
    plan_tier?: string | null;
    /** コンサルの受講中は、この日まで無料（lib/course.ts） */
    course_end_date?: string | null;
    /** 先生の区分（一般・受講生・卒業生。lib/audience.ts・2026-10-07） */
    audience?: string | null;
};

const COLUMN_SETS = [
    'is_free, subscription_status, plan_tier, course_end_date, audience',
    'is_free, subscription_status, plan_tier, course_end_date',
    'is_free, subscription_status, plan_tier',
    'is_free, subscription_status',
] as const;

export async function loadAccessSettings(supabase: SupabaseClient, userId: string): Promise<AccessSettings | null> {
    for (const columns of COLUMN_SETS) {
        const { data, error } = await supabase.from('user_settings').select(columns).eq('user_id', userId).maybeSingle();
        if (!error) return (data ?? null) as AccessSettings | null;
    }
    return null;
}
