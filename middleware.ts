import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        request.cookies.set(name, value)
                    )
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // 認証が必要なルートの保護
    // /login と /auth 以外はすべて保護する
    if (
        !user &&
        !request.nextUrl.pathname.startsWith('/login') &&
        !request.nextUrl.pathname.startsWith('/auth') &&
        !request.nextUrl.pathname.startsWith('/_next') &&
        !request.nextUrl.pathname.startsWith('/api') && // APIは別途ハンドリングするか、ここを含めるか検討
        !request.nextUrl.pathname.includes('.') // 静的ファイル(favicon.icoなど)を除外
    ) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user) {
        // オンボーディングチェック
        // APIルートや静的ファイルは除外
        if (
            !request.nextUrl.pathname.startsWith('/api') &&
            !request.nextUrl.pathname.startsWith('/_next') &&
            !request.nextUrl.pathname.includes('.')
        ) {
            const { data: settings } = await supabase
                .from('user_settings')
                .select('has_completed_onboarding')
                .eq('user_id', user.id)
                .single()

            const isOnboardingPage = request.nextUrl.pathname === '/onboarding'

            if (settings) {
                if (!settings.has_completed_onboarding && !isOnboardingPage) {
                    return NextResponse.redirect(new URL('/onboarding', request.url))
                }
                if (settings.has_completed_onboarding && isOnboardingPage) {
                    return NextResponse.redirect(new URL('/', request.url))
                }
            } else {
                // user_settingsがない場合は作成待ちかエラーだが、オンボーディングへ誘導するのが無難
                if (!isOnboardingPage) {
                    return NextResponse.redirect(new URL('/onboarding', request.url))
                }
            }
        }
    }

    return response
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
