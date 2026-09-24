'use client';

/**
 * 有料の機能を使えるか（2026-09-24 かずき決定・案A）
 *
 * 「今の本番にある機能は無料、10月から増えた機能は有料」。有料の機能は次の5つ：
 *   ① 記録の自動下書き（宿題・次回の目標まで作る新しい版。トピック・語彙・つまずきの3欄は今までどおり無料）
 *   ② 授業前の1枚の自動作成（生徒の1枚の「本日の授業指針」・準備の画面を開いた時点で作る）
 *   ③ 授業中に作った物の保存と見返し
 *   ④ 生徒に渡すリンク（学習計画）
 *   ⑤ 追加パック
 * 使えるのは、契約中（有料・無料お試し）の先生。既存の無料の先生（is_free）は、申し込めば使える。
 * サーバー側の判定は lib/plan-access-server.ts（同じ決め方）
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export type PlanAccess = { loading: boolean; paid: boolean };

let cached: Promise<boolean> | null = null;

function fetchPaid(): Promise<boolean> {
    if (!cached) {
        cached = (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;
            const { data } = await supabase.from('user_settings').select('subscription_status').eq('user_id', user.id).maybeSingle();
            const status = (data as { subscription_status?: string } | null)?.subscription_status;
            return status === 'active' || status === 'trialing';
        })().catch(() => false);
    }
    return cached;
}

/** 有料の機能を使えるか。読み込み中は loading=true（その間は鍵も中身も出さない） */
export function usePlanAccess(): PlanAccess {
    const [state, setState] = useState<PlanAccess>({ loading: true, paid: false });
    useEffect(() => {
        let alive = true;
        fetchPaid().then(paid => { if (alive) setState({ loading: false, paid }); });
        return () => { alive = false; };
    }, []);
    return state;
}

/**
 * 「見るだけ」か（2026-09-25 かずき決定・案B）。解約・支払いが止まった先生（無料の印なし）が true。
 * その間は、書き換える操作（削除・直す・予定・ASTAに聞く・生徒の追加など）を隠す
 */
const LAPSED = ['canceled', 'past_due', 'unpaid', 'incomplete_expired'];
let cachedReadOnly: Promise<boolean> | null = null;

function fetchReadOnly(): Promise<boolean> {
    if (!cachedReadOnly) {
        cachedReadOnly = (async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;
            const { data } = await supabase.from('user_settings').select('is_free, subscription_status').eq('user_id', user.id).maybeSingle();
            const row = data as { is_free?: boolean; subscription_status?: string } | null;
            return !!row && !row.is_free && LAPSED.includes(row.subscription_status ?? '');
        })().catch(() => false);
    }
    return cachedReadOnly;
}

export function useReadOnly(): { loading: boolean; readOnly: boolean } {
    const [state, setState] = useState({ loading: true, readOnly: false });
    useEffect(() => {
        let alive = true;
        fetchReadOnly().then(readOnly => { if (alive) setState({ loading: false, readOnly }); });
        return () => { alive = false; };
    }, []);
    return state;
}
