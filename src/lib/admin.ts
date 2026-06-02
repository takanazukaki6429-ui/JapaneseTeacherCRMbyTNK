/**
 * 管理者判定の集約モジュール
 *
 * これまで sidebar.tsx / admin/invite-codes/page.tsx に重複ハードコードされていた
 * ADMIN_EMAILS を一元化する。
 */

export const ADMIN_EMAILS = [
    'pommetann@gmail.com',
    'takanazukaki6429@gmail.com',
] as const;

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return (ADMIN_EMAILS as readonly string[]).includes(email);
}
