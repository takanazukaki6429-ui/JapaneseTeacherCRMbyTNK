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
    if (user && !request.nextUrl.pathname.startsWith('/onboarding') && request.method === 'GET') {
        const { data: settings } = await supabase
            .from('user_settings')
            .select('display_name')
            .eq('user_id', user.id)
            .single();

        // If no settings found or no display_name, and not already on onboarding
        if (!settings?.display_name) {
            console.log("Redirecting to onboarding");
            return NextResponse.redirect(new URL('/onboarding', request.url));
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
