/**
 * v1.0 工程表 4.3/4.4: 運営者向け通知（メール）
 *
 * 要件定義書 v1.0 §4.1.3: LINE Notify → サービス終了のためメール通知に縮退
 *
 * 実装方針:
 *   - Resend（RESEND_API_KEY があれば）でメール送信
 *   - キー未設定時は console.error にフォールバック（開発・未設定環境で落ちない）
 *   - 将来 Discord/Slack Webhook を足す場合はここに分岐を追加
 */

const ADMIN_NOTIFY_EMAIL = process.env.ADMIN_NOTIFY_EMAIL || 'takanazukaki6429@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || 'ASTA Alerts <onboarding@resend.dev>';

export type NotifyLevel = 'info' | 'warning' | 'critical';

export type NotifyInput = {
    level: NotifyLevel;
    title: string;
    body: string;
    /** 追加コンテキスト（JSON整形して本文に付与） */
    context?: Record<string, unknown>;
};

const LEVEL_EMOJI: Record<NotifyLevel, string> = {
    info: 'ℹ️',
    warning: '⚠️',
    critical: '🚨',
};

/**
 * 運営者（かずき）に通知を送る。失敗してもメイン処理は止めない。
 */
export async function notifyAdmin(input: NotifyInput): Promise<void> {
    const subject = `${LEVEL_EMOJI[input.level]} [ASTA/${input.level.toUpperCase()}] ${input.title}`;
    const contextStr = input.context
        ? `\n\n--- Context ---\n${JSON.stringify(input.context, null, 2)}`
        : '';
    const fullBody = `${input.body}${contextStr}\n\n--\nASTA 運用監視\n${new Date().toISOString()}`;

    // Resend 未設定時はログのみ（開発環境・未設定環境で例外を出さない）
    if (!RESEND_API_KEY) {
        console.warn(`[notify:${input.level}] ${input.title}\n${fullBody}`);
        return;
    }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: RESEND_FROM,
                to: [ADMIN_NOTIFY_EMAIL],
                subject,
                text: fullBody,
            }),
        });
        if (!res.ok) {
            console.error(`[notify] Resend failed: HTTP ${res.status}`, await res.text());
        }
    } catch (e) {
        console.error('[notify] unexpected error:', e);
    }
}
