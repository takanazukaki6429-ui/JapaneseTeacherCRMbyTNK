/**
 * 翻訳モードの「月の上限」（2026-09-23 かずき決定・案B）
 *
 * - 数えるのは「翻訳モードで送った音声の長さ（分）」。ai_usage_log の prompt_type='transcribe' の行に、
 *   2026-09-23 以降は token_usage に音声のミリ秒を入れる（それより前の行はバイト数なので数えない）
 * - 上限に届いたら翻訳モードだけ止める。ヒント・例文・記録などはそのまま使える
 * - 上限は先生のプラン（user_settings.plan_tier）と状態で決まる：
 *     無料お試し（trialing）＝180分／既存の無料の先生（is_free）＝仮にライトと同じ／有料＝段ごとの分数
 * - 月の区切りは日本時間の1日0時
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_TIERS, TRIAL_TRANSLATION_MINUTES, FREE_LEGACY_TRANSLATION_MINUTES, type PlanTier } from '@/lib/pricing';

/** この日時より後の transcribe の行は token_usage＝ミリ秒（前はバイト数） */
export const USAGE_MS_SINCE = '2026-09-23T00:00:00+09:00';

export type TranslationQuota = {
    tier: PlanTier | 'trial' | 'free';
    capMin: number;
    usedMin: number;
    remainingMin: number;
};

/** 日本時間の今月1日 0:00 を UTC の ISO 文字列で返す */
export function monthStartJst(now = new Date()): string {
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = jst.getUTCMonth();
    return new Date(Date.UTC(y, m, 1) - 9 * 60 * 60 * 1000).toISOString();
}

export async function getTranslationQuota(supabase: SupabaseClient, userId: string): Promise<TranslationQuota> {
    // plan_tier の列がまだ無い保管庫（本番でSQLを流す前）でも動くよう、失敗したら列なしで読み直す
    let settings: { is_free?: boolean; subscription_status?: string; plan_tier?: string } | null = null;
    const withTier = await supabase.from('user_settings').select('is_free, subscription_status, plan_tier').eq('user_id', userId).maybeSingle();
    if (withTier.error) {
        const noTier = await supabase.from('user_settings').select('is_free, subscription_status').eq('user_id', userId).maybeSingle();
        settings = noTier.data;
    } else {
        settings = withTier.data;
    }

    let tier: TranslationQuota['tier'] = 'light';
    let capMin = PLAN_TIERS.light.translationMinutes;
    if (settings?.is_free) {
        tier = 'free';
        capMin = FREE_LEGACY_TRANSLATION_MINUTES;
    } else if (settings?.subscription_status === 'trialing') {
        tier = 'trial';
        capMin = TRIAL_TRANSLATION_MINUTES;
    } else if (settings?.plan_tier && settings.plan_tier in PLAN_TIERS) {
        tier = settings.plan_tier as PlanTier;
        capMin = PLAN_TIERS[tier].translationMinutes;
    }

    const since = monthStartJst() > USAGE_MS_SINCE ? monthStartJst() : USAGE_MS_SINCE;
    const { data: rows } = await supabase
        .from('ai_usage_log')
        .select('token_usage')
        .eq('user_id', userId)
        .eq('prompt_type', 'transcribe')
        .gte('created_at', since);
    const usedMs = (rows ?? []).reduce((s, r) => s + (Number(r.token_usage) || 0), 0);
    const usedMin = Math.round(usedMs / 60000 * 10) / 10;
    return { tier, capMin, usedMin, remainingMin: Math.max(0, Math.round((capMin - usedMin) * 10) / 10) };
}
