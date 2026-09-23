import { NextRequest, NextResponse } from 'next/server';
import { PACK_MINUTES, PACK_PRICE_JPY } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/server';
import { getStripe, getStripePackPriceId } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

/**
 * 追加パック（翻訳モード＋500分・1回買い・90日で失効）の購入（2026-09-23 かずき決定）。
 * 契約（定期購入）とは別の1回払い。支払いが済むと Stripe の通知（checkout.session.completed）で
 * translation_packs に1行足し、翻訳モードの月の上限にその分が加わる（lib/translation-quota.ts）
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const priceId = getStripePackPriceId();
        if (!priceId || PACK_PRICE_JPY === null) {
            return NextResponse.json({ error: '追加パックはまだ準備中です' }, { status: 400 });
        }

        const { data: settings } = await supabase
            .from('user_settings')
            .select('stripe_customer_id, is_free, subscription_status')
            .eq('user_id', user.id)
            .single();

        // 契約中（無料お試しを含む）か、既存の無料の先生だけが買える
        const canBuy = settings?.is_free || settings?.subscription_status === 'active' || settings?.subscription_status === 'trialing';
        if (!canBuy) {
            return NextResponse.json({ error: 'プランに加入してから追加パックを購入できます' }, { status: 400 });
        }

        const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
        const stripe = getStripe();

        let customerId = settings?.stripe_customer_id;
        if (!customerId) {
            const customer = await stripe.customers.create({ email: user.email, metadata: { supabase_user_id: user.id } });
            customerId = customer.id;
            await supabase.from('user_settings').upsert({ user_id: user.id, stripe_customer_id: customerId });
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: `${origin}/settings/billing?pack=1`,
            cancel_url: `${origin}/settings/billing?pack_canceled=1`,
            locale: 'ja',
            metadata: { supabase_user_id: user.id, pack: 'translation', minutes: String(PACK_MINUTES) },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe pack checkout error:', error);
        return NextResponse.json({ error: 'Failed to create pack checkout session' }, { status: 500 });
    }
}
