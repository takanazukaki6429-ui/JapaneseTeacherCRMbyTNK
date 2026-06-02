/**
 * v1.0 工程表 4.18: AI送信前マスキング
 *
 * 要件定義書 v1.0 §4.2.1:
 *   「AIサービスへの送信前マスキング（質に影響しない範囲で）」
 *
 * 目的: Gemini / Claude / OpenAI に送信するプロンプトから個人識別子を自動除去
 *
 * マスキング対象:
 *   - メールアドレス
 *   - 電話番号（日本式・国際）
 *   - クレジットカード番号
 *   - URL内のトークン
 *
 * マスキングしない（教材生成の質に影響する）:
 *   - 国籍
 *   - 学習目的
 *   - JLPTレベル
 *   - 生徒の氏名（呼びかけ生成には必要）→ 別途オプション
 */

export type MaskOptions = {
    /** 氏名もマスクする（教材本文に出さないなら true） */
    maskNames?: boolean;
    /** マスク対象の氏名リスト（DB から取得） */
    knownNames?: string[];
};

// 正規表現パターン
const PATTERNS = {
    email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    phoneJP: /(?:\+81|0)\d{1,4}[\s\-]?\d{1,4}[\s\-]?\d{3,4}/g,
    creditCard: /\b(?:\d[ -]?){13,19}\b/g,
    // bearer トークン・APIキー風文字列
    apiKey: /\b(?:sk-[a-zA-Z0-9_-]{20,}|AIza[a-zA-Z0-9_-]{30,}|Bearer\s+[a-zA-Z0-9._-]{20,})\b/g,
};

/**
 * テキストから個人識別情報をマスク
 */
export function maskPII(text: string, opts: MaskOptions = {}): string {
    if (!text) return text;

    let result = text;

    // メール → [EMAIL]
    result = result.replace(PATTERNS.email, '[EMAIL]');

    // 電話 → [PHONE]
    result = result.replace(PATTERNS.phoneJP, '[PHONE]');

    // クレカ → [CARD]
    result = result.replace(PATTERNS.creditCard, (match) => {
        // 短すぎる数字列は誤検知のため除外
        const digits = match.replace(/[^\d]/g, '');
        return digits.length >= 13 && digits.length <= 19 ? '[CARD]' : match;
    });

    // APIキー → [API_KEY]
    result = result.replace(PATTERNS.apiKey, '[API_KEY]');

    // 氏名マスキング（オプション・既知の名前リスト）
    if (opts.maskNames && opts.knownNames) {
        for (const name of opts.knownNames) {
            if (name.length < 2) continue;
            const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            result = result.replace(new RegExp(escaped, 'g'), '[NAME]');
        }
    }

    return result;
}

/**
 * オブジェクトを再帰的にマスク（プロンプト構築前の前処理）
 */
export function maskPIIDeep<T>(obj: T, opts: MaskOptions = {}): T {
    if (typeof obj === 'string') {
        return maskPII(obj, opts) as unknown as T;
    }
    if (Array.isArray(obj)) {
        return obj.map(item => maskPIIDeep(item, opts)) as unknown as T;
    }
    if (obj && typeof obj === 'object') {
        const result: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
            result[k] = maskPIIDeep(v, opts);
        }
        return result as T;
    }
    return obj;
}
