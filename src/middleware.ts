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
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
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
    if (!user && !request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.pathname.startsWith('/auth')) {
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

    // Redirect to dashboard if logged in and trying to access login
    if (user && request.nextUrl.pathname.startsWith('/login')) {
        // Also check onboarding here? No, let the main check handle it.
        return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
