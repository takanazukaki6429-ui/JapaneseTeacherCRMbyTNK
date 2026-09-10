/**
 * 管理者判定の集約モジュール
 *
 * これまで sidebar.tsx / admin/invite-codes/page.tsx に重複ハードコードされていた
 * ADMIN_EMAILS を一元化する。
 */

export const ADMIN_EMAILS = [
    'pommetann@gmail.com',
    'takanazukaki6429@gmail.com',
    'takanazukaki@icloud.com',   // かずきの主アカウント（2026-09-11 追加。gmail も残す）
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return (ADMIN_EMAILS as readonly string[]).includes(email);
}
