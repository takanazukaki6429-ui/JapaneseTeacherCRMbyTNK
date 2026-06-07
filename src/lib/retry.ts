/**
 * v1.0 工程表 4.5: 自動リトライ・フォールバック
 *
 * 要件定義書 v1.0 §4.1.4:
 *   - API失敗時の自動リトライ
 *   - フォールバック（Claude API失敗→代替モデル）
 *   - 指数バックオフ
 *
 * 外部API（Gemini / Claude / OpenAI / Google Cloud）呼び出しを堅牢化する。
 */

import * as Sentry from '@sentry/nextjs';

export type RetryOptions = {
    /** 最大リトライ回数（初回を除く） */
    maxRetries?: number;
    /** 初回待機ミリ秒（指数バックオフのベース） */
    baseDelayMs?: number;
    /** 最大待機ミリ秒 */
    maxDelayMs?: number;
    /** リトライ対象か判定（false を返すと即時 throw） */
    shouldRetry?: (error: unknown) => boolean;
    /** ラベル（ログ用） */
    label?: string;
};

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'shouldRetry' | 'label'>> = {
    maxRetries: 3,
    baseDelayMs: 500,
    maxDelayMs: 8000,
};

function defaultShouldRetry(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    // 一時的なエラー（5xx / レート / タイムアウト / ネットワーク）のみリトライ
    return /429|500|502|503|504|timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed|overloaded|rate limit/i.test(msg);
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 指数バックオフ付きリトライ
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const shouldRetry = options.shouldRetry ?? defaultShouldRetry;
    const label = options.label ?? 'api-call';

    let lastError: unknown;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === opts.maxRetries || !shouldRetry(error)) {
                break;
            }

            // 指数バックオフ + ジッター
            const expDelay = Math.min(
                opts.baseDelayMs * Math.pow(2, attempt),
                opts.maxDelayMs
            );
            const jitter = expDelay * 0.2 * Math.random();
            const delay = Math.round(expDelay + jitter);

            console.warn(`[retry] ${label} attempt ${attempt + 1}/${opts.maxRetries} failed, retrying in ${delay}ms`);
            await sleep(delay);
        }
    }

    // 全リトライ失敗 → Sentry に記録して throw
    Sentry.captureException(lastError, {
        tags: { retry_label: label, retry_exhausted: 'true' },
    });
    throw lastError;
}

/**
 * プライマリ関数が失敗したらフォールバック関数を実行
 *
 * 例: Gemini で失敗 → Claude にフォールバック
 */
export async function withFallback<T>(
    primary: () => Promise<T>,
    fallback: () => Promise<T>,
    label = 'ai-fallback'
): Promise<T> {
    try {
        return await primary();
    } catch (primaryError) {
        console.warn(`[fallback] ${label} primary failed, switching to fallback:`,
            primaryError instanceof Error ? primaryError.message : primaryError);
        Sentry.captureMessage(`Fallback triggered: ${label}`, {
            level: 'warning',
            tags: { fallback_label: label },
        });
        try {
            return await fallback();
        } catch (fallbackError) {
            // 両方失敗 → 重大エラー
            Sentry.captureException(fallbackError, {
                tags: { fallback_label: label, both_failed: 'true' },
            });
            throw fallbackError;
        }
    }
}
