/**
 * v1.0 工程表 3.2/3.3: マスター教材の投入フォーマット型
 *
 * あいちゃんGenspark教材 → AI構造化 → この形 → master_materials系テーブルへ投入
 */

export type JlptLevel = 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export type SectionType = 'intro' | 'vocabulary' | 'grammar' | 'practice' | 'application';

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

/** セクションの表示順 */
export const SECTION_ORDER: Record<SectionType, number> = {
    intro: 1,
    vocabulary: 2,
    grammar: 3,
    practice: 4,
    application: 5,
};

export const SECTION_LABEL: Record<SectionType, string> = {
    intro: '導入',
    vocabulary: '単語',
    grammar: '文法',
    practice: '練習',
    application: '応用',
};
