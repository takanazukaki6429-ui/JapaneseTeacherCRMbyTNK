-- materials テーブル: is_public カラム追加 + 公開教材の RLS

-- カラムが未存在の場合のみ追加（型定義には既にあるが念のため）
ALTER TABLE materials ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 公開教材は全認証ユーザーが読める
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'materials' AND policyname = 'materials_read_public'
    ) THEN
        CREATE POLICY "materials_read_public"
            ON materials FOR SELECT
            TO authenticated
            USING (is_public = true);
    END IF;
END $$;
