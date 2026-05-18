import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, STRIPE_PRICE_ID } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        // 既にアクティブなサブスクがある場合はスキップ
        if (settings?.subscription_status === 'active' || settings?.subscription_status === 'trialing') {
            return NextResponse.json({ error: 'Already subscribed' }, { status: 400 });
        }

        const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

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
            line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
            success_url: `${origin}/settings/billing?success=1`,
            cancel_url: `${origin}/pricing?canceled=1`,
            locale: 'ja',
            subscription_data: {
                metadata: { supabase_user_id: user.id },
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
