import Stripe from 'stripe';
import { GENERAL_PRICES_SET, PLAN_TIER_KEYS, effectivePriceSet, type PlanTier, type PriceSet } from '@/lib/pricing';

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
 * 段ごとの価格ID（2026-09-23・3段）。受講生価格＝環境変数 STRIPE_PRICE_ID_LIGHT / _REGULAR / _PRO。
 * 旧・単一の STRIPE_PRICE_ID はレギュラーの代わりとして読む（互換）。未設定時は空文字（利用時にチェックする）。
 * 一般価格（2026-10-07）＝STRIPE_PRICE_ID_LIGHT_GENERAL / _REGULAR_GENERAL / _PRO_GENERAL。
 * 一般価格の金額（lib/pricing.ts）が3つとも決まるまでは、一般の先生も受講生価格の価格IDで申し込む（画面の表示と同じ）
 */
export function getStripePriceId(tier: PlanTier = 'regular', set: PriceSet = 'member'): string {
    if (effectivePriceSet(set) === 'general') {
        const general: Record<PlanTier, string | undefined> = {
            light: process.env.STRIPE_PRICE_ID_LIGHT_GENERAL,
            regular: process.env.STRIPE_PRICE_ID_REGULAR_GENERAL,
            pro: process.env.STRIPE_PRICE_ID_PRO_GENERAL,
        };
        return general[tier] || '';
    }
    const byTier: Record<PlanTier, string | undefined> = {
        light: process.env.STRIPE_PRICE_ID_LIGHT,
        regular: process.env.STRIPE_PRICE_ID_REGULAR ?? process.env.STRIPE_PRICE_ID,
        pro: process.env.STRIPE_PRICE_ID_PRO,
    };
    return byTier[tier] || '';
}

/** 価格ID → 段（受講生価格・一般価格のどちらでも）。Stripe からの通知で段を決めるのに使う。どれにも当たらなければ null */
export function tierFromPriceId(priceId: string | null | undefined): PlanTier | null {
    if (!priceId) return null;
    for (const set of ['member', 'general'] as const) {
        for (const t of PLAN_TIER_KEYS) if (getStripePriceId(t, set) === priceId) return t;
    }
    return null;
}

/**
 * Stripe の窓口（プランの変更・解約）の設定ID（2026-10-07）。
 * 一般価格の先生は、一般価格の段の中だけで変えられる設定（STRIPE_PORTAL_CONFIGURATION_GENERAL）を使う。
 * 一般価格が決まっているのに設定が無い時は null＝窓口を開かない（受講生価格へ変えられてしまうのを防ぐ）。
 * 受講生価格の先生は Stripe の既定の窓口（undefined）
 */
export function getPortalConfiguration(set: PriceSet): string | undefined | null {
    if (set === 'general' && GENERAL_PRICES_SET) return process.env.STRIPE_PORTAL_CONFIGURATION_GENERAL || null;
    return undefined;
}

/** 追加パック（翻訳＋500分・1回買い）の価格ID。環境変数 STRIPE_PRICE_ID_PACK */
export function getStripePackPriceId(): string {
    return process.env.STRIPE_PRICE_ID_PACK || '';
}
