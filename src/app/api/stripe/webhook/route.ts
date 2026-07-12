import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
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
        event = getStripe().webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Stripeからの通知はセッションを持たないため、管理者権限接続で更新する。
    // 匿名接続だとRLS（本人のみ更新可）に弾かれて0行更新＝「成功に見えて反映されない」になる。
    const supabase = createAdminClient();

    // 0行更新を成功扱いにしないため、更新結果の行を必ず確認する
    const updateByCustomerId = async (
        customerId: string,
        values: Record<string, string | null>
    ): Promise<number> => {
        const { data, error } = await supabase
            .from('user_settings')
            .update(values)
            .eq('stripe_customer_id', customerId)
            .select('user_id');

        if (error) {
            throw new Error(`user_settings update failed: ${error.message}`);
        }
        return data?.length ?? 0;
    };

    try {
        let customerId: string | null = null;
        let updatedRows = -1; // -1 = 対象外イベント

        switch (event.type) {
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                customerId = subscription.customer as string;
                const status = subscription.status; // active | trialing | canceled | past_due 等

                updatedRows = await updateByCustomerId(customerId, {
                    stripe_subscription_id: subscription.id,
                    subscription_status: status,
                });

                console.log(`Subscription ${event.type}: customer=${customerId} status=${status} rows=${updatedRows}`);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                customerId = subscription.customer as string;

                updatedRows = await updateByCustomerId(customerId, {
                    stripe_subscription_id: null,
                    subscription_status: 'canceled',
                });

                console.log(`Subscription deleted: customer=${customerId} rows=${updatedRows}`);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                customerId = invoice.customer as string;

                updatedRows = await updateByCustomerId(customerId, {
                    subscription_status: 'past_due',
                });

                console.log(`Payment failed: customer=${customerId} rows=${updatedRows}`);
                break;
            }

            default:
                // 未処理イベントは無視
                break;
        }

        if (updatedRows === 0) {
            // stripe_customer_id に対応する user_settings が無い＝異常。
            // 500を返してStripe側にリトライさせ、ダッシュボードにも失敗として残す
            await logAudit({
                action: 'stripe.subscription_changed',
                outcome: 'failure',
                resourceType: 'stripe_customer',
                resourceId: customerId ?? undefined,
                metadata: { eventType: event.type, reason: 'no matching user_settings row' },
            });
            console.error(`Webhook matched no user_settings row: customer=${customerId} event=${event.type}`);
            return NextResponse.json({ error: 'No matching user' }, { status: 500 });
        }

        if (updatedRows > 0) {
            await logAudit({
                action: 'stripe.subscription_changed',
                outcome: 'success',
                resourceType: 'stripe_customer',
                resourceId: customerId ?? undefined,
                metadata: { eventType: event.type },
            });
        }
    } catch (err) {
        console.error('Webhook handler error:', err);
        return NextResponse.json({ error: 'Handler error' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
}
