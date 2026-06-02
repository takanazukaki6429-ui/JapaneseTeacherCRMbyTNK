-- ============================================================================
-- v1.0 工程表 3.2: master_materials スキーマ（あいちゃんGenspark教材投入用）
-- 作成日: 2026-06-01
-- 関連: ASTA_要件定義書_v1.0.md §3.3 教材機能
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. master_materials: マスター教材（あいちゃんから受領した課単位の教材）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS master_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    jlpt_level text NOT NULL CHECK (jlpt_level IN ('N5','N4','N3','N2','N1')),
    lesson_number int NOT NULL,
    title text NOT NULL,
    -- 文法ポイント（複数可）。例: [{"point": "〜てはいけません", "meaning": "禁止"}]
    grammar_points jsonb DEFAULT '[]'::jsonb,
    -- トピックタグ（検索用）。例: ['daily', 'permission', 'prohibition']
    topic_tags text[] DEFAULT '{}',
    -- 受領元（将来別ソースを混在させる場合に区別）
    source text NOT NULL DEFAULT 'aichan_genspark',
    -- 元ファイルへの参照（PDFやMarkdownのストレージパス）
    raw_source_path text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(jlpt_level, lesson_number)
);

CREATE INDEX IF NOT EXISTS idx_master_materials_jlpt
    ON master_materials(jlpt_level, lesson_number);

-- ---------------------------------------------------------------------------
-- 2. master_material_sections: 5セクション構成（導入→単語→文法→練習→応用）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS master_material_sections (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    master_material_id uuid NOT NULL REFERENCES master_materials(id) ON DELETE CASCADE,
    section_type text NOT NULL CHECK (section_type IN (
        'intro',        -- 1. 導入（場面設定）
        'vocabulary',   -- 2. 単語
        'grammar',      -- 3. 文法説明
        'practice',     -- 4. 練習問題
        'application'   -- 5. 応用問題
    )),
    section_order int NOT NULL,  -- 1〜5
    content_md text NOT NULL,    -- Markdown形式の本文
    -- DALL-E 3 画像生成プロンプト（intro/vocabulary/practice の3用途）
    image_prompt text,
    -- セクション内の例文配列。例: [{"jp": "...", "reading": "...", "en": "..."}]
    example_sentences jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE(master_material_id, section_type)
);

CREATE INDEX IF NOT EXISTS idx_master_sections_material
    ON master_material_sections(master_material_id, section_order);

-- ---------------------------------------------------------------------------
-- 3. master_material_vocabulary: 単語データ（多言語訳対応）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS master_material_vocabulary (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    master_material_id uuid NOT NULL REFERENCES master_materials(id) ON DELETE CASCADE,
    word text NOT NULL,
    reading text,                  -- ひらがな読み
    -- 6言語の意味（要件定義書 v1.0 §3.3.4: 母国語ヒント）
    meaning_en text,
    meaning_es text,
    meaning_pt text,
    meaning_ko text,
    meaning_zh text,
    meaning_fr text,
    example_sentence text,
    word_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_master_vocab_material
    ON master_material_vocabulary(master_material_id, word_order);

-- ---------------------------------------------------------------------------
-- 4. generated_materials: AI生徒最適化で派生生成された教材
--    要件定義書 v1.0 §3.3.4 AI生徒最適化（5項目派生）の結果保存
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS generated_materials (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    master_material_id uuid NOT NULL REFERENCES master_materials(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    teacher_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    -- AI生成された完成版教材（5セクション分のフル内容を構造化保存）
    -- 例: {"intro": {...}, "vocabulary": [...], "grammar": {...}, ...}
    generated_content jsonb NOT NULL,
    -- DALL-E 3 で生成された画像のURLs（最大5枚: 導入1+単語3+問題1）
    image_urls text[] DEFAULT '{}',
    -- 生成時の生徒情報スナップショット（再生成判断・デバッグ用）
    student_snapshot jsonb,
    -- 派生パラメータ（どの5項目を適用したか）
    derivation_flags jsonb DEFAULT '{"vocabulary": true, "difficulty": true, "culture": true, "stumbles": true, "native_hints": true}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_materials_student
    ON generated_materials(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generated_materials_teacher
    ON generated_materials(teacher_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 5. RLS: 全テーブルに有効化
-- ---------------------------------------------------------------------------
ALTER TABLE master_materials              ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_material_sections      ENABLE ROW LEVEL SECURITY;
ALTER TABLE master_material_vocabulary    ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_materials           ENABLE ROW LEVEL SECURITY;

-- master_*: 認証ユーザーは閲覧可能（マスター教材は共有資産）
CREATE POLICY "master_materials_read"
    ON master_materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "master_sections_read"
    ON master_material_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "master_vocab_read"
    ON master_material_vocabulary FOR SELECT TO authenticated USING (true);

-- master_*: 書き込みは管理者のみ（ADMIN_EMAILS ベース）
CREATE POLICY "master_materials_admin_write"
    ON master_materials FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' IN ('pommetann@gmail.com', 'takanazukaki6429@gmail.com'))
    WITH CHECK (auth.jwt() ->> 'email' IN ('pommetann@gmail.com', 'takanazukaki6429@gmail.com'));

CREATE POLICY "master_sections_admin_write"
    ON master_material_sections FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' IN ('pommetann@gmail.com', 'takanazukaki6429@gmail.com'))
    WITH CHECK (auth.jwt() ->> 'email' IN ('pommetann@gmail.com', 'takanazukaki6429@gmail.com'));

CREATE POLICY "master_vocab_admin_write"
    ON master_material_vocabulary FOR ALL TO authenticated
    USING (auth.jwt() ->> 'email' IN ('pommetann@gmail.com', 'takanazukaki6429@gmail.com'))
    WITH CHECK (auth.jwt() ->> 'email' IN ('pommetann@gmail.com', 'takanazukaki6429@gmail.com'));

-- generated_materials: 教師は自分が生成した分のみアクセス可
CREATE POLICY "generated_materials_owner"
    ON generated_materials FOR ALL TO authenticated
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. 更新時刻自動更新トリガー
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_master_materials_updated_at()
    RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_master_materials_updated_at ON master_materials;
CREATE TRIGGER trg_master_materials_updated_at
    BEFORE UPDATE ON master_materials
    FOR EACH ROW
    EXECUTE FUNCTION update_master_materials_updated_at();

-- ---------------------------------------------------------------------------
-- 完了
-- ---------------------------------------------------------------------------
COMMENT ON TABLE master_materials IS 'あいちゃんGenspark教材のマスターデータ。N5〜N3はPhase 1、N1・N2はPhase 1後追加';
COMMENT ON TABLE master_material_sections IS '1課を5セクション（導入/単語/文法/練習/応用）に分割保存';
COMMENT ON TABLE master_material_vocabulary IS '単語データ。6言語訳付き（要件定義書 v1.0 §3.3.4）';
COMMENT ON TABLE generated_materials IS 'AI生徒最適化（5項目派生）の生成結果。教材+生徒の組み合わせごとに保存';
