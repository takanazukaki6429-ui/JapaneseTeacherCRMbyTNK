import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export const dynamic = 'force-dynamic';

// Webhookはbody rawが必要なのでNext.jsのbodyParserをバイパス
export async function POST(req: NextRequest) {
    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
        event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = await createClient();

    try {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;
                const status = subscription.status; // active | trialing | canceled | past_due 等

                await supabase
                    .from('user_settings')
                    .update({
                        stripe_subscription_id: subscription.id,
                        subscription_status: status,
                    })
                    .eq('stripe_customer_id', customerId);

                console.log(`Subscription ${event.type}: customer=${customerId} status=${status}`);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                const customerId = subscription.customer as string;

                await supabase
                    .from('user_settings')
                    .update({
                        stripe_subscription_id: null,
                        subscription_status: 'canceled',
                    })
                    .eq('stripe_customer_id', customerId);

                console.log(`Subscription deleted: customer=${customerId}`);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                const customerId = invoice.customer as string;

                await supabase
                    .from('user_settings')
                    .update({ subscription_status: 'past_due' })
                    .eq('stripe_customer_id', customerId);

                console.log(`Payment failed: customer=${customerId}`);
                break;
            }

            default:
                // 未処理イベントは無視
                break;
        }
    } catch (err) {
        console.error('Webhook handler error:', err);
        return NextResponse.json({ error: 'Handler error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
