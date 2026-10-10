/**
 * 翻訳モードの「月の上限」（2026-09-23 かずき決定・案B）
 *
 * - 数えるのは「翻訳モードで送った音声の長さ（分）」。ai_usage_log の prompt_type='transcribe' の行に、
 *   2026-09-23 以降は token_usage に音声のミリ秒を入れる（それより前の行はバイト数なので数えない）
 * - 上限に届いたら翻訳モードだけ止める。ヒント・例文・記録などはそのまま使える
 * - 上限は先生のプラン（user_settings.plan_tier）と状態で決まる：
 *     無料お試し（trialing）＝180分／既存の無料の先生（is_free）＝ライトと同じ（2026-09-24 決定）／有料＝段ごとの分数／
 *     コンサルの受講中（コースが終わる日まで）＝レギュラーと同じ（2026-10-06）
 * - 月の区切りは日本時間の1日0時
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { PLAN_TIERS, TRIAL_TRANSLATION_MINUTES, FREE_LEGACY_TRANSLATION_MINUTES, type PlanTier } from '@/lib/pricing';
import { loadAccessSettings } from '@/lib/access-settings';
import { isInCourse } from '@/lib/course';
import { packMinForMonth, type PackRow } from '@/lib/translation-pack';

/** この日時より後の transcribe の行は token_usage＝ミリ秒（前はバイト数） */
export const USAGE_MS_SINCE = '2026-09-23T00:00:00+09:00';

export type TranslationQuota = {
    tier: PlanTier | 'trial' | 'free' | 'course';
    /** プランの上限（分）＋有効な追加パックの分 */
    capMin: number;
    /** プランの上限だけ（分） */
    planCapMin: number;
    /** 今月の上限に足す追加パックの分（分）＝パックの残り＋今月すでにパックから使った分（2026-10-11） */
    packMin: number;
    usedMin: number;
    /** 今月の利用（ミリ秒・丸める前） */
    usedMs: number;
    remainingMin: number;
    /** 期限内の追加パック（使った分の割り当てに使う） */
    packs: PackRow[];
    /** パックの使った分を記録できる保管庫か（used_ms の列がある） */
    packTracking: boolean;
};

/** 日本時間の今月1日 0:00 を UTC の ISO 文字列で返す */
export function monthStartJst(now = new Date()): string {
    const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const y = jst.getUTCFullYear();
    const m = jst.getUTCMonth();
    return new Date(Date.UTC(y, m, 1) - 9 * 60 * 60 * 1000).toISOString();
}

export async function getTranslationQuota(supabase: SupabaseClient, userId: string): Promise<TranslationQuota> {
    // 列がまだ無い保管庫（本番でSQLを流す前）でも動くよう、読み込みは列を減らして読み直す（lib/access-settings.ts）
    const settings = await loadAccessSettings(supabase, userId);

    let tier: TranslationQuota['tier'] = 'light';
    let capMin = PLAN_TIERS.light.translationMinutes;
    // 契約中（有料）を先に見る。既存の無料の先生が申し込んだ場合も、プランの上限になる（2026-09-24）
    // 受講中は、お試しより先に見る：受講中に先回りして申し込んだ先生は、コースが終わるまで Stripe ではお試し中になるため（2026-10-06）
    const status = settings?.subscription_status;
    const inCourse = isInCourse(settings?.course_end_date);
    if (status === 'active' && settings?.plan_tier && settings.plan_tier in PLAN_TIERS
        && !(inCourse && PLAN_TIERS[settings.plan_tier as PlanTier].translationMinutes < PLAN_TIERS.regular.translationMinutes)) {
        tier = settings.plan_tier as PlanTier;
        capMin = PLAN_TIERS[tier].translationMinutes;
    } else if (inCourse) {
        // コンサルの受講中：レギュラーと同じ（2026-10-06）。ライトで契約中の先生が受講中になった時も、レギュラーの分数
        tier = 'course';
        capMin = PLAN_TIERS.regular.translationMinutes;
    } else if (status === 'trialing') {
        // 既存の無料の先生がお試しを始めても、無料の上限（ライトと同じ）より下げない
        tier = 'trial';
        capMin = settings?.is_free ? Math.max(TRIAL_TRANSLATION_MINUTES, FREE_LEGACY_TRANSLATION_MINUTES) : TRIAL_TRANSLATION_MINUTES;
    } else if (settings?.is_free) {
        // 既存の無料の先生：ライトと同じ（2026-09-24 かずき決定）
        tier = 'free';
        capMin = FREE_LEGACY_TRANSLATION_MINUTES;
    } else if (settings?.plan_tier && settings.plan_tier in PLAN_TIERS) {
        tier = settings.plan_tier as PlanTier;
        capMin = PLAN_TIERS[tier].translationMinutes;
    }

    const since = monthStartJst() > USAGE_MS_SINCE ? monthStartJst() : USAGE_MS_SINCE;
    const [{ data: rows }, packResult] = await Promise.all([
        supabase
            .from('ai_usage_log')
            .select('token_usage')
            .eq('user_id', userId)
            .eq('prompt_type', 'transcribe')
            .gte('created_at', since),
        loadValidPacks(supabase, userId),
    ]);
    // 負の値は数えない：先生の権限でも自分の利用記録の行は足せるため、負の行で上限を増やせないようにする（2026-10-06）
    const usedMs = (rows ?? []).reduce((s, r) => s + Math.max(0, Number(r.token_usage) || 0), 0);
    const usedMin = Math.round(usedMs / 60000 * 10) / 10;
    const planCapMin = capMin;
    // 追加パック（2026-10-11）：使った分を記録できる保管庫では「残り＋今月パックから使った分」。
    // 使った分の列がまだ無い保管庫（SQL を流す前）では、前と同じく期限内の分数をそのまま足す
    const packMin = packResult.tracking
        ? Math.round(packMinForMonth(planCapMin, usedMs, packResult.packs) * 10) / 10
        : packResult.packs.reduce((s, p) => s + (Number(p.minutes) || 0), 0);
    capMin = planCapMin + packMin;
    return {
        tier, capMin, planCapMin, packMin, usedMin, usedMs,
        remainingMin: Math.max(0, Math.round((capMin - usedMin) * 10) / 10),
        packs: packResult.packs, packTracking: packResult.tracking,
    };
}

/**
 * 期限内の追加パックを読む。使った分の列（used_ms・2026-10-11 の SQL で足す）が無い保管庫では、列を減らして読み直す。
 * 表がまだ無い保管庫では 0 件
 */
async function loadValidPacks(supabase: SupabaseClient, userId: string): Promise<{ packs: PackRow[]; tracking: boolean }> {
    const nowIso = new Date().toISOString();
    const withUsed = await supabase
        .from('translation_packs')
        .select('id, minutes, expires_at, used_ms')
        .eq('user_id', userId)
        .gt('expires_at', nowIso);
    if (!withUsed.error) return { packs: (withUsed.data ?? []) as PackRow[], tracking: true };
    const plain = await supabase
        .from('translation_packs')
        .select('id, minutes, expires_at')
        .eq('user_id', userId)
        .gt('expires_at', nowIso);
    return { packs: plain.error ? [] : ((plain.data ?? []) as PackRow[]), tracking: false };
}
