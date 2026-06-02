-- ============================================================================
-- v1.0 工程表 4.13: 監査ログ
-- 要件定義書 v1.0 §4.2.1: 「監査ログ（誰がいつ何をアクセスしたか全記録）」
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    -- 主体（誰が）
    actor_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email text,  -- ユーザー削除後も追跡可能なよう email を冗長保存
    -- ip / user-agent（フィンガープリント）
    ip text,
    user_agent text,
    -- 操作種別（何を）
    action text NOT NULL CHECK (action IN (
        'auth.signup',
        'auth.login',
        'auth.logout',
        'auth.password_reset',
        'auth.mfa_enroll',
        'auth.mfa_verify',
        'account.delete_requested',
        'account.deleted',
        'student.create',
        'student.update',
        'student.delete',
        'lesson.create',
        'lesson.update',
        'lesson.delete',
        'ai.generate_material',
        'ai.generate_feedback',
        'ai.transcribe',
        'ai.translate',
        'invite_code.create',
        'invite_code.use',
        'admin.access',
        'stripe.checkout_initiated',
        'stripe.subscription_changed',
        'security.rate_limit_exceeded',
        'security.invalid_input'
    )),
    -- 対象リソース（何に対して）
    resource_type text,
    resource_id text,
    -- 結果（成功/失敗）
    outcome text NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure')),
    -- 詳細情報（JSON: エラーメッセージ・変更前後の差分など）
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor
    ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action
    ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
    ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource
    ON audit_logs(resource_type, resource_id)
    WHERE resource_type IS NOT NULL;

-- RLS: 管理者のみ閲覧可、書き込みは service_role 経由（API側で実施）
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_read"
    ON audit_logs FOR SELECT TO authenticated
    USING (auth.jwt() ->> 'email' = 'takanazukaki6429@gmail.com');

-- INSERT は API側で service_role を使用するため、ここではポリシーを定めない
-- （RLSで明示的に拒否することで誤って anon から書き込まれることを防ぐ）

COMMENT ON TABLE audit_logs IS '監査ログ。法令対応・インシデント調査・運用分析の3用途';
COMMENT ON COLUMN audit_logs.actor_email IS 'ユーザー削除後も追跡可能なよう冗長保存';
COMMENT ON COLUMN audit_logs.metadata IS 'JSON: エラーメッセージ・変更差分・追加コンテキスト';
