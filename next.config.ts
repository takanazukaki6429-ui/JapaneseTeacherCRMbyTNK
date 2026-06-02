import type { NextConfig } from "next";
import withBundleAnalyzer from '@next/bundle-analyzer';

const content = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// ============================================================================
// v1.0 工程表 4.15: セキュリティヘッダー（CSP / HSTS / X-Frame-Options 等）
// ============================================================================
const securityHeaders = [
  // HTTPS強制（max-age = 2年・サブドメイン含む・HSTS Preload）
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // iframe埋め込み禁止（クリックジャッキング対策）
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  // MIMEスニッフィング無効化
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  // Referrer情報の制限
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  // 機能ポリシー（マイク・カメラ・位置情報のうち、必要なものだけ self に許可）
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(), interest-cohort=()',
  },
  // CSP（Content-Security-Policy）
  // 必要な接続先：Supabase / Anthropic / Google / OpenAI / Stripe / Sentry
  // 'unsafe-eval' は Next.js dev 用 / 'unsafe-inline' は Tailwind / lucide-react SVG 用
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com https://*.sentry.io",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https: https://*.openai.com https://oaidalleapiprodscus.blob.core.windows.net",
      "media-src 'self' blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com https://api.stripe.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.de.sentry.io",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self' https://checkout.stripe.com",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    return [
      {
        // 全パスに適用
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(content(nextConfig), {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "nihongo-teacher-crm",
  project: "nihongo-teacher-crm",

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers (increases server load)
  tunnelRoute: "/monitoring",
});
