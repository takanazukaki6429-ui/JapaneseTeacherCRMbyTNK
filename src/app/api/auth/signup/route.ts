import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { checkPasswordStrength } from '@/lib/password-policy';
import { checkRateLimit, getRequestIdentifier } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';

const signUpSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),  // v1.0 §4.2.1 セキュリティL2: 最低8文字
    inviteCode: z.string().min(1, '招待コードを入力してください')
});

export async function POST(req: NextRequest) {
    try {
        // v1.0 §4.14 APIレート制限: 認証エンドポイントは厳しめ（5回/分/IP）
        const rateLimit = checkRateLimit(getRequestIdentifier(req), {
            limit: 5,
            windowMs: 60_000,
            scope: 'auth:signup',
        });
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: '短時間に多くのリクエストがありました。しばらく待ってからお試しください。' },
                { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfterSec) } }
            );
        }

        const body = await req.json();
        const { email, password, inviteCode } = signUpSchema.parse(body);

        // v1.0 §4.11 パスワード強度ポリシー: 8文字以上＋3種類以上＋辞書チェック
        const pwCheck = checkPasswordStrength(password);
        if (!pwCheck.valid) {
            return NextResponse.json(
                { error: pwCheck.errors[0], details: pwCheck.errors },
                { status: 400 }
            );
        }

        // 招待コードの検証・消込・ユーザー作成はすべて管理者権限接続で行う。
        // 匿名のRLSポリシー（誰でも閲覧・更新可）は廃止済みのため、この経路が唯一の登録口。
        const supabase = createAdminClient();

        // 1. Verify Invite Code
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

        if (codeData.expires_at) {
            const expDate = new Date(codeData.expires_at);
            if (expDate < new Date()) {
                return NextResponse.json({ error: 'この招待コードは有効期限切れです。コンサルタントに再発行を依頼してください。' }, { status: 400 });
            }
        }

        // 2. 先にコードを消し込む（同じコードでの同時登録レースを防ぐ。
        //    used_at IS NULL 条件付き更新なので、2人同時でも勝者は1人だけになる）
        const { data: claimed, error: claimError } = await supabase
            .from('invite_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('id', codeData.id)
            .is('used_at', null)
            .select('id');

        if (claimError || !claimed || claimed.length === 0) {
            return NextResponse.json({ error: 'この招待コードは既に使用されています。' }, { status: 400 });
        }

        // 3. ユーザー作成（管理者API経由）。
        //    ダッシュボード側で一般の新規登録を無効化しても、この経路は影響を受けない。
        //    メール認証は実質OFF運用のため email_confirm: true で即ログイン可能にする
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });

        if (authError || !authData.user) {
            // 作成に失敗したらコードの消込を戻す（コードを無駄にしない）
            await supabase
                .from('invite_codes')
                .update({ used_at: null, used_by: null })
                .eq('id', codeData.id);

            if (authError) {
                console.error('Auth Create User Error', authError);
                const isDuplicate =
                    authError.code === 'email_exists' ||
                    /already/i.test(authError.message);
                return NextResponse.json(
                    { error: isDuplicate
                        ? 'このメールアドレスは既に登録されています。ログインをお試しください。'
                        : 'ユーザー登録に失敗しました。時間をおいて再度お試しください。' },
                    { status: 400 }
                );
            }
            return NextResponse.json({ error: 'ユーザー登録に失敗しました。' }, { status: 500 });
        }

        const newUserId = authData.user.id;

        // 4. 消込済みコードに使用者を紐付け
        const { error: markError } = await supabase
            .from('invite_codes')
            .update({ used_by: newUserId })
            .eq('id', codeData.id);

        if (markError) {
            console.error('Failed to link code to user:', markError);
        }

        // v1.0 §4.13 監査ログ: signup成功を記録
        await logAudit({
            action: 'auth.signup',
            actorUserId: newUserId,
            actorEmail: email,
            resourceType: 'invite_code',
            resourceId: codeData.id,
            outcome: 'success',
            req,
        });

        return NextResponse.json({
            success: true,
            message: 'アカウント作成が完了しました。ログイン画面からログインしてください。'
        });

    } catch (error) {
        console.error('API /api/auth/signup error:', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: '入力内容に誤りがあります。' }, { status: 400 });
        }
        return NextResponse.json(
            { error: 'サーバーエラーが発生しました' },
            { status: 500 }
        );
    }
}
