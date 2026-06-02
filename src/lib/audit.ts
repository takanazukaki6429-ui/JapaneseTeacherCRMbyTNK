/**
 * v1.0 工程表 4.13: 監査ログヘルパー
 *
 * 使い方:
 *   import { logAudit } from '@/lib/audit';
 *   await logAudit({
 *       action: 'auth.signup',
 *       actorUserId: user.id,
 *       actorEmail: user.email,
 *       req,
 *       outcome: 'success',
 *       metadata: { inviteCode: '...' },
 *   });
 *
 * 非同期で実行・失敗してもメイン処理を止めない（fire-and-forget）。
 */

import { createClient } from '@/lib/supabase/server';

export type AuditAction =
    | 'auth.signup'
    | 'auth.login'
    | 'auth.logout'
    | 'auth.password_reset'
    | 'auth.mfa_enroll'
    | 'auth.mfa_verify'
    | 'account.delete_requested'
    | 'account.deleted'
    | 'student.create'
    | 'student.update'
    | 'student.delete'
    | 'lesson.create'
    | 'lesson.update'
    | 'lesson.delete'
    | 'ai.generate_material'
    | 'ai.generate_feedback'
    | 'ai.transcribe'
    | 'ai.translate'
    | 'invite_code.create'
    | 'invite_code.use'
    | 'admin.access'
    | 'stripe.checkout_initiated'
    | 'stripe.subscription_changed'
    | 'security.rate_limit_exceeded'
    | 'security.invalid_input';

export type LogAuditInput = {
    action: AuditAction;
    actorUserId?: string | null;
    actorEmail?: string | null;
    resourceType?: string;
    resourceId?: string;
    outcome?: 'success' | 'failure';
    metadata?: Record<string, unknown>;
    req?: Request;
};

export async function logAudit(input: LogAuditInput): Promise<void> {
    try {
        const supabase = await createClient();

        const ip = input.req
            ? (input.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               input.req.headers.get('x-real-ip') || null)
            : null;
        const userAgent = input.req
            ? input.req.headers.get('user-agent') || null
            : null;

        const { error } = await supabase.from('audit_logs').insert({
            actor_user_id: input.actorUserId || null,
            actor_email: input.actorEmail || null,
            ip,
            user_agent: userAgent,
            action: input.action,
            resource_type: input.resourceType || null,
            resource_id: input.resourceId || null,
            outcome: input.outcome || 'success',
            metadata: input.metadata || {},
        });

        if (error) {
            // 監査ログ失敗はメイン処理を止めない・コンソールに残すのみ
            console.error('[audit] insert failed:', error.message);
        }
    } catch (e) {
        console.error('[audit] unexpected error:', e);
    }
}
