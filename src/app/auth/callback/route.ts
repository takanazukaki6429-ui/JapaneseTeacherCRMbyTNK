import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Supabase Auth のメール確認・OAuth リダイレクト先。
 * exchangeCodeForSession の結果を「レスポンス」の Cookie にセットしないと
 * ブラウザにセッションが保存されず、ログイン状態にならない。
 * 参考: https://supabase.com/docs/guides/auth/server-side/nextjs
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/';

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=missing_code`);
    }

    // 最初にリダイレクト用レスポンスを作り、その cookies に Supabase から書き込ませる。
    let response = NextResponse.redirect(`${origin}${next}`);

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.headers.get('cookie')
                        ? request.headers.get('cookie')!.split(';').map(c => {
                            const [name, ...v] = c.trim().split('=');
                            return { name, value: v.join('=') };
                        })
                        : [];
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
        console.error('[auth/callback] exchangeCodeForSession failed:', error.message);
        return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
    }

    return response;
}
