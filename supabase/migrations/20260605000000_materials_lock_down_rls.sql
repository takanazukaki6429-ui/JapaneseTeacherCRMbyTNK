-- 教材テーブルのRLSを「dev用全開放」から本番ポリシーへ切り替える
-- v1.0 §4.2.2 教材アクセス制御
-- - 自分が作った教材：自由に読み書き
-- - 公開教材（is_public=true）：認証ユーザー全員が読める
-- - 他人の非公開教材：見えない

-- 1. dev用の全開放ポリシーを削除
DROP POLICY IF EXISTS "Allow public access for dev" ON public.materials;

-- 2. 自分の教材：所有者だけ SELECT/INSERT/UPDATE/DELETE
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'materials' AND policyname = 'materials_owner_full'
    ) THEN
        CREATE POLICY "materials_owner_full"
            ON public.materials FOR ALL
            TO authenticated
            USING (author_id = auth.uid())
            WITH CHECK (author_id = auth.uid());
    END IF;
END $$;

-- 3. 公開教材：誰でも SELECT 可（既存のmaterials_read_publicが20260419で作られているはず・なければ作る）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'materials' AND policyname = 'materials_read_public'
    ) THEN
        CREATE POLICY "materials_read_public"
            ON public.materials FOR SELECT
            TO authenticated
            USING (is_public = true);
    END IF;
END $$;
