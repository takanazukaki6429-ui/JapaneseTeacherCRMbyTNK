import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Route protection
    const isPublicRoute =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/auth') ||
        request.nextUrl.pathname.startsWith('/api/auth') || // 認証API（新規登録・認証不要）
        request.nextUrl.pathname.startsWith('/student-view') || // 生徒ビュー（認証不要）
        request.nextUrl.pathname.startsWith('/pricing') ||      // 料金ページ（認証不要）
        request.nextUrl.pathname.startsWith('/status') ||       // ステータスページ（認証不要・公開）
        request.nextUrl.pathname.startsWith('/api/health');     // ヘルスチェック（外部監視用）

    if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    // 4. Onboarding check (Redirect if no display_name)
    // Use cookie cache to avoid DB query on every request
    if (user && !request.nextUrl.pathname.startsWith('/onboarding') && request.method === 'GET') {
        const onboardingComplete = request.cookies.get('onboarding_complete')?.value;

        if (!onboardingComplete) {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('display_name')
                .eq('user_id', user.id)
                .single();

            if (!settings?.display_name) {
                return NextResponse.redirect(new URL('/onboarding', request.url));
            }

            // Cache onboarding status for 24 hours
            response.cookies.set('onboarding_complete', 'true', {
                maxAge: 86400,
                httpOnly: true,
                sameSite: 'lax',
            });
        }
    }

    // 5. Subscription check
    // TODO: 有償化タイミングでコメントアウトを解除する
    // （解除前にStripeアカウント設定・環境変数・DBマイグレーション適用が必要 → stripe-setup.md 参照）
    //
    // const isSubscriptionExempt =
    //     isPublicRoute ||
    //     request.nextUrl.pathname.startsWith('/onboarding') ||
    //     request.nextUrl.pathname.startsWith('/pricing') ||
    //     request.nextUrl.pathname.startsWith('/settings/billing') ||
    //     request.nextUrl.pathname.startsWith('/api/') ||
    //     request.nextUrl.pathname.startsWith('/login');
    //
    // if (user && !isSubscriptionExempt && request.method === 'GET') {
    //     const subscriptionActive = request.cookies.get('subscription_active')?.value;
    //     if (!subscriptionActive) {
    //         const { data: settings } = await supabase
    //             .from('user_settings')
    //             .select('is_free, subscription_status')
    //             .eq('user_id', user.id)
    //             .single();
    //         const isFree = settings?.is_free ?? false;
    //         const status = settings?.subscription_status ?? 'inactive';
    //         const isActive = isFree || status === 'active' || status === 'trialing';
    //         if (!isActive) {
    //             return NextResponse.redirect(new URL('/pricing', request.url));
    //         }
    //         response.cookies.set('subscription_active', 'true', {
    //             maxAge: 3600,
    //             httpOnly: true,
    //             sameSite: 'lax',
    //         });
    //     }
    // }

    // Redirect to dashboard if logged in and trying to access login
    if (user && request.nextUrl.pathname.startsWith('/login')) {
        return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
