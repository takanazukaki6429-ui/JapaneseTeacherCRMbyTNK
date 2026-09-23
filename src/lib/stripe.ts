import Stripe from 'stripe';
import { PLAN_TIER_KEYS, type PlanTier } from '@/lib/pricing';

/**
 * Server-side Stripe client（遅延初期化シングルトン）
 *
 * モジュール読込時に new Stripe(...) すると STRIPE_SECRET_KEY 未設定時に
 * ビルドの page-data 収集で落ちる。実際に使う時に初めて生成することで、
 * Stripe凍結中（キー未設定）でも本番ビルドを通す。
 */
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
    if (_stripe) return _stripe;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('STRIPE_SECRET_KEY is not set. Stripe機能を使うには環境変数の設定が必要です。');
    }
    _stripe = new Stripe(key, {
        apiVersion: '2026-04-22.dahlia',
        typescript: true,
    });
    return _stripe;
}

/** ユーザーがサービスを利用できるかチェック */
export function isSubscriptionActive(
    status: string | null | undefined,
    isFree: boolean | null | undefined
): boolean {
    if (isFree) return true;
    return status === 'active' || status === 'trialing';
}

/**
 * 段ごとの価格ID（2026-09-23・3段）。環境変数 STRIPE_PRICE_ID_LIGHT / _REGULAR / _PRO。
 * 旧・単一の STRIPE_PRICE_ID はレギュラーの代わりとして読む（互換）。未設定時は空文字（利用時にチェックする）
 */
export function getStripePriceId(tier: PlanTier = 'regular'): string {
    const byTier: Record<PlanTier, string | undefined> = {
        light: process.env.STRIPE_PRICE_ID_LIGHT,
        regular: process.env.STRIPE_PRICE_ID_REGULAR ?? process.env.STRIPE_PRICE_ID,
        pro: process.env.STRIPE_PRICE_ID_PRO,
    };
    return byTier[tier] || '';
}

/** 価格ID → 段。Stripe からの通知（契約の作成・変更）で段を決めるのに使う。どれにも当たらなければ null */
export function tierFromPriceId(priceId: string | null | undefined): PlanTier | null {
    if (!priceId) return null;
    for (const t of PLAN_TIER_KEYS) if (getStripePriceId(t) === priceId) return t;
    return null;
}

/** 追加パック（翻訳＋500分・1回買い）の価格ID。環境変数 STRIPE_PRICE_ID_PACK */
export function getStripePackPriceId(): string {
    return process.env.STRIPE_PRICE_ID_PACK || '';
}
