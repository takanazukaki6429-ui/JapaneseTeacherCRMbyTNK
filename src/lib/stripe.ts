import Stripe from 'stripe';

// Server-side Stripe client (singleton)
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-04-22.dahlia',
    typescript: true,
});

/** ユーザーがサービスを利用できるかチェック */
export function isSubscriptionActive(
    status: string | null | undefined,
    isFree: boolean | null | undefined
): boolean {
    if (isFree) return true;
    return status === 'active' || status === 'trialing';
}

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID!;
