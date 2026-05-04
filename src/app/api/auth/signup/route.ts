import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const signUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    inviteCode: z.string().min(1, '招待コードを入力してください')
});

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { email, password, inviteCode } = signUpSchema.parse(body);

        const supabase = await createClient();

        // 1. Verify Invite Code
        // We use the service_role client here for administrative DB checks if RLS blocks it,
        // but our current policy "Anyone can view invite codes to check validity" allows standard select.
        const { data: codeData, error: codeError } = await supabase
            .from('invite_codes')
            .select('id, used_at, expires_at')
            .eq('code', inviteCode)
            .single();

        if (codeError || !codeData) {
            return NextResponse.json({ error: '無効な招待コードです。もう一度ご確認ください。' }, { status: 400 });
        }

        if (codeData.used_at !== null) {
            return NextResponse.json({ error: 'この招待コードは既に使用されています。' }, { status: 400 });
        }

        // Optional: Check expiration if expires_at is set
        if (codeData.expires_at) {
            const expDate = new Date(codeData.expires_at);
            if (expDate < new Date()) {
                return NextResponse.json({ error: 'この招待コードは有効期限切れです。コンサルタントに再発行を依頼してください。' }, { status: 400 });
            }
        }

        // 2. Register the user via Supabase Auth
        // NOTE: We cannot easily fetch the new user ID strictly here without calling the admin API if email confirmation is enabled.
        // If email confirmation is ON, supabase.auth.signUp creates an auth.users record, but the JWT is not returned immediately.
        // `signUp` returns the created user object.
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            // You can forward the URL for email confirmation
            options: {
                emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
            },
        });

        if (authError) {
            console.error("Auth Sign Up Error", authError);
            return NextResponse.json({ error: authError.message }, { status: 400 });
        }

        if (!authData.user) {
            return NextResponse.json({ error: 'ユーザー登録に失敗しました。' }, { status: 500 });
        }

        const newUserId = authData.user.id;

        // 3. Mark the invite code as used (anon role, allowed by RLS policy with WITH CHECK (true))
        const { error: markError } = await supabase
            .from('invite_codes')
            .update({
                used_at: new Date().toISOString(),
                used_by: newUserId
            })
            .eq('id', codeData.id)
            .is('used_at', null); // Extra safety check

        if (markError) {
            console.error("Failed to mark code as used:", markError);
        }

        return NextResponse.json({
            success: true,
            message: 'アカウント作成に成功しました。確認メールを送信しました。'
        });

    } catch (error) {
        console.error('API /api/auth/signup error:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: '入力内容に誤りがあります。' }, { status: 400 });
        }
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました', details: String(error) },
            { status: 500 }
        );
    }
}
