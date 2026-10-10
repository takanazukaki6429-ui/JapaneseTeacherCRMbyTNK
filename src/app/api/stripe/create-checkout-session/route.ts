import { NextRequest, NextResponse } from 'next/server';
import { isPlanTier, type PlanTier } from '@/lib/pricing';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getStripe, getStripePriceId } from '@/lib/stripe';
import { courseBillingStart, normalizeCourseEndDate } from '@/lib/course';
import { priceSetFor, trialPlanFor } from '@/lib/audience';

export const dynamic = 'force-dynamic';

/**
 * 申込み（定期購入）。2026-09-23 から3段：本文の { tier: 'light' | 'regular' | 'pro' } で段を選ぶ。
 * 段は Stripe の契約の metadata（plan_tier）にも入れ、Stripe からの通知で user_settings.plan_tier に写す。
 * 2026-10-07：先生の区分で、受講生価格か一般価格か・無料の期間を決める（lib/audience.ts）
 */
export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'ログインしてから、もう一度お申し込みください。' }, { status: 401 });
        }

        let tier: PlanTier = 'regular';
        try {
            const body = await req.json();
            if (isPlanTier(body?.tier)) tier = body.tier;
        } catch { /* 本文なし＝レギュラー（旧画面との互換） */ }

        // 既存のstripe_customer_idを取得（区分・コースの列がまだ無い保管庫では、列を減らして読み直す）
        type Settings = { stripe_customer_id?: string | null; is_free?: boolean | null; subscription_status?: string | null; course_end_date?: string | null; audience?: string | null };
        let settings: Settings | null = null;
        for (const columns of [
            'stripe_customer_id, is_free, subscription_status, course_end_date, audience',
            'stripe_customer_id, is_free, subscription_status, course_end_date',
            'stripe_customer_id, is_free, subscription_status',
        ]) {
            const { data, error } = await supabase.from('user_settings').select(columns).eq('user_id', user.id).maybeSingle();
            if (!error) {
                settings = data as Settings | null;
                break;
            }
        }
        const courseEndDate = normalizeCourseEndDate(settings?.course_end_date ?? null);

        // 受講生価格か一般価格か（受講生は受講後30日まで受講生価格・卒業生と既存の先生は受講生価格・一般の先生は一般価格）
        const priceSet = priceSetFor({ audience: settings?.audience, courseEndDate });
        const priceId = getStripePriceId(tier, priceSet);
        if (!priceId) {
            return NextResponse.json({ error: 'このプランの価格がまだ設定されていません' }, { status: 400 });
        }

        // 既存の無料の先生（is_free）も申し込める（2026-09-24 かずき決定：新しい機能も使いたい人は同じ料金で課金）

        // 既にアクティブなサブスクがある場合はスキップ（段の変更は Stripe のポータルで行う）
        if (settings?.subscription_status === 'active' || settings?.subscription_status === 'trialing') {
            return NextResponse.json({ error: 'すでに契約中です。プランの変更は、設定の「プランとお支払い」の「Stripeの窓口を開く」から行えます。' }, { status: 400 });
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

            // stripe_customer_id を保存。失敗したら止める（2026-09-24：保管庫に列が無く、ここが黙って失敗して
            // Stripe の通知が先生の行を見つけられなかった。保存できないまま決済に進ませない）
            // 課金の列は先生の権限では書き換えられない決まりにした（2026-10-06・SQL）ので、運営の権限で書く
            const { error: saveError } = await createAdminClient()
                .from('user_settings')
                .update({ stripe_customer_id: customerId })
                .eq('user_id', user.id);
            if (saveError) {
                console.error('[checkout] stripe_customer_id save failed:', saveError.message);
                return NextResponse.json({ error: `お客様情報を保存できませんでした（${saveError.message}）。管理者にお知らせください` }, { status: 500 });
            }
        }

        // 無料お試しは「初めて申し込む人」だけ（2026-09-24）。解約して申し込み直すと何度でも7日無料になっていた
        let hadSubscription = false;
        try {
            const past = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 1 });
            hadSubscription = past.data.length > 0;
        } catch (err) {
            console.error('[checkout] past subscription lookup failed:', err instanceof Error ? err.message : err);
        }

        // 無料の期間の決め方（2026-10-06・10-07。lib/audience.ts）：
        //   受講中に先回りして申し込んだ → コースが終わった翌日から課金（受講中はコンサル料に含まれているため）
        //   受講を終えた人・卒業生・前に申し込んだことがある人 → お試しなし
        //   それ以外の初めての人（一般・既存の先生）→ 7日間のお試し
        const plan = trialPlanFor({ audience: settings?.audience, courseEndDate, hadSubscription });
        const trial = plan.kind === 'until_course_end'
            ? { trial_end: courseBillingStart(plan.courseEndDate) }
            : plan.kind === 'days'
                ? { trial_period_days: plan.days }
                : {};

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
                // 無料期間（2026-09-22 かずき決定＝7日）。画面の表示と同じ値を使う（lib/pricing.ts）。受講生の扱いは上
                ...trial,
                metadata: { supabase_user_id: user.id, plan_tier: tier, price_set: priceSet },
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe checkout error:', error);
        return NextResponse.json(
            { error: 'お申し込みの画面を開けませんでした。時間をおいて、もう一度お試しください。' },
            { status: 500 }
        );
    }
}
