import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { EmailOtpType } from '@supabase/supabase-js';

/**
 * メール内リンクの token_hash をサーバー側で検証する受け口。
 * パスワード再設定リンクを「メール送信を要求したのと別のブラウザ・端末」で
 * 開いても通るように、PKCE（ブラウザ保存の code_verifier 前提）ではなく
 * verifyOtp(token_hash) で検証する。
 * 参考: https://supabase.com/docs/guides/auth/passwords#resetting-a-password
 *
 * メールテンプレート側は以下の形式のリンクを送る前提:
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/auth/update-password
 */
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = searchParams.get('next') ?? '/';

    if (!token_hash || !type) {
        return NextResponse.redirect(`${origin}/login?error=missing_token`);
    }

    // 先にリダイレクト用レスポンスを作り、その cookies に Supabase から書き込ませる
    // （auth/callback と同じパターン。request 側に書くとセッションが保存されない）
    const response = NextResponse.redirect(`${origin}${next}`);

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

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
        console.error('[auth/confirm] verifyOtp failed:', error.message);
        // セッションなしで next に飛ばす → update-password 側が「リンクが無効」表示を出す
        return NextResponse.redirect(`${origin}${next}`);
    }

    return response;
}
