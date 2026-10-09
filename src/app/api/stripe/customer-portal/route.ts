import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPortalConfiguration, getStripe } from '@/lib/stripe';
import { priceSetFor } from '@/lib/audience';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'ログインしてから、もう一度お試しください。' }, { status: 401 });
        }

        // 区分の列がまだ無い保管庫では、列を減らして読み直す
        type Settings = { stripe_customer_id?: string | null; audience?: string | null; course_end_date?: string | null };
        let settings: Settings | null = null;
        for (const columns of ['stripe_customer_id, audience, course_end_date', 'stripe_customer_id']) {
            const { data, error } = await supabase.from('user_settings').select(columns).eq('user_id', user.id).maybeSingle();
            if (!error) {
                settings = data as Settings | null;
                break;
            }
        }

        if (!settings?.stripe_customer_id) {
            return NextResponse.json({ error: 'お支払いの情報が見つかりません。先にプランをお申し込みください。' }, { status: 400 });
        }

        // 一般価格の先生は、一般価格の段の中だけで変えられる窓口（lib/stripe.ts）。設定が無ければ開かない
        const configuration = getPortalConfiguration(priceSetFor({ audience: settings.audience, courseEndDate: settings.course_end_date }));
        if (configuration === null) {
            console.error('[customer-portal] STRIPE_PORTAL_CONFIGURATION_GENERAL が未設定');
            return NextResponse.json({ error: 'プランの変更の窓口を準備中です。管理者にお知らせください' }, { status: 503 });
        }

        const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

        const session = await getStripe().billingPortal.sessions.create({
            customer: settings.stripe_customer_id,
            return_url: `${origin}/settings/billing`,
            ...(configuration ? { configuration } : {}),
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Customer portal error:', error);
        return NextResponse.json({ error: 'お支払いの窓口を開けませんでした。時間をおいて、もう一度お試しください。' }, { status: 500 });
    }
}
