/**
 * v1.0 工程表 4.11: パスワード強度ポリシー
 *
 * 要件定義書 v1.0 §4.2.1（セキュリティL2）:
 *   - 8文字以上
 *   - 大文字・小文字・数字・記号のうち3種類以上を含む
 *
 * フロントエンド（signup フォーム）とサーバーサイド（signup API）の両方で利用。
 */

export type PasswordCheckResult = {
    valid: boolean;
    score: 0 | 1 | 2 | 3 | 4;  // 0:弱い 〜 4:非常に強い
    errors: string[];
    suggestions: string[];
};

const MIN_LENGTH = 8;
const REQUIRED_CHAR_KINDS = 3;

const COMMON_WEAK_PASSWORDS = new Set([
    'password', '12345678', 'qwertyui', 'aichan12', 'asta2026',
    'japanese', 'teacher12', 'admin123', '11111111', 'iloveyou',
]);

export function checkPasswordStrength(password: string): PasswordCheckResult {
    const errors: string[] = [];
    const suggestions: string[] = [];

    // 1. 長さチェック
    if (password.length < MIN_LENGTH) {
        errors.push(`パスワードは${MIN_LENGTH}文字以上にしてください（現在: ${password.length}文字）`);
    }

    // 2. 文字種類カウント
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

    const kindCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

    if (kindCount < REQUIRED_CHAR_KINDS) {
        errors.push(`英大文字・英小文字・数字・記号のうち、${REQUIRED_CHAR_KINDS}種類以上を含めてください（現在: ${kindCount}種類）`);
        if (!hasUpper) suggestions.push('大文字を追加');
        if (!hasDigit) suggestions.push('数字を追加');
        if (!hasSymbol) suggestions.push('記号（!@# など）を追加');
    }

    // 3. 既知の弱パスワード辞書チェック
    if (COMMON_WEAK_PASSWORDS.has(password.toLowerCase())) {
        errors.push('よく使われる弱いパスワードです。別の組み合わせにしてください');
    }

    // 4. 単純な繰り返し・連番チェック
    if (/^(.)\1+$/.test(password)) {
        errors.push('同じ文字の繰り返しは使えません');
    }
    if (/(?:0123|1234|2345|3456|4567|5678|6789|abcd|bcde|cdef|qwer)/i.test(password)) {
        errors.push('連続した文字列（1234, abcd など）は推測されやすいです');
        suggestions.push('連続文字を避けて、より複雑な組み合わせに');
    }

    // 5. スコア計算（0-4）
    let score: PasswordCheckResult['score'] = 0;
    if (password.length >= MIN_LENGTH) score++;
    if (password.length >= 12) score++;
    if (kindCount >= REQUIRED_CHAR_KINDS) score++;
    if (kindCount === 4) score++;
    score = Math.min(4, score) as PasswordCheckResult['score'];

    return {
        valid: errors.length === 0,
        score,
        errors,
        suggestions,
    };
}

/**
 * UI表示用：強度ラベルと色
 */
export function getStrengthLabel(score: PasswordCheckResult['score']): { label: string; color: string } {
    switch (score) {
        case 0: return { label: '非常に弱い', color: '#ba1a1a' };
        case 1: return { label: '弱い',       color: '#e67700' };
        case 2: return { label: '普通',       color: '#bf8700' };
        case 3: return { label: '強い',       color: '#1a7f37' };
        case 4: return { label: '非常に強い', color: '#0d5e2a' };
    }
}
