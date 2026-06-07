-- materials テーブル: student_id カラム追加（生徒専用教材のひも付け）

ALTER TABLE materials ADD COLUMN IF NOT EXISTS student_id uuid REFERENCES students(id) ON DELETE SET NULL;

-- student_id にインデックスを張る（一覧取得が速くなる）
CREATE INDEX IF NOT EXISTS idx_materials_student_id ON materials(student_id);

-- 既存のオーナーポリシー（自分の教材のみ操作）が student_id 付きにも適用されるよう確認
-- 既存 RLS は user_id 列に基づいているため追加ポリシー不要
