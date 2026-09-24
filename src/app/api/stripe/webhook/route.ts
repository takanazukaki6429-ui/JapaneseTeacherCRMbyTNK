import { NextRequest, NextResponse } from 'next/server';
import { getStripe, tierFromPriceId } from '@/lib/stripe';
import { PACK_MINUTES, PACK_VALID_DAYS, isPlanTier } from '@/lib/pricing';
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
                // 通知の中身ではなく「今の契約」を Stripe に問い合わせて使う（2026-09-24）。
                // 失敗した古い通知を Stripe が後から再送すると、新しい状態（プロ・有効）を古い状態（レギュラー・お試し中）で
                // 上書きしていた（ブランチ環境のテストで実際に起きた：09:28 にプロへ変更 → 10:16 に 09:15 の作成通知が再送）。
                // 今の契約を取り直せば、届く順番に関係なく最後は正しい状態に落ち着く
                const notified = event.data.object as Stripe.Subscription;
                let subscription = notified;
                try {
                    subscription = await getStripe().subscriptions.retrieve(notified.id);
                } catch (err) {
                    console.error('[webhook] subscription retrieve failed, using event payload:', err instanceof Error ? err.message : err);
                }
                customerId = subscription.customer as string;
                const status = subscription.status; // active | trialing | canceled | past_due 等

                // 段（2026-09-23・3段）：申込み時に付けた metadata.plan_tier を優先し、
                // ポータルで段を変えた時は契約の価格IDから決める。どちらも当たらなければ段は変えない
                const fromPrice = tierFromPriceId(subscription.items?.data?.[0]?.price?.id);
                const fromMeta = subscription.metadata?.plan_tier;
                const tier = fromPrice ?? (isPlanTier(fromMeta) ? fromMeta : null);

                updatedRows = await updateByCustomerId(customerId, {
                    stripe_subscription_id: subscription.id,
                    subscription_status: status,
                    ...(tier ? { plan_tier: tier } : {}),
                });

                console.log(`Subscription ${event.type}: customer=${customerId} status=${status} tier=${tier ?? '-'} rows=${updatedRows}`);
                break;
            }

            case 'checkout.session.completed': {
                // 追加パック（1回払い）の支払い完了 → 翻訳モードの分数を足す（2026-09-23 かずき決定）
                const session = event.data.object as Stripe.Checkout.Session;
                if (session.mode !== 'payment' || session.metadata?.pack !== 'translation') break;
                customerId = (session.customer as string) ?? null;
                const userId = session.metadata?.supabase_user_id;
                if (!userId) {
                    console.error('Pack checkout without supabase_user_id:', session.id);
                    return NextResponse.json({ error: 'No user id' }, { status: 500 });
                }
                const minutes = Number(session.metadata?.minutes) || PACK_MINUTES;
                const expiresAt = new Date(Date.now() + PACK_VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();
                // 同じ支払いの通知が2回来ても二重に足さない（stripe_session_id が一意）
                const { error: packError } = await supabase
                    .from('translation_packs')
                    .upsert({ user_id: userId, minutes, expires_at: expiresAt, stripe_session_id: session.id }, { onConflict: 'stripe_session_id', ignoreDuplicates: true });
                if (packError) {
                    throw new Error(`translation_packs insert failed: ${packError.message}`);
                }
                updatedRows = 1;
                console.log(`Pack purchased: user=${userId} minutes=${minutes} expires=${expiresAt}`);
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
