'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import {
    PLAN_TIERS, PLAN_TIER_KEYS, tierPriceLabel, tierPerLessonLabel, ALL_TIER_PRICES_SET,
    PLAN_TRIAL_SENTENCE, TRIAL_TRANSLATION_MINUTES, PACK_SENTENCE, PACK_PRICE_JPY, type PlanTier,
} from '@/lib/pricing';

// useSearchParams を使うため静的プリレンダリングを無効化
export const dynamic = 'force-dynamic';

// 3段とも同じ機能。差は「翻訳モードの月の分数」だけ（2026-09-23 かずき決定・案B）
const FEATURES = [
    '生徒の管理・授業の記録（生徒の数に上限なし）',
    '体験レッスンの判定 → 学習計画の自動作成',
    'ライブ授業のヒント・例文・練習問題・やさしい言い換え',
    '翻訳モード（生徒の声をその場で日本語に）',
    '先生の言葉の訳（11言語）・授業前の1枚・記録の自動下書き',
];

function PricingContent() {
    const searchParams = useSearchParams();
    const canceled = searchParams.get('canceled') === '1';
    const [loading, setLoading] = useState<PlanTier | null>(null);
    const [error, setError] = useState('');

    const handleCheckout = async (tier: PlanTier) => {
        setLoading(tier);
        setError('');
        try {
            const res = await fetch('/api/stripe/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tier }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
            if (data.url) window.location.href = data.url;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'エラーが発生しました');
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#f0ebf8] flex flex-col items-center justify-center px-4 py-16">
            {/* ロゴ */}
            <div className="mb-8 text-center">
                <p className="text-xs font-black tracking-[0.2em] text-[#6b5ca5] mb-2">
                    日本語教師のためのASTA
                </p>
                <h1 className="text-3xl font-black text-[#3a3350] tracking-tight">
                    ASTA
                </h1>
                <p className="mt-3 text-sm text-[#484550]">機能は3つとも同じ。違いは翻訳モードを月に使える時間だけです</p>
            </div>

            {canceled && (
                <div className="mb-6 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700">
                    決済がキャンセルされました。いつでも再開できます。
                </div>
            )}

            {error && (
                <p className="text-xs text-red-600 mb-4 px-3 py-2 bg-red-50 rounded-xl">{error}</p>
            )}

            {/* 料金カード（3段） */}
            <div className="grid gap-5 w-full max-w-4xl md:grid-cols-3">
                {PLAN_TIER_KEYS.map((tier) => {
                    const t = PLAN_TIERS[tier];
                    const perLesson = tierPerLessonLabel(tier);
                    const highlight = tier === 'regular';
                    return (
                        <div
                            key={tier}
                            className={`bg-white rounded-3xl p-7 flex flex-col ${highlight ? 'shadow-[0_0_60px_rgba(107,92,165,0.18)] ring-2 ring-[#6b5ca5]' : 'shadow-[0_0_40px_rgba(107,92,165,0.08)]'}`}
                        >
                            <span className={`self-start text-xs font-bold px-3 py-1 rounded-full ${highlight ? 'text-white bg-[#6b5ca5]' : 'text-[#6b5ca5] bg-[#efe9ff]'}`}>
                                {t.label}プラン
                            </span>
                            <div className="mt-3 flex items-end gap-1">
                                <span className="text-4xl font-black text-[#3a3350]">{tierPriceLabel(tier)}</span>
                                <span className="text-sm text-[#484550] mb-1">/月（税込）</span>
                            </div>
                            {/* 授業1回あたりの金額を全プランに併記（かずき指示 2026-09-23） */}
                            <p className="mt-1 text-xs text-[#484550]">
                                {perLesson
                                    ? `生徒${t.students}人・週1回なら、授業1回あたり約${perLesson}`
                                    : '料金は準備中です'}
                            </p>
                            <div className="mt-4 px-3 py-2.5 bg-[#f6f3fb] rounded-xl text-sm text-[#3a3350]">
                                <p className="font-bold">翻訳モード 月{t.translationMinutes.toLocaleString('ja-JP')}分まで</p>
                                <p className="text-xs text-[#484550] mt-0.5">生徒{t.students}人・毎回60分つけっぱなしでも足りる量</p>
                            </div>
                            <ul className="space-y-2 my-5">
                                {FEATURES.map((f) => (
                                    <li key={f} className="flex items-start gap-2 text-[13px] text-[#3a3350]">
                                        <Check size={15} className="text-[#6b5ca5] mt-0.5 flex-shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <button
                                onClick={() => handleCheckout(tier)}
                                disabled={loading !== null || !ALL_TIER_PRICES_SET}
                                className={`mt-auto w-full py-3 font-bold rounded-2xl transition-transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 ${highlight ? 'bg-[#6b5ca5] text-white shadow-[0_4px_24px_rgba(107,92,165,0.30)]' : 'bg-[#efe9ff] text-[#3a3350]'}`}
                            >
                                {loading === tier ? (
                                    <><Loader2 size={18} className="animate-spin" />決済ページへ移動中…</>
                                ) : (
                                    `${t.label}で始める`
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* 申込みの直前に出す説明（定期購入の表示・2026-09-17） */}
            <div className="mt-6 w-full max-w-4xl px-5 py-4 bg-white/70 rounded-2xl text-xs leading-relaxed text-[#3a3350] space-y-1">
                <p>・{ALL_TIER_PRICES_SET ? '選んだプランの月額が、毎月の課金日に自動で課金されます（自動更新）。' : '料金は準備中です。確定しだい、事前にご案内します。'}</p>
                <p>・{PLAN_TRIAL_SENTENCE}。無料期間中の翻訳モードは{TRIAL_TRANSLATION_MINUTES}分までです。</p>
                <p>・翻訳モードが月の上限に達すると翻訳だけ止まり、ほかの機能はそのまま使えます。上限は毎月1日に戻ります。</p>
                {PACK_PRICE_JPY !== null && <p>・上限に達したときは、{PACK_SENTENCE}を設定の「プラン」から買い足せます。</p>}
                <p>・プランの変更・解約は、設定の「プラン」またはStripeの窓口からいつでもできます。解約すると、その課金期間の末日で終わります。</p>
                <p>・日割りの返金はありません。</p>
                <p>・クレジットカード決済・いつでもキャンセル可能</p>
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
