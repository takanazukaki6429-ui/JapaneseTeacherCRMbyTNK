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
 *   - Stripe の契約は、削除の前にその場で止める（2026-10-09 かずき決定・lib/account-deletion.ts）。
 *     止められなかった時は削除をやめる（契約だけが残り、消した先生に課金されるのを防ぐ）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, getRequestIdentifier } from '@/lib/rate-limit';
import { getStripe } from '@/lib/stripe';
import { DELETED_ACCOUNT_METADATA_KEY, isAlreadyStopped, subscriptionToCancel } from '@/lib/account-deletion';

/** 契約をその場で止める。もう止まっている時も 'stopped'。止められなかった時だけ 'failed' */
async function stopSubscription(subscriptionId: string): Promise<'stopped' | 'failed'> {
    const stripe = getStripe();
    try {
        await stripe.subscriptions.cancel(subscriptionId);
        return 'stopped';
    } catch (err) {
        // もう止まっている・Stripe に無い時は、止める物が無いので先へ進める
        try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            if (isAlreadyStopped(sub.status)) return 'stopped';
        } catch (e) {
            if ((e as { code?: string })?.code === 'resource_missing') return 'stopped';
        }
        console.error('[account-delete] 契約を止められませんでした', err instanceof Error ? err.message : err);
        return 'failed';
    }
}

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

    // 契約がまだ動いていれば、消す前に Stripe の契約をその場で止める（2026-10-09 かずき決定）。
    // お試し中も止める（止めないと8日目に、消した先生のカードに課金される）。契約中の先生は残りの日数の返金なし（規約 第6条）
    const { data: billing } = await supabase
        .from('user_settings')
        .select('subscription_status, stripe_subscription_id, stripe_customer_id')
        .eq('user_id', userId)
        .maybeSingle();

    const subscriptionId = subscriptionToCancel(billing);
    if (subscriptionId && (await stopSubscription(subscriptionId)) === 'failed') {
        await logAudit({
            action: 'account.deleted',
            actorUserId: userId,
            actorEmail: userEmail,
            outcome: 'failure',
            metadata: { reason: 'stripe subscription cancel failed', subscriptionId },
            req,
        });
        return NextResponse.json({
            error: '契約を止められなかったため、アカウントの削除をやめました。時間をおいて、もう一度お試しください。'
        }, { status: 502 });
    }

    // 消した後に届く Stripe の通知を、通知の受け口が失敗扱いにしないよう、客に「削除済み」の印を付ける（失敗しても削除は続ける）
    const customerId = (billing as { stripe_customer_id?: string | null } | null)?.stripe_customer_id;
    if (customerId) {
        try {
            await getStripe().customers.update(customerId, { metadata: { [DELETED_ACCOUNT_METADATA_KEY]: new Date().toISOString() } });
        } catch (err) {
            console.error('[account-delete] 客の印を付けられませんでした', err instanceof Error ? err.message : err);
        }
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
