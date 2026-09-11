'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import { PLAN_PRICE_LABEL } from '@/lib/pricing';

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
        <div className="min-h-screen bg-[#f1ebe1] flex flex-col items-center justify-center px-4 py-16">
            {/* ロゴ */}
            <div className="mb-10 text-center">
                <p className="text-[10px] font-black tracking-[0.3em] text-[#9c4f5a]/60 uppercase mb-2">
                    Nihongo Teacher CRM
                </p>
                <h1 className="text-3xl font-black text-[#3b2e2a] tracking-tight">
                    ASTA
                </h1>
            </div>

            {canceled && (
                <div className="mb-6 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
                    決済がキャンセルされました。いつでも再開できます。
                </div>
            )}

            {/* 料金カード */}
            <div className="bg-white rounded-3xl shadow-[0_0_60px_rgba(156,79,90,0.12)] p-8 w-full max-w-md">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <span className="text-xs font-bold text-[#9c4f5a] bg-[#f8e8e7] px-3 py-1 rounded-full uppercase tracking-wider">
                            プロプラン
                        </span>
                        <div className="mt-3 flex items-end gap-1">
                            <span className="text-4xl font-black text-[#3b2e2a]">{PLAN_PRICE_LABEL}</span>
                            <span className="text-sm text-[#534344] mb-1">/月（税込）</span>
                        </div>
                    </div>
                    <Sparkles className="text-[#d9a7ae] mt-1" size={28} />
                </div>

                <ul className="space-y-3 mb-8">
                    {FEATURES.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm text-[#3b2e2a]">
                            <Check size={16} className="text-[#9c4f5a] mt-0.5 flex-shrink-0" />
                            {f}
                        </li>
                    ))}
                </ul>

                {error && (
                    <p className="text-xs text-red-600 mb-4 px-3 py-2 bg-red-50 rounded-xl">{error}</p>
                )}

                <button
                    onClick={handleCheckout}
                    disabled={loading}
                    className="w-full py-3.5 bg-[#9c4f5a] text-white font-bold rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_4px_24px_rgba(156,79,90,0.30)] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><Loader2 size={18} className="animate-spin" />決済ページへ移動中…</>
                    ) : (
                        '今すぐ始める'
                    )}
                </button>

                <p className="text-center text-xs text-[#534344]/50 mt-4">
                    クレジットカード決済・いつでもキャンセル可能
                </p>
            </div>

            <p className="mt-8 text-xs text-[#534344]/40">
                すでにアカウントをお持ちの方は
                <a href="/login" className="text-[#9c4f5a] underline ml-1">ログイン</a>
            </p>
        </div>
    );
}

export default function PricingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-[#f1ebe1] flex items-center justify-center"><Loader2 className="animate-spin text-[#9c4f5a]" size={28} /></div>}>
            <PricingContent />
        </Suspense>
    );
}
