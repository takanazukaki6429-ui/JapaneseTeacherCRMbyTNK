-- ============================================================================
-- 土台A: データ層ロックダウン（コードレビュー_2026-07-12 対応）
--   1) 招待コード: 匿名・一般ポリシー全廃止（CRITICAL-2）
--   2) ai_usage_log 表の作成（AI回数制限の実効化・原価の栓）
--
-- ⚠️ 適用順序: 先にコード側（管理者権限接続版）を本番反映してから実行すること。
--    このSQLを先に流すと、旧コード（匿名接続で招待コードを読む）が動かなくなる。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 招待コード（invite_codes）
--    これまで: 匿名で全件閲覧可（USING true）＋未使用コードを誰でも使用済みに更新可
--              ＋一般教師が発行可能
--    これから: anon/authenticated のポリシー0件 = 全操作拒否。
--              検証・消込は /api/auth/signup、発行・一覧は /api/admin/invite-codes
--              （いずれも service_role 接続。service_role はRLSの対象外）
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view invite codes to check validity" ON public.invite_codes;
DROP POLICY IF EXISTS "Users can mark code as used during signup" ON public.invite_codes;
DROP POLICY IF EXISTS "Users can create invite codes" ON public.invite_codes;
DROP POLICY IF EXISTS "Users can manage their own invite codes" ON public.invite_codes;

ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 2) ai_usage_log（AI利用記録）
--    コードは既にこの表へ記録・20回/時の判定を行う設計だが、本番に表が無く
--    制限が素通しだった（2026-07-12 実数調査で発覚）。
--    API側はセッション接続で自分の分を書く/数えるため、本人限定ポリシーを付ける。
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    model text,
    prompt_type text,
    token_usage integer
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_created
    ON public.ai_usage_log (user_id, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ai_usage_insert_own" ON public.ai_usage_log;
CREATE POLICY "ai_usage_insert_own" ON public.ai_usage_log
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_usage_select_own" ON public.ai_usage_log;
CREATE POLICY "ai_usage_select_own" ON public.ai_usage_log
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.ai_usage_log IS 'AI利用記録。時間あたり回数制限の判定と原価実績の集計に使用';
