'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckCircle, CreditCard, Loader2, AlertCircle, Languages, GraduationCap } from 'lucide-react';
import { PLAN_TIERS, GENERAL_PRICES_SET, isPlanTier, tierPriceLabel, PACK_SENTENCE, PACK_PRICE_JPY, PACK_MINUTES, PACK_VALID_DAYS } from '@/lib/pricing';
import { formatJpDate, isInCourse, normalizeCourseEndDate } from '@/lib/course';
import { memberPriceDaysLeft, memberPriceLastDay, normalizeAudience } from '@/lib/audience';

// useSearchParams を使う＋認証必須のユーザー固有ページのため静的化を無効
export const dynamic = 'force-dynamic';

type BillingInfo = {
    is_free: boolean;
    subscription_status: string | null;
    stripe_customer_id: string | null;
    plan_tier?: string | null;
    /** コンサルの受講中は、この日まで無料（2026-10-06・lib/course.ts） */
    course_end_date?: string | null;
    /** 先生の区分（一般・受講生・卒業生。2026-10-07・lib/audience.ts） */
    audience?: string | null;
};

// 列がまだ無い保管庫（SQL を流す前）でも動くよう、読めなければ列を減らして読み直す
const BILLING_COLUMNS = [
    'is_free, subscription_status, stripe_customer_id, plan_tier, course_end_date, audience',
    'is_free, subscription_status, stripe_customer_id, plan_tier, course_end_date',
    'is_free, subscription_status, stripe_customer_id, plan_tier',
    'is_free, subscription_status, stripe_customer_id',
] as const;

type Quota = { tier: string; capMin: number; planCapMin: number; packMin: number; usedMin: number; remainingMin: number };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
    active:   { label: '有効', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    trialing: { label: '無料お試し中', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    past_due: { label: '支払い遅延', color: 'text-amber-600 bg-amber-50 border-amber-200' },
    canceled: { label: '解約済み', color: 'text-red-600 bg-red-50 border-red-200' },
    inactive: { label: '未契約', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

function BillingContent() {
    const searchParams = useSearchParams();
    const success = searchParams.get('success') === '1';
    const packBought = searchParams.get('pack') === '1';

    const [info, setInfo] = useState<BillingInfo | null>(null);
    const [quota, setQuota] = useState<Quota | null>(null);
    const [loading, setLoading] = useState(true);
    const [portalLoading, setPortalLoading] = useState(false);
    const [portalError, setPortalError] = useState('');
    const [packLoading, setPackLoading] = useState(false);
    const [packError, setPackError] = useState('');

    useEffect(() => {
        const supabase = createClient();
        supabase.auth.getUser().then(async ({ data: { user } }) => {
            if (!user) return;
            let row: BillingInfo | null = null;
            for (const columns of BILLING_COLUMNS) {
                const { data, error } = await supabase.from('user_settings').select(columns).eq('user_id', user.id).maybeSingle();
                if (!error) {
                    row = data as BillingInfo | null;
                    break;
                }
            }
            setInfo(row);
            setLoading(false);
        });
        fetch('/api/quota/translation').then(r => r.ok ? r.json() : null).then(q => q && setQuota(q)).catch(() => {});
    }, []);

    const handlePortal = async () => {
        setPortalLoading(true);
        setPortalError('');
        try {
            const res = await fetch('/api/stripe/customer-portal', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
                return;
            }
            // 開けなかった時は、理由を画面に出す（前は何も出なかった・2026-10-09）
            setPortalError(data.error || 'お支払いの窓口を開けませんでした。時間をおいて、もう一度お試しください。');
        } catch {
            setPortalError('通信に失敗しました。時間をおいて、もう一度お試しください。');
        } finally {
            setPortalLoading(false);
        }
    };

    const handlePack = async () => {
        setPackLoading(true);
        setPackError('');
        try {
            const res = await fetch('/api/stripe/create-pack-checkout', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'エラーが発生しました');
            if (data.url) window.location.href = data.url;
        } catch (e) {
            setPackError(e instanceof Error ? e.message : 'エラーが発生しました');
            setPackLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-[#6b5ca5]" size={28} />
            </div>
        );
    }

    const status = info?.subscription_status ?? 'inactive';
    const statusInfo = STATUS_LABEL[status] ?? STATUS_LABEL['inactive'];
    const subscribed = status === 'active' || status === 'trialing';
    // 支払いが止まっている時も契約は残っている（カードを変えれば再開できる）ので、Stripe の窓口を開けるようにする
    const paymentStopped = status === 'past_due' || status === 'unpaid';
    // コンサルの受講中（コースが終わる日まで無料・2026-10-06）
    const courseEnd = normalizeCourseEndDate(info?.course_end_date ?? null);
    const inCourse = isInCourse(courseEnd);
    const courseDone = !!courseEnd && !inCourse;
    const isActive = info?.is_free || subscribed || inCourse;
    const tier = isPlanTier(info?.plan_tier) ? info.plan_tier : 'light';
    // 既存の無料の先生が申し込んだ場合は、申し込んだプランを出す（2026-09-24）
    const legacyFreeOnly = !!info?.is_free && !subscribed;
    const courseOnly = inCourse && !subscribed;
    const audience = normalizeAudience(info?.audience ?? null);
    const memberLastDay = memberPriceLastDay({ audience, courseEndDate: courseEnd });
    const memberDaysLeft = memberPriceDaysLeft({ audience, courseEndDate: courseEnd });
    // 一般価格が決まった後は、契約した時の料金（受講生価格か一般価格か）がここでは分からないので、金額は出さない（Stripe の窓口で見られる）
    // 契約していない先生には、プランの名前と金額を出さない（前は「ライトプラン …/月」と出ていた・2026-10-09）
    const planLabel = courseOnly
        ? '特別優待プラン（全機能無料）'
        : legacyFreeOnly
            ? '無償プラン（招待）'
            : !subscribed && !paymentStopped
                ? 'プランはありません'
                : GENERAL_PRICES_SET
                ? `${PLAN_TIERS[tier].label}プラン`
                : `${PLAN_TIERS[tier].label}プラン ${tierPriceLabel(tier)}/月`;
    // 受講中に先回りして申し込んだ先生は、Stripe ではお試し中。料金は受講の後から（「無料お試し中」とは出さない）
    const statusText = courseOnly
        ? `受講中・${formatJpDate(courseEnd as string)}まで無料`
        : inCourse && status === 'trialing'
            ? '受講中（申込み済み）'
            : legacyFreeOnly ? '無償（永続）' : statusInfo.label;
    const usedPct = quota && quota.capMin > 0 ? Math.min(100, Math.round(quota.usedMin / quota.capMin * 100)) : 0;

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <h1 className="text-2xl font-bold text-[#3a3350]">プランとお支払い</h1>

            {success && (
                <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700">
                    <CheckCircle size={18} />
                    お申込みが完了しました。ご利用ありがとうございます。
                </div>
            )}
            {packBought && (
                <div className="flex items-center gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-sm text-emerald-700">
                    <CheckCircle size={18} />
                    追加パックを購入しました。翻訳モードの残りに{PACK_MINUTES}分が加わります（反映まで1分ほどかかることがあります）。
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] p-6 space-y-5">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-[#484550] uppercase tracking-wider mb-1">現在のプラン</p>
                        <p className="text-lg font-bold text-[#3a3350]">{planLabel}</p>
                    </div>
                    <CreditCard size={24} className="text-[#6b5ca5]" />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#484550]">状態</span>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${inCourse ? 'text-[#4a3f73] bg-[#f6f2ff] border-[#d9cff5]' : statusInfo.color}`}>
                        {statusText}
                    </span>
                </div>

                {/* コンサルの受講生への案内（2026-10-06）。終わった後の無料お試しは無い（受講中に使っているため） */}
                {inCourse && courseEnd && (
                    <div className="flex items-start gap-2 p-3 bg-[#f6f2ff] border border-[#d9cff5] rounded-xl text-sm text-[#4a3f73] leading-relaxed">
                        <GraduationCap size={16} className="mt-0.5 flex-shrink-0" />
                        {subscribed ? (
                            <span>お申込みありがとうございます。料金は、無料の期間（{formatJpDate(courseEnd)}まで）が終わった後からかかります。</span>
                        ) : (
                            <span>
                                特別優待プランの期間中です。<b>{formatJpDate(courseEnd)}</b>まで全機能を無料で使えます（カードの登録はいりません）。<br />
                                そのあとも使う場合は、プランをお申し込みください。今お申込みいただくと、料金は無料の期間が終わった後からかかります。
                                無料の期間が終わってから{memberLastDay ? `${formatJpDate(memberLastDay)}まで` : '30日以内'}のお申込みはコンサル受講生限定の特別価格です。無料の期間の後に、無料お試しはありません。
                            </span>
                        )}
                    </div>
                )}
                {courseDone && !subscribed && !info?.is_free && courseEnd && (
                    <div className="flex items-start gap-2 p-3 bg-[#f6f2ff] border border-[#d9cff5] rounded-xl text-sm text-[#4a3f73] leading-relaxed">
                        <GraduationCap size={16} className="mt-0.5 flex-shrink-0" />
                        <span>
                            無料の期間（{formatJpDate(courseEnd)}まで）は終わりました。続けて使うには、プランをお申し込みください（無料お試しはありません）。
                            {memberDaysLeft !== null && memberLastDay && <><br />{formatJpDate(memberLastDay)}まで（あと{memberDaysLeft}日）のお申込みなら、コンサル受講生限定の特別価格です。</>}
                        </span>
                    </div>
                )}

                {!isActive && !info?.is_free && (
                    <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                        <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                        プランが有効ではありません。プランに加入してすべての機能をご利用ください。
                    </div>
                )}
            </div>

            {/* 今月の翻訳モード（月の上限・2026-09-23） */}
            {quota && (
                <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] p-6 space-y-3">
                    <div className="flex items-center gap-2">
                        <Languages size={18} className="text-[#6b5ca5]" />
                        <p className="text-sm font-bold text-[#3a3350]">今月の翻訳モード</p>
                    </div>
                    <div className="h-2.5 w-full bg-[#efe9ff] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${usedPct >= 90 ? 'bg-amber-500' : 'bg-[#6b5ca5]'}`} style={{ width: `${usedPct}%` }} />
                    </div>
                    <p className="text-sm text-[#3a3350]">
                        使った時間 <b>{Math.round(quota.usedMin)}分</b> ／ 上限 <b>{quota.capMin.toLocaleString('ja-JP')}分</b>
                        {quota.packMin > 0 && <span className="text-xs text-[#484550]">（プラン{quota.planCapMin.toLocaleString('ja-JP')}分＋追加パック{quota.packMin}分）</span>}
                    </p>
                    <p className="text-xs text-[#484550]">上限に達すると翻訳モードだけ止まります。ほかの機能はそのまま使えます。上限は毎月1日にリセットされます。</p>

                    {PACK_PRICE_JPY !== null && (subscribed || inCourse) && (
                        <div className="pt-2 border-t border-[#f0ebf8]">
                            <p className="text-xs text-[#484550] mb-2">{PACK_SENTENCE}。買った日から{PACK_VALID_DAYS}日の間、今月の上限に足されます。</p>
                            {packError && <p className="text-xs text-red-600 mb-2">{packError}</p>}
                            <button
                                onClick={handlePack}
                                disabled={packLoading}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-[#6b5ca5] text-white text-sm font-bold rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-60"
                            >
                                {packLoading ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                                追加パックを買う（翻訳＋{PACK_MINUTES}分）
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Stripe Customer Portal（プランの変更・キャンセル・カード変更） */}
            {info?.stripe_customer_id && (subscribed || paymentStopped) && (
                <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] p-6">
                    <p className="text-sm font-bold text-[#3a3350] mb-1">プランの変更・支払い情報の管理</p>
                    <p className="text-xs text-[#484550] mb-4">
                        プランの変更（ライト⇄レギュラー⇄プロ）・カードの変更・解約・領収書はStripeの窓口で行えます。
                        {paymentStopped && <><br /><b>お支払いが止まっています。</b>窓口でカードを変えると、元どおり使えます。</>}
                    </p>
                    <button
                        onClick={handlePortal}
                        disabled={portalLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#f0ebf8] text-[#3a3350] text-sm font-bold rounded-xl hover:bg-[#efe9ff] transition-colors disabled:opacity-60"
                    >
                        {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />}
                        Stripeの窓口を開く
                    </button>
                    {portalError && <p className="mt-2 text-xs text-red-600">{portalError}</p>}
                </div>
            )}

            {(!isActive && !info?.is_free) || courseOnly ? (
                <a
                    href="/pricing"
                    className="block w-full text-center py-3.5 bg-[#6b5ca5] text-white font-bold rounded-2xl hover:scale-[1.02] transition-transform shadow-[0_4px_24px_rgba(107,92,165,0.25)]"
                >
                    {courseOnly ? 'プランを選ぶ（料金は無料の期間の後から）' : 'プランに加入する'}
                </a>
            ) : (
                // 契約中・無料の先生も、ほかのプランを見比べられるように（2026-09-24 かずき指示）
                <a
                    href="/pricing"
                    className="block w-full text-center py-3.5 bg-white text-[#3a3350] font-bold rounded-2xl border border-[#e4ddf0] hover:bg-[#f6f3fb] transition-colors"
                >
                    料金プランを比べる
                </a>
            )}

            {/* 規約と特商法の表記への入口（購入の前に見つけやすい場所に置く・2026-09-24） */}
            <p className="text-center text-[12px] text-[#6f6884]">
                <a href="/legal/terms" className="underline hover:text-[#6b5ca5]">利用規約</a>
                <span className="mx-2">・</span>
                <a href="/legal/terms#tokusho" className="underline hover:text-[#6b5ca5]">特定商取引法に基づく表記</a>
                <span className="mx-2">・</span>
                <a href="/legal/privacy" className="underline hover:text-[#6b5ca5]">プライバシーポリシー</a>
            </p>
        </div>
    );
}

export default function BillingPage() {
    return (
        <Suspense fallback={<div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#6b5ca5]" size={28} /></div>}>
            <BillingContent />
        </Suspense>
    );
}
