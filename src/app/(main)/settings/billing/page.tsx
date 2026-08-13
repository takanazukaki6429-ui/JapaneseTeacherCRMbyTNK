'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, CreditCard, Loader2, AlertCircle } from 'lucide-react';
import { PLAN_PRICE_LABEL } from '@/lib/pricing';

// useSearchParams を使う＋認証必須のユーザー固有ページのため静的化を無効
export const dynamic = 'force-dynamic';

type BillingInfo = {
    is_free: boolean;
    subscription_status: string | null;
    stripe_customer_id: string | null;
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    active:   { label: '有効', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    trialing: { label: 'トライアル中', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    past_due: { label: '支払い遅延', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    canceled: { label: 'キャンセル済み', color: 'text-red-600 bg-red-50 border-red-200' },
    inactive: { label: '未契約', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

function BillingContent() {
    const searchParams = useSearchParams();
    const success = searchParams.get('success') === '1';

    const [info, setInfo] = useState<BillingInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [portalLoading, setPortalLoading] = useState(false);

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return;
            const { data } = await supabase
                .from('user_settings')
                .select('is_free, subscription_status, stripe_customer_id')
                .eq('user_id', user.id)
                .single();
            setInfo(data as BillingInfo);
            setLoading(false);
        });
    }, []);

    const handlePortal = async () => {
        setPortalLoading(true);
        try {
            const res = await fetch('/api/stripe/customer-portal', { method: 'POST' });
            const data = await res.json();
            if (data.url) window.location.href = data.url;
        } catch {
            alert('エラーが発生しました');
        } finally {
            setPortalLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-[#6f5385]" size={28} />
            </div>
        );
    }

    const status = info?.subscription_status ?? 'inactive';
    const statusInfo = STATUS_LABEL[status] ?? STATUS_LABEL['inactive'];
    const isActive = info?.is_free || status === 'active' || status === 'trialing';

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-[#1a1c1e]">プラン・お支払い</h1>

            {success && (
                <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700">
                    <CheckCircle size={18} />
                    サブスクリプションが有効になりました！ご利用ありがとうございます。
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1">現在のプラン</p>
                        <p className="text-lg font-bold text-[#1a1c1e]">
                            {info?.is_free ? '無償プラン（招待）' : `プロプラン ${PLAN_PRICE_LABEL}/月`}
                        </p>
                    </div>
                    <CreditCard size={24} className="text-[#6f5385]" />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#4b454e]">ステータス</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}>
                        {info?.is_free ? '無償（永続）' : statusInfo.label}
                    </span>
                </div>

                {!isActive && !info?.is_free && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        サブスクリプションが有効ではありません。プランに加入してすべての機能をご利用ください。
                    </div>
                )}
            </div>

            {/* Stripe Customer Portal（キャンセル・カード変更） */}
            {info?.stripe_customer_id && !info?.is_free && (
                <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] p-6">
                    <p className="text-sm font-bold text-[#1a1c1e] mb-1">支払い情報の管理</p>
                    <p className="text-xs text-[#4b454e] mb-4">
                        カードの変更・サブスクリプションのキャンセルはStripeのポータルで行えます。
                    </p>
                    <button
                        onClick={handlePortal}
                        disabled={portalLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#f4f3f7] text-[#1a1c1e] text-sm font-bold rounded-xl hover:bg-[#f2daff] transition-colors disabled:opacity-60"
                    >
                        {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                        Stripeポータルを開く
                    </button>
                </div>
            )}

            {!isActive && !info?.is_free && (
                <a
                    href="/pricing"
                    className="block w-full text-center py-3.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_4px_24px_rgba(111,83,133,0.25)]"
                >
                    プランに加入する
                </a>
            )}
        </div>
    );
}

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#6f5385]" size={28} /></div>}>
            <BillingContent />
        </Suspense>
    );
}
