import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: settings } = await supabase
            .from('user_settings')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .single();

        if (!settings?.stripe_customer_id) {
            return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
        }

        const origin = req.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

        const session = await getStripe().billingPortal.sessions.create({
            customer: settings.stripe_customer_id,
            return_url: `${origin}/settings/billing`,
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Customer portal error:', error);
        return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 });
    }
}
