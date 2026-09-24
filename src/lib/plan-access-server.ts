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
