import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // @ts-ignore
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            // @ts-ignore
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
       // リダイレクト先に origin を含めることで絶対パスにする
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // エラー時などはログインページへ戻す
  return NextResponse.redirect(`${origin}/login?error=Could not login with code`);
}
