/**
 * 管理者権限接続（service_role）
 *
 * RLSを迂回してDBを直接読み書きできる、サーバ専用のSupabase接続。
 * 用途: Stripe webhook反映・招待コード検証/発行・監査ログ書き込み・退会処理。
 *
 * 絶対条件:
 *   - このモジュールを 'use client' なファイルや src/components から import しない
 *     （SUPABASE_SERVICE_ROLE_KEY は NEXT_PUBLIC_ ではないためビルドには混入しないが、
 *       import した時点でサーバ専用コードの境界が崩れる）
 *   - 呼び出し側で必ず認証・認可チェックを済ませてから使う（RLSが効かないため）
 */

import 'server-only';
import { createClient as createSupabaseClient, SupabaseClient } from '@supabase/supabase-js';

export function createAdminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error(
            'SUPABASE_SERVICE_ROLE_KEY が未設定です。Vercelの環境変数（および .env.local）に設定してください。'
        );
    }

    return createSupabaseClient(url, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
