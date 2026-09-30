/**
 * 二段階認証（2026-09-30・Stripe のセキュリティ・チェックリストの申告を事実に合わせる）
 *
 * 決まり：
 *   - 二段階認証を登録した人は、ログインのあと6桁のコードを入れるまで（aal2 になるまで）、画面にもAPIにも進めない
 *   - 管理者の画面（/admin・/api/admin）は、コードを入れた人（aal2）だけ。二段階認証を登録していない管理者は設定の画面へ案内する
 * 「コードがまだ」の条件は Supabase の説明のとおり（nextLevel が aal2 で、currentLevel と違う）
 * 保管庫の側でも、登録した人の aal1 では読み書きできない方針をかける
 * （03_japanese-teacher-crm/strategy/sql_2026-09-30_二段階認証を保管庫でも必須に.sql）。門番を通らない呼び出しもふさぐため
 *
 * ここは判定だけの純粋な関数（テスト対象）。Supabase の呼び出しは呼ぶ側で行う。
 */

/** Supabase の getAuthenticatorAssuranceLevel() が返す形のうち、使う所だけ */
export type AalInfo = { currentLevel: string | null; nextLevel: string | null };

export type MfaDecision =
    | 'pass'                  // そのまま通す
    | 'verify-page'           // 6桁のコードの画面へ案内する
    | 'verify-api'            // API は 401（コードがまだ）
    | 'admin-setup-page'      // 管理者の画面：二段階認証を登録していない → 設定の画面へ案内する
    | 'admin-api-forbidden';  // 管理者のAPI：aal2 でなければ 403

/** 6桁のコードを入れる画面 */
export const MFA_VERIFY_PATH = '/login/mfa';

/** 管理者だけが使う画面・API */
export function isAdminPath(path: string): boolean {
    return path === '/admin' || path.startsWith('/admin/') || path === '/api/admin' || path.startsWith('/api/admin/');
}

/** 二段階認証を登録しているのに、まだコードを入れていないか */
export function needsMfaCode(aal: AalInfo | null | undefined): boolean {
    return !!aal && aal.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel;
}

/**
 * ログインしている人の、この道を通してよいか。
 * 公開の画面（ログイン・料金・規約・6桁のコードの画面など）は判定しない。
 * aal が取れなかったときは、ふつうの画面は通し（保管庫の方針が最後の守り）、管理者の画面は通さない
 */
export function decideMfa(path: string, isPublicRoute: boolean, aal: AalInfo | null | undefined): MfaDecision {
    if (isPublicRoute) return 'pass';
    const isApi = path.startsWith('/api/');
    if (needsMfaCode(aal)) return isApi ? 'verify-api' : 'verify-page';
    if (isAdminPath(path) && aal?.currentLevel !== 'aal2') return isApi ? 'admin-api-forbidden' : 'admin-setup-page';
    return 'pass';
}

/** コードを入れた後に戻る先。自分のサイトの中の道だけ（外のサイトへ飛ばされないように） */
export function safeNextPath(raw: string | null | undefined): string {
    if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return '/';
    if (raw === MFA_VERIFY_PATH || raw.startsWith(`${MFA_VERIFY_PATH}?`) || raw.startsWith('/login')) return '/';
    return raw;
}
