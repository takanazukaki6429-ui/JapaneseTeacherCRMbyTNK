'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isSubscriptionActive } from '@/lib/stripe';

export type SubscriptionState = {
    loading: boolean;
    isActive: boolean;      // 利用可能か（is_free=true または active/trialing）
    isFree: boolean;        // 無償ユーザーか
    status: string | null;  // Stripeのサブスクステータス
};

export function useSubscription(): SubscriptionState {
    const [state, setState] = useState<SubscriptionState>({
        loading: true,
        isActive: false,
        isFree: false,
        status: null,
    });

    useEffect(() => {
        const supabase = createClient();

        const fetch = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setState({ loading: false, isActive: false, isFree: false, status: null });
                return;
            }

            const { data } = await supabase
                .from('user_settings')
                .select('is_free, subscription_status')
                .eq('user_id', user.id)
                .single();

            const isFree = data?.is_free ?? false;
            const status = data?.subscription_status ?? 'inactive';

            setState({
                loading: false,
                isActive: isSubscriptionActive(status, isFree),
                isFree,
                status,
            });
        };

        fetch();
    }, []);

    return state;
}
