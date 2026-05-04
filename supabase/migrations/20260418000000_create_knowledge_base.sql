-- Phase 3: 自律ナレッジ蓄積ループ
-- knowledge_base テーブル：授業パターンの成功/失敗を蓄積

CREATE TABLE IF NOT EXISTS knowledge_base (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    goal_type text NOT NULL,          -- travel / jlpt / daily / business / anime / friends / culture / live / beauty / challenge / other
    jlpt_level int NOT NULL CHECK (jlpt_level BETWEEN 1 AND 5),  -- N5=1, N4=2, N3=3, N2=4, N1=5
    unit_action text NOT NULL CHECK (unit_action IN ('skip', 'focus', 'return')),
    unit_id text NOT NULL,            -- 対象の課ID（例: "unit5", "lesson3"）
    unit_label text,                  -- 人間が読める課名（例: "Unit5 漢字"）
    success_count int NOT NULL DEFAULT 0,
    fail_count int NOT NULL DEFAULT 0,
    confidence float GENERATED ALWAYS AS (
        CASE WHEN (success_count + fail_count) = 0 THEN 0
             ELSE success_count::float / (success_count + fail_count)
        END
    ) STORED,
    updated_at timestamptz DEFAULT now(),
    UNIQUE (goal_type, jlpt_level, unit_action, unit_id)
);

-- 検索用インデックス
CREATE INDEX IF NOT EXISTS idx_knowledge_base_lookup
    ON knowledge_base (goal_type, jlpt_level, confidence DESC);

-- RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- 全認証ユーザーが読める（共有ナレッジ）
CREATE POLICY "knowledge_base_read_all"
    ON knowledge_base FOR SELECT
    TO authenticated
    USING (true);

-- 書き込みも認証ユーザーOK
CREATE POLICY "knowledge_base_insert"
    ON knowledge_base FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "knowledge_base_update"
    ON knowledge_base FOR UPDATE
    TO authenticated
    USING (true);
