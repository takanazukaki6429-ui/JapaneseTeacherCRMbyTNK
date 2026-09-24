import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * 有料の機能を使えるか（サーバー側）。決め方は lib/plan-access.ts と同じ（2026-09-24 かずき決定・案A）：
 * 契約中（有料・無料お試し）の先生だけ。既存の無料の先生（is_free）は、申し込めば使える
 */
export async function hasPaidPlan(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data } = await supabase.from('user_settings').select('subscription_status').eq('user_id', userId).maybeSingle();
    const status = (data as { subscription_status?: string } | null)?.subscription_status;
    return status === 'active' || status === 'trialing';
}

/** 有料の機能を使えないときに返す文（画面はこれをそのまま出す） */
export const PAID_ONLY_MESSAGE = 'この機能は有料プランで使えます（最初の7日間は無料）。料金プランの画面からお申込みください。';

/**
 * ASTA のAI（翻訳・ヒント・例文・記録の下書きなど）を使えるか（2026-09-25 かずき決定・案B）。
 * 使えるのは、無料の印がある既存の先生・お試し中・契約中。解約した先生は「見るだけ」なので使えない
 */
export async function canUseApp(supabase: SupabaseClient, userId: string): Promise<boolean> {
    const { data } = await supabase.from('user_settings').select('is_free, subscription_status').eq('user_id', userId).maybeSingle();
    const row = data as { is_free?: boolean; subscription_status?: string } | null;
    return !!row?.is_free || row?.subscription_status === 'active' || row?.subscription_status === 'trialing';
}

export const READ_ONLY_MESSAGE = 'プランが有効ではないため、この機能は使えません。記録は見られます。続きを使うには、料金プランの画面からお申込みください。';
