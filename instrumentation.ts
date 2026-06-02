/**
 * v1.0 工程表 4.1: Sentry 設定（Next.js instrumentation）
 *
 * @sentry/nextjs v8+ では instrumentation.ts でサーバー/エッジの初期化を行う。
 * クライアント側は sentry.client.config.ts。
 */
import * as Sentry from '@sentry/nextjs';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await import('./sentry.server.config');
    }
    if (process.env.NEXT_RUNTIME === 'edge') {
        await import('./sentry.edge.config');
    }
}

export const onRequestError = Sentry.captureRequestError;
