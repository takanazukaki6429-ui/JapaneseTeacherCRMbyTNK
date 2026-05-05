-- H-3: initial_hearing_done フラグ追加
-- 初回ヒアリング完了済みかどうかを管理する列を students テーブルに追加

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS initial_hearing_done boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.students.initial_hearing_done IS '初回ヒアリング完了フラグ（trueなら再表示しない）';
