/**
 * v1.0 工程表 4.14: APIレート制限
 *
 * 要件定義書 v1.0 §4.2.1 セキュリティL2: 「APIレート制限」
 *
 * 実装方針:
 *   - Vercel Edge runtime / Node.js runtime の両対応
 *   - in-memory LRU + TTL（Phase 1 MVP）
 *   - 本格運用は Upstash Redis に移行（Phase 4 セキュリティL3）
 *
 * 制約:
 *   - Vercel の複数インスタンスでは状態が共有されない
 *   - 単一インスタンス内では確実に効く
 *   - DDoS本格対策は Cloudflare 等の前段で吸収する前提
 */

type Bucket = {
    count: number;
    resetAt: number; // epoch ms
};

// scope ごとに別のMapを持つ
const buckets = new Map<string, Map<string, Bucket>>();

const MAX_KEYS_PER_SCOPE = 10_000; // メモリ暴走防止

function getBucketStore(scope: string): Map<string, Bucket> {
    let store = buckets.get(scope);
    if (!store) {
        store = new Map();
        buckets.set(scope, store);
    }
    return store;
}

function pruneExpired(store: Map<string, Bucket>, now: number) {
    if (store.size < MAX_KEYS_PER_SCOPE) return;
    // LRU的に古いものから削除
    for (const [key, bucket] of store) {
        if (bucket.resetAt <= now) store.delete(key);
        if (store.size < MAX_KEYS_PER_SCOPE * 0.8) break;
    }
}

export type RateLimitOptions = {
    /** スコープ名（エンドポイント単位で異なる制限を設定） */
    scope: string;
    /** 期間内の最大リクエスト数 */
    limit: number;
    /** 期間（ミリ秒） */
    windowMs: number;
};

export type RateLimitResult = {
    allowed: boolean;
    remaining: number;
    retryAfterSec: number;
    resetAt: Date;
};

export function checkRateLimit(
    identifier: string,
    options: RateLimitOptions
): RateLimitResult {
    const now = Date.now();
    const store = getBucketStore(options.scope);

    pruneExpired(store, now);

    const bucket = store.get(identifier);

    if (!bucket || bucket.resetAt <= now) {
        // 新しいウィンドウ
        const newBucket: Bucket = {
            count: 1,
            resetAt: now + options.windowMs,
        };
        store.set(identifier, newBucket);
        return {
            allowed: true,
            remaining: options.limit - 1,
            retryAfterSec: Math.ceil(options.windowMs / 1000),
            resetAt: new Date(newBucket.resetAt),
        };
    }

    if (bucket.count >= options.limit) {
        return {
            allowed: false,
            remaining: 0,
            retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
            resetAt: new Date(bucket.resetAt),
        };
    }

    bucket.count += 1;
    return {
        allowed: true,
        remaining: options.limit - bucket.count,
        retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000),
        resetAt: new Date(bucket.resetAt),
    };
}

/**
 * リクエストから識別子を抽出（IP優先・認証済みならuser-idも併用）
 */
export function getRequestIdentifier(req: Request): string {
    // Vercel Edge / Node が設定するヘッダー
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
    return ip;
}

/**
 * 各エンドポイント向けプリセット
 */
export const RATE_LIMIT_PRESETS = {
    /** 認証関連（signup/login）: 5回/分 */
    AUTH:     { limit: 5,  windowMs: 60_000 },
    /** AI生成系（教材・翻訳・フィードバック）: 30回/分 */
    AI:       { limit: 30, windowMs: 60_000 },
    /** 通常API: 60回/分 */
    GENERAL:  { limit: 60, windowMs: 60_000 },
    /** ヘビー処理（DALL-E画像生成・STT）: 10回/分 */
    HEAVY:    { limit: 10, windowMs: 60_000 },
} as const;
