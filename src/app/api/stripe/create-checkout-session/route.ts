import { NextRequest, NextResponse } from 'next/server';
import { TRIAL_DAYS, isPlanTier, type PlanTier } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/server';
import { getStripe, getStripePriceId } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * 申込み（定期購入）。2026-09-23 から3段：本文の { tier: 'light' | 'regular' | 'pro' } で段を選ぶ。
 * 段は Stripe の契約の metadata（plan_tier）にも入れ、Stripe からの通知で user_settings.plan_tier に写す
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let tier: PlanTier = 'regular';
        try {
            const body = await req.json();
            if (isPlanTier(body?.tier)) tier = body.tier;
        } catch { /* 本文なし＝レギュラー（旧画面との互換） */ }

        const priceId = getStripePriceId(tier);
        if (!priceId) {
            return NextResponse.json({ error: 'このプランの価格がまだ設定されていません' }, { status: 400 });
        }

        // 既存のstripe_customer_idを取得
        const { data: settings } = await supabase
            .from('user_settings')
            .select('stripe_customer_id, is_free, subscription_status')
            .eq('user_id', user.id)
            .single();

        // 無償ユーザーはCheckoutをスキップ
        if (settings?.is_free) {
            return NextResponse.json({ error: 'Free user — no checkout needed' }, { status: 400 });
        }

        // 既にアクティブなサブスクがある場合はスキップ（段の変更は Stripe のポータルで行う）
        if (settings?.subscription_status === 'active' || settings?.subscription_status === 'trialing') {
            return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
        }

        const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        const stripe = getStripe();

        // Stripe Customer を取得 or 新規作成
        let customerId = settings?.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: { supabase_user_id: user.id },
            });
            customerId = customer.id;

            // stripe_customer_id を保存
            await supabase
                .from('user_settings')
                .upsert({ user_id: user.id, stripe_customer_id: customerId });
        }

        // Checkout セッション作成
        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/settings/billing?success=1`,
            cancel_url: `${origin}/pricing?canceled=1`,
            locale: 'ja',
            subscription_data: {
                // 無料期間（2026-09-22 かずき決定＝7日）。画面の表示と同じ値を使う（lib/pricing.ts）
                trial_period_days: TRIAL_DAYS,
                metadata: { supabase_user_id: user.id, plan_tier: tier },
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json(
            { error: 'Failed to create checkout session' },
            { status: 500 }
        );
    }
}
