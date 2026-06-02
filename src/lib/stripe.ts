import Stripe from 'stripe';

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

/** 価格ID（未設定時は空文字。利用時にチェックする） */
export function getStripePriceId(): string {
    return process.env.STRIPE_PRICE_ID || '';
}
