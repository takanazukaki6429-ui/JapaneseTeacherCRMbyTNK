/**
 * v1.0 工程表 3.2/3.3: マスター教材の投入フォーマット型
 *
 * あいちゃんGenspark教材 → AI構造化 → この形 → master_materials系テーブルへ投入
 */

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

/**
 * セクション種別。2026-07-26 に実物94課を全数解析して確定した構成。
 * （intro/practice/application は初版スキーマの分類。既存データ互換のため残す）
 */
export type SectionType =
    | 'front' | 'theme' | 'goals' | 'learn_items' | 'expressions'
    | 'vocabulary' | 'vocab_practice' | 'grammar' | 'conversation'
    | 'reading' | 'speaking' | 'exercises' | 'listening' | 'answers'
    | 'summary' | 'homework' | 'teacher_notes'
    | 'intro' | 'practice' | 'application';

/** セクション種別 → 画面に出す日本語名 */
export const SECTION_LABELS: Record<SectionType, string> = {
    front: 'この課について',
    theme: 'テーマ',
    goals: '学習目標',
    learn_items: 'この課で学ぶこと',
    expressions: 'まずおぼえたい表現',
    vocabulary: 'ことばの説明',
    vocab_practice: 'ことばの練習',
    grammar: '文法',
    conversation: '会話',
    reading: '読解',
    speaking: '話す練習',
    exercises: '練習問題',
    listening: 'リスニング',
    answers: '解答例',
    summary: 'まとめ',
    homework: '宿題',
    teacher_notes: '教師用メモ',
    intro: '導入',
    practice: '練習',
    application: '応用',
};

/** 本番Storageのバケット名（画像の実体はここに入っている） */
export const MASTER_MATERIAL_BUCKET = 'master-materials';

/** master_materials テーブル1行ぶん（一覧表示用） */
export type MasterMaterialRow = {
    id: string;
    jlpt_level: JlptLevel;
    lesson_number: number;
    lesson_sub: number;
    lesson_label: string | null;
    title: string;
    image_count: number;
};

/** master_material_sections テーブル1行ぶん */
export type MasterMaterialSectionRow = {
    section_type: SectionType;
    section_order: number;
    content_md: string;
    images: string[];
};

export type GrammarPoint = {
    point: string;        // 例: 〜てはいけません
    meaning: string;      // 例: 禁止
};

export type ExampleSentence = {
    jp: string;           // 日本語
    reading?: string;     // ひらがな読み
    en?: string;          // 英訳（任意）
};

export type VocabularyItem = {
    word: string;
    reading?: string;
    meaning_en?: string;
    meaning_es?: string;
    meaning_pt?: string;
    meaning_ko?: string;
    meaning_zh?: string;
    meaning_fr?: string;
    example_sentence?: string;
};

export type MaterialSection = {
    section_type: SectionType;
    content_md: string;                 // Markdown本文
    image_prompt?: string;              // DALL-E用（intro/vocabulary/practice）
    example_sentences?: ExampleSentence[];
};

/** 1課ぶんの構造化教材（投入の単位） */
export type StructuredMaterial = {
    jlpt_level: JlptLevel;
    lesson_number: number;
    title: string;
    grammar_points: GrammarPoint[];
    topic_tags: string[];
    sections: MaterialSection[];        // 5セクション（導入/単語/文法/練習/応用）
    vocabulary: VocabularyItem[];
};

/**
 * セクションの表示順（旧5分類の投入API用）。
 * 実物94課は課ごとに順序が異なるため、投入時に実際の出現順を section_order に入れる。
 * ここに無い種別は投入API側で 99（末尾）になる。
 */
export const SECTION_ORDER: Partial<Record<SectionType, number>> = {
    intro: 1,
    vocabulary: 2,
    grammar: 3,
    practice: 4,
    application: 5,
};

/** @deprecated 表示名は SECTION_LABELS を使う（全種別を網羅している） */
export const SECTION_LABEL = SECTION_LABELS;
