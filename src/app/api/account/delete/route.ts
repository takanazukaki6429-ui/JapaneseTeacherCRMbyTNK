/**
 * v1.0 工程表 4.16: 個人情報削除機能
 *
 * 個人情報保護法第34条「保有個人データの利用停止・消去等」に基づく削除フロー。
 *
 * 削除対象:
 *   - auth.users（Supabase Auth）
 *   - user_settings, students, lessons, materials, generated_materials, invite_codes（自分作成分）
 *   - その他、user_id / teacher_id / author_id で紐付くデータ
 *
 * 削除に関する重要事項:
 *   - 監査ログ（audit_logs.actor_user_id）は SET NULL なので削除されない（法的記録維持）
 *   - 削除完了まで非同期にならない（即時削除を保証）
 *   - Stripe Subscriptionは別途キャンセル必要（本実装では active なら 400）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getRequestIdentifier } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
    // 強めのレート制限（アカウント削除は誤操作対策）
    const rate = checkRateLimit(getRequestIdentifier(req), {
        limit: 3, windowMs: 60_000, scope: 'account:delete',
    });
    if (!rate.allowed) {
        return NextResponse.json(
            { error: 'リクエストが多すぎます。1分後に再度お試しください。' },
            { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
        );
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const userId = user.id;
    const userEmail = user.email || null;

    // 削除リクエスト監査ログ
    await logAudit({
        action: 'account.delete_requested',
        actorUserId: userId,
        actorEmail: userEmail,
        req,
    });

    // 有効なサブスクがある場合はキャンセル誘導
    try {
        const { data: settings } = await supabase
            .from('user_settings')
            .select('subscription_status, stripe_subscription_id, is_free')
            .eq('user_id', userId)
            .single();

        if (settings?.subscription_status === 'active' && !settings.is_free) {
            return NextResponse.json({
                error: 'アクティブなサブスクリプションがあります。先に「プラン」ページから解約してください。'
            }, { status: 400 });
        }
    } catch {
        // user_settings がなくても削除は続行
    }

    // 紐付くテーブルを順に削除。RLSに阻まれないよう管理者権限接続で行う
    // （userIdは認証済みセッションから取得しているため、他人のデータを消す経路にはならない）
    const admin = createAdminClient();
    const errors: string[] = [];
    const cascadeTables = [
        'generated_materials',     // teacher_id
        'lessons',                 // user_id
        'students',                // user_id
        'materials',               // author_id
        'lesson_chat_logs',        // user_id
        'user_settings',           // user_id
        'invite_codes',            // created_by（自分が発行したコード。used_byはFKのSET NULLに任せる）
    ];

    for (const table of cascadeTables) {
        try {
            const userColumn =
                table === 'generated_materials' ? 'teacher_id' :
                table === 'materials' ? 'author_id' :
                table === 'invite_codes' ? 'created_by' :
                'user_id';
            const { error } = await admin.from(table).delete().eq(userColumn, userId);
            if (error && !/does not exist|column/i.test(error.message)) {
                errors.push(`${table}: ${error.message}`);
            }
        } catch (e) {
            errors.push(`${table}: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    // セッションを無効化してから、ログイン情報（auth.users）本体を削除。
    // ここを消さないと「削除しました」表示後も再ログインできてしまう（退会が退会にならない）
    await supabase.auth.signOut();

    try {
        const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId);
        if (deleteUserError) {
            errors.push(`auth.users: ${deleteUserError.message}`);
        }
    } catch (e) {
        errors.push(`auth.users: ${e instanceof Error ? e.message : String(e)}`);
    }

    // 完了監査ログ（auth.users削除済みのためactor_user_idは残さず、actor_emailで追跡）
    await logAudit({
        action: 'account.deleted',
        actorUserId: null,
        actorEmail: userEmail,
        outcome: errors.length === 0 ? 'success' : 'failure',
        metadata: errors.length > 0 ? { errors, userId } : { userId },
        req,
    });

    if (errors.length > 0) {
        return NextResponse.json({
            success: false,
            message: 'データの一部削除に失敗しました。サポートまでお問い合わせください。',
            errors,
        }, { status: 500 });
    }

    return NextResponse.json({
        success: true,
        message: 'アカウントを削除しました。ご利用ありがとうございました。',
    });
}
