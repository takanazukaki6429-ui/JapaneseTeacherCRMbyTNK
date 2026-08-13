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

    // 転送するときは、直前の getUser() が更新したログイン用のクッキーを必ず引き継ぐ。
    // NextResponse.redirect() は新しいレスポンスを作るため、そのまま返すと
    // 更新後のクッキーが捨てられる。Supabase は使うたびに合鍵を作り直すので、
    // 捨てると手元の合鍵が無効になり「保存できたのに登録画面へ戻される」等の
    // 堂々巡りが起きる（2026-08-13 実クライアントの表示名登録ループ調査で判明）。
    const redirectKeepingCookies = (path: string) => {
        const redirect = NextResponse.redirect(new URL(path, request.url));
        response.cookies.getAll().forEach(cookie => redirect.cookies.set(cookie));
        return redirect;
    };

    // Route protection
    const isPublicRoute =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/auth') ||
        request.nextUrl.pathname.startsWith('/api/auth') || // 認証API（新規登録・認証不要）
        request.nextUrl.pathname.startsWith('/reset-password') || // パスワード再設定メール送信ページ（認証不要）
        request.nextUrl.pathname.startsWith('/student-view') || // 生徒ビュー（認証不要）
        request.nextUrl.pathname.startsWith('/pricing') ||      // 料金ページ（認証不要）
        request.nextUrl.pathname.startsWith('/legal') ||        // 利用規約・プライバシーポリシー（契約前に読めること）
        request.nextUrl.pathname.startsWith('/status') ||       // ステータスページ（認証不要・公開）
        request.nextUrl.pathname.startsWith('/api/health') ||   // ヘルスチェック（外部監視用）
        request.nextUrl.pathname === '/api/stripe/webhook';     // Stripe通知（セッション無し・署名検証はハンドラ側）

    if (!user && !isPublicRoute) {
        return redirectKeepingCookies('/login');
    }

    // 4. Onboarding check (Redirect if no display_name)
    // Use cookie cache to avoid DB query on every request
    if (user && !request.nextUrl.pathname.startsWith('/onboarding') && request.method === 'GET') {
        // 記録する値は利用者ごとに変える。以前は 'true' 固定だったため、
        // 同じ端末で別の人がログインすると前の人の記録が効いて登録画面を飛ばし、
        // 設定が無いまま利用開始してしまっていた（2026-08-13 実機で再現確認）。
        const onboardingComplete = request.cookies.get('onboarding_complete')?.value === user.id;

        if (!onboardingComplete) {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('display_name')
                .eq('user_id', user.id)
                .single();

            if (!settings?.display_name) {
                return redirectKeepingCookies('/onboarding');
            }

            // Cache onboarding status for 24 hours
            response.cookies.set('onboarding_complete', user.id, {
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
        return redirectKeepingCookies('/');
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
