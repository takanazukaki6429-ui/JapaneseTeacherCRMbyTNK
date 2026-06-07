/**
 * v1.0 工程表 3.1: 教材の構造解析（AI）
 *
 * あいちゃんGenspark教材の生テキストを受け取り、Gemini で
 * StructuredMaterial（5セクション＋単語の構造化JSON）に変換する。
 * 管理者専用。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isAdminEmail } from '@/lib/admin';
import { withRetry } from '@/lib/retry';

export const dynamic = 'force-dynamic';

const PARSE_PROMPT = `あなたは日本語教育の教材構造化の専門家です。
以下の日本語学習教材の生テキストを解析し、構造化されたJSONに変換してください。

# 出力ルール
- 必ず以下のJSON形式のみで出力（Markdownのコードブロックや説明文は不要）
- 5セクション（intro/vocabulary/grammar/practice/application）をできる限り埋める
- 元テキストに該当部分がないセクションは content_md を空文字にする
- vocabulary は元テキストの重要単語を抽出。意味は分かる言語だけ埋める（最低 meaning_en）
- image_prompt は intro/vocabulary/practice セクションのみ、教材内容に合った英語の画像生成プロンプトを書く
- grammar_points は文法ポイントを {point, meaning} で列挙
- topic_tags は内容を表す英語タグ（例: daily, travel, permission）

# JSON形式
{
  "jlpt_level": "N5|N4|N3|N2|N1",
  "lesson_number": 数値,
  "title": "課のタイトル",
  "grammar_points": [{"point": "文法", "meaning": "意味"}],
  "topic_tags": ["tag1", "tag2"],
  "sections": [
    {"section_type": "intro", "content_md": "...", "image_prompt": "...", "example_sentences": [{"jp": "...", "reading": "...", "en": "..."}]},
    {"section_type": "vocabulary", "content_md": "...", "image_prompt": "..."},
    {"section_type": "grammar", "content_md": "..."},
    {"section_type": "practice", "content_md": "...", "image_prompt": "..."},
    {"section_type": "application", "content_md": "..."}
  ],
  "vocabulary": [
    {"word": "...", "reading": "...", "meaning_en": "...", "example_sentence": "..."}
  ]
}`;

export async function POST(req: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdminEmail(user?.email)) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    let rawText: string;
    let levelHint: string | undefined;
    let lessonHint: number | undefined;
    try {
        const body = await req.json();
        rawText = String(body.rawText || '').slice(0, 30000);
        levelHint = body.jlptLevel ? String(body.jlptLevel) : undefined;
        lessonHint = body.lessonNumber ? Number(body.lessonNumber) : undefined;
    } catch {
        return NextResponse.json({ error: '入力が不正です' }, { status: 400 });
    }

    if (!rawText.trim()) {
        return NextResponse.json({ error: '教材テキストを入力してください' }, { status: 400 });
    }

    const hint = [
        levelHint ? `推奨JLPTレベル: ${levelHint}` : '',
        lessonHint ? `課番号: ${lessonHint}` : '',
    ].filter(Boolean).join(' / ');

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    try {
        const result = await withRetry(
            () => model.generateContent(`${PARSE_PROMPT}\n\n${hint ? `# ヒント\n${hint}\n` : ''}\n# 教材テキスト\n${rawText}`),
            { label: 'material-parse', maxRetries: 2 }
        );
        const text = result.response.text();
        const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(clean);
        return NextResponse.json({ structured: parsed });
    } catch (e) {
        return NextResponse.json(
            { error: 'AI構造化に失敗しました。テキストを見直すか再試行してください', detail: e instanceof Error ? e.message : String(e) },
            { status: 500 }
        );
    }
}
