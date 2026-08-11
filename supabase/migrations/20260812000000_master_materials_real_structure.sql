-- ============================================================================
-- マスター教材スキーマを実物データの構造に合わせる（2026-08-12）
--
-- 経緯:
--   2026-06-01 の初版スキーマは「5セクション構成（導入→単語→文法→練習→応用）」
--   を前提に作られていた。2026-07-26 に実物94課を全数解析した結果、実際は
--   コア11セクション（テーマ/学習目標/語彙/文法/会話/読解/話す練習/練習問題/
--   まとめ/宿題/教師用メモ）＋補助セクションの構成だった。
--   要件定義書 §3.3.8 の決定「DBのセクション分類は実物に合わせる」に従い調整する。
--
-- 変更点:
--   1) section_type の許容値を実測16種に拡張（情報を落とさないため）
--   2) lesson_sub を追加（「第3-1課」のような補講が第3課を上書きするのを防ぐ）
--   3) sections に images を追加（埋め込み画像3,393枚をStorageに置き、参照を保持）
--   4) master_materials に総画像数・出典ファイル名を保持
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) セクション種別を実物に合わせて拡張
-- ---------------------------------------------------------------------------
ALTER TABLE master_material_sections
    DROP CONSTRAINT IF EXISTS master_material_sections_section_type_check;

ALTER TABLE master_material_sections
    ADD CONSTRAINT master_material_sections_section_type_check
    CHECK (section_type IN (
        'front',          -- 表紙・課タイトル
        'theme',          -- この課のテーマ
        'goals',          -- 学習目標
        'learn_items',    -- この課で学ぶこと（目次）
        'expressions',    -- まずおぼえたい表現
        'vocabulary',     -- ことばの説明
        'vocab_practice', -- ことばの練習
        'grammar',        -- 文法
        'conversation',   -- 会話
        'reading',        -- 読解
        'speaking',       -- 話す練習
        'exercises',      -- 練習問題
        'listening',      -- リスニング
        'answers',        -- 解答例
        'summary',        -- まとめ
        'homework',       -- 宿題
        'teacher_notes',  -- 教師用メモ
        -- 旧5分類（既存データがある場合の互換のため残す）
        'intro', 'practice', 'application'
    ));

-- ---------------------------------------------------------------------------
-- 2) 補講課（第3-1課など）を別レコードとして持てるようにする
-- ---------------------------------------------------------------------------
ALTER TABLE master_materials
    ADD COLUMN IF NOT EXISTS lesson_sub int NOT NULL DEFAULT 0;

COMMENT ON COLUMN master_materials.lesson_sub IS
    '補講番号。通常課は0、「第3-1課」は lesson_number=3, lesson_sub=1';

-- 表示用ラベル（「第3課」「第3-1課」）。UIで組み立て直さずに済むよう保持する
ALTER TABLE master_materials
    ADD COLUMN IF NOT EXISTS lesson_label text;

ALTER TABLE master_materials
    DROP CONSTRAINT IF EXISTS master_materials_jlpt_level_lesson_number_key;

ALTER TABLE master_materials
    ADD CONSTRAINT master_materials_lesson_unique
    UNIQUE (jlpt_level, lesson_number, lesson_sub);

-- ---------------------------------------------------------------------------
-- 3) セクション内の画像参照（Storage上のファイル名の配列）
-- ---------------------------------------------------------------------------
ALTER TABLE master_material_sections
    ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN master_material_sections.images IS
    'このセクションに含まれる画像のファイル名配列。実体は Storage の master-materials バケット配下 <level>/<lesson>/<name>.webp';

-- section_order は実測で最大17まで出るため、1〜5想定のコメントを更新
COMMENT ON COLUMN master_material_sections.section_order IS
    '課内での出現順（0始まり）。実物は1課あたり5〜17セクション';

-- ---------------------------------------------------------------------------
-- 4) 教材メタ情報
-- ---------------------------------------------------------------------------
ALTER TABLE master_materials
    ADD COLUMN IF NOT EXISTS image_count int NOT NULL DEFAULT 0;

ALTER TABLE master_materials
    ADD COLUMN IF NOT EXISTS source_file text;

COMMENT ON COLUMN master_materials.source_file IS
    '元のdocxファイル名（例: N5_01_第1課.docx）。再投入時の突き合わせに使う';
