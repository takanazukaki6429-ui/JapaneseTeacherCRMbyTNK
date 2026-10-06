import type { SupabaseClient } from '@supabase/supabase-js';
import { decideFeature, NEEDS_REGULAR_MESSAGE, type FeatureDecision, type GatedFeature } from '@/lib/plan-features';
import { loadAccessSettings } from '@/lib/access-settings';
import { isInCourse } from '@/lib/course';

/**
 * 有料の機能を使えるか（サーバー側）。決め方は lib/plan-access.ts と同じ（2026-09-24 かずき決定・案A）：
 * 契約中（有料・無料お試し）の先生と、コンサルの受講中の先生（コースが終わる日まで・2026-10-06）。
 * 既存の無料の先生（is_free）は、申し込めば使える
 */
export async function hasPaidPlan(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const row = await loadAccessSettings(supabase, userId);
    const status = row?.subscription_status;
    return status === 'active' || status === 'trialing' || isInCourse(row?.course_end_date);
}

/** 有料の機能を使えないときに返す文（画面はこれをそのまま出す） */
export const PAID_ONLY_MESSAGE = 'この機能は有料プランで使えます（最初の7日間は無料）。料金プランの画面からお申込みください。';

/**
 * ASTA のAI（翻訳・ヒント・例文・記録の下書きなど）を使えるか（2026-09-25 かずき決定・案B）。
 * 使えるのは、無料の印がある既存の先生・お試し中・契約中・コンサルの受講中。解約した先生は「見るだけ」なので使えない
 */
export async function canUseApp(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const row = await loadAccessSettings(supabase, userId);
    return !!row?.is_free || row?.subscription_status === 'active' || row?.subscription_status === 'trialing' || isInCourse(row?.course_end_date);
}

export const READ_ONLY_MESSAGE = 'プランが有効ではないため、この機能は使えません。記録は見られます。続きを使うには、料金プランの画面からお申込みください。';

/**
 * プランごとの機能を使えるか（2026-10-04 かずき決定・ライトでは一部の機能を使えない）。決め方は lib/plan-features.ts。
 * 列がまだ無い保管庫でも落ちないよう、読み込みは lib/access-settings.ts に任せる
 */
export async function getFeatureDecision(supabase: SupabaseClient, userId: string, feature: GatedFeature): Promise<FeatureDecision> {
    const row = await loadAccessSettings(supabase, userId);
    return decideFeature(feature, { isFree: row?.is_free, status: row?.subscription_status, tier: row?.plan_tier, courseEndDate: row?.course_end_date });
}

/** 使えない時に返す文（申込みが要るのか、レギュラー以上への変更が要るのか） */
export function featureDeniedMessage(decision: FeatureDecision): string {
    if (decision.allowed) return '';
    return decision.reason === 'needs_regular' ? NEEDS_REGULAR_MESSAGE : PAID_ONLY_MESSAGE;
}
