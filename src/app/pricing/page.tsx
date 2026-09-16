'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { PLAN_PRICE_JPY, PLAN_PRICE_LABEL, PLAN_PRICE_SENTENCE, PLAN_TRIAL_SENTENCE } from '@/lib/pricing';

// useSearchParams を使うため静的プリレンダリングを無効化
export const dynamic = 'force-dynamic';

const FEATURES = [
    '生徒管理・レッスン記録（無制限）',
    '初回ヒアリング → AIロードマップ生成',
    'ライブ授業 AIアシスタント（リアルタイム）',
    '生徒向けリアルタイム翻訳',
    '多言語フィードバック生成（7言語）',
    'AIによる宿題・目標提案',
];

function PricingContent() {
    const searchParams = useSearchParams();
    const canceled = searchParams.get('canceled') === '1';
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleCheckout = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
            if (data.url) window.location.href = data.url;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f0ebf8] flex flex-col items-center justify-center px-4 py-16">
            {/* ロゴ */}
            <div className="mb-10 text-center">
                <p className="text-xs font-black tracking-[0.2em] text-[#6b5ca5] mb-2">
                    日本語教師のためのASTA
                </p>
                <h1 className="text-3xl font-black text-[#3a3350] tracking-tight">
                    ASTA
                </h1>
            </div>

            {canceled && (
                <div className="mb-6 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
                    決済がキャンセルされました。いつでも再開できます。
                </div>
            )}

            {/* 料金カード */}
            <div className="bg-white rounded-3xl shadow-[0_0_60px_rgba(107,92,165,0.12)] p-8 w-full max-w-md">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <span className="text-xs font-bold text-[#6b5ca5] bg-[#efe9ff] px-3 py-1 rounded-full uppercase tracking-wider">
                            プロプラン
                        </span>
                        <div className="mt-3 flex items-end gap-1">
                            <span className="text-4xl font-black text-[#3a3350]">{PLAN_PRICE_LABEL}</span>
                            <span className="text-sm text-[#484550] mb-1">/月（税込）</span>
                        </div>
                    </div>
                    <Sparkles className="text-[#ccbeff] mt-1" size={28} />
                </div>

                <ul className="space-y-3 mb-8">
                    {FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-[#3a3350]">
                            <Check size={16} className="text-[#6b5ca5] mt-0.5 flex-shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>

                {error && (
                    <p className="text-xs text-red-600 mb-4 px-3 py-2 bg-red-50 rounded-xl">{error}</p>
                )}

                {/* 申込みの直前に出す説明（定期購入の表示・2026-09-17） */}
                <div className="mb-4 px-4 py-3 bg-[#f6f3fb] rounded-2xl text-xs leading-relaxed text-[#3a3350] space-y-1">
                    <p>{PLAN_PRICE_JPY === null
                        ? '・料金は準備中です。確定しだい、事前にご案内します。'
                        : `・${PLAN_PRICE_SENTENCE}が、毎月の課金日に自動で課金されます（自動更新）。`}</p>
                    <p>・{PLAN_TRIAL_SENTENCE}。</p>
                    <p>・解約は、設定の「プラン」またはStripeの窓口からいつでもできます。解約すると、その課金期間の末日で終わります。</p>
                    <p>・日割りの返金はありません。</p>
                </div>

                <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full py-3.5 bg-[#6b5ca5] text-white font-bold rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_4px_24px_rgba(107,92,165,0.30)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><Loader2 size={18} className="animate-spin" />決済ページへ移動中…</>
                    ) : (
                        '今すぐ始める'
                    )}
                </button>

                <p className="text-center text-xs text-[#484550]/50 mt-4">
                    クレジットカード決済・いつでもキャンセル可能
                </p>
            </div>

            <p className="mt-8 text-xs text-[#484550]/40">
                すでにアカウントをお持ちの方は
                <a href="/login" className="text-[#6b5ca5] underline ml-1">ログイン</a>
            </p>
        </div>
    );
}

export default function PricingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f0ebf8] flex items-center justify-center"><Loader2 className="animate-spin text-[#6b5ca5]" size={28} /></div>}>
            <PricingContent />
        </Suspense>
    );
}
