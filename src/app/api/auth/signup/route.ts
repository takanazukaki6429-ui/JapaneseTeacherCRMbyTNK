import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { z } from 'zod';
import { checkPasswordStrength } from '@/lib/password-policy';
import { checkRateLimit, getRequestIdentifier } from '@/lib/rate-limit';
import { logAudit } from '@/lib/audit';
import { notifyAdmin } from '@/lib/notify';
import { formatJpDate, normalizeCourseEndDate, normalizeCourseMonths } from '@/lib/course';
import { AUDIENCE_LABEL, normalizeAudience } from '@/lib/audience';
import { inviteCodeRejection } from '@/lib/invite-code';

type CodeRow = {
    id: string;
    used_at: string | null;
    expires_at: string | null;
    revoked_at?: string | null;
    email?: string | null;
    audience?: string | null;
    course_months?: number | null;
    course_end_date?: string | null;
};

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
        //    受講生・卒業生・一般の区分、コース、紐づけたメールアドレス、取り消しを読む（2026-10-06・10-07）。
        //    列がまだ無い保管庫では、列を減らして読み直す
        const CODE_COLUMNS = [
            'id, used_at, expires_at, revoked_at, email, audience, course_months, course_end_date',
            'id, used_at, expires_at, course_months, course_end_date',
            'id, used_at, expires_at',
        ];
        let codeData: CodeRow | null = null;
        let hasRevokedColumn = false;
        for (const [i, columns] of CODE_COLUMNS.entries()) {
            const { data, error } = await supabase.from('invite_codes').select(columns).eq('code', inviteCode).maybeSingle();
            if (!error) {
                codeData = data as unknown as CodeRow | null;
                hasRevokedColumn = i === 0;
                break;
            }
            if (!/column|schema cache/i.test(error.message ?? '')) break;
        }

        if (!codeData) {
            return NextResponse.json({ error: '無効な招待コードです。もう一度ご確認ください。' }, { status: 400 });
        }

        // 使用済み・取り消し・期限切れ・別のメールアドレス用のコードは使えない（lib/invite-code.ts）
        const rejection = inviteCodeRejection(codeData, email);
        if (rejection) {
            return NextResponse.json({ error: rejection }, { status: 400 });
        }

        // 2. 先にコードを消し込む（同じコードでの同時登録レースを防ぐ。
        //    used_at IS NULL 条件付き更新なので、2人同時でも勝者は1人だけになる）
        let claimQuery = supabase
            .from('invite_codes')
            .update({ used_at: new Date().toISOString() })
            .eq('id', codeData.id)
            .is('used_at', null);
        if (hasRevokedColumn) claimQuery = claimQuery.is('revoked_at', null);
        const { data: claimed, error: claimError } = await claimQuery.select('id');

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

        // 5. 先生の設定に、区分（一般・受講生・卒業生）とコースを写す（先生の設定の行は、登録と同時に保管庫の仕組みで作られている）。
        //    受講生はコースが終わる日まで無料（lib/course.ts）。どちらの料金で申し込むかは lib/audience.ts
        const audience = normalizeAudience(codeData.audience ?? null);
        const courseEndDate = normalizeCourseEndDate(codeData.course_end_date ?? null);
        const courseMonths = normalizeCourseMonths(codeData.course_months ?? null);
        const settingsUpdate: Record<string, unknown> = {};
        if (audience) settingsUpdate.audience = audience;
        if (courseEndDate) {
            settingsUpdate.course_end_date = courseEndDate;
            settingsUpdate.course_months = courseMonths;
        }
        let courseNote = audience ? `\n区分：${AUDIENCE_LABEL[audience]}` : '';
        if (Object.keys(settingsUpdate).length > 0) {
            const { error: courseError } = await supabase
                .from('user_settings')
                .update(settingsUpdate)
                .eq('user_id', newUserId);
            if (courseError) {
                console.error('Failed to set audience/course:', courseError);
                courseNote += `\n⚠️ 区分・受講中の設定に失敗しました（${courseError.message}）。管理画面の招待コードで、コースを入れ直してください`;
            } else if (courseEndDate) {
                courseNote += `\n受講中：${courseMonths ? `${courseMonths}か月コース・` : ''}${formatJpDate(courseEndDate)}まで無料`;
            }
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

        // 運営者（かずき）へ通知：招待コードで新しい先生が登録した＝売上の動き（2026-09-11）
        await notifyAdmin({
            level: 'info',
            title: '新しい先生が登録しました',
            body: `メール: ${email}\n招待コード: ${inviteCode}${courseNote}`,
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
