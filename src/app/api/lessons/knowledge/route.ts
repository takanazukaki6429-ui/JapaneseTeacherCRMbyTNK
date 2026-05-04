import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// JLPT文字列→数値変換
function jlptToInt(level: string | null): number {
    const map: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
    return map[level ?? ''] ?? 1;
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 });
        }

        const { lesson_id } = await req.json();
        if (!lesson_id) {
            return NextResponse.json({ error: 'lesson_id is required' }, { status: 400 });
        }

        // レッスン記録取得
        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select('*, students(jlpt_level, goal_text, current_phase)')
            .eq('id', lesson_id)
            .single();

        if (lessonError || !lesson) {
            return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
        }

        // understanding_level が 4/5 以上（星4以上）を「成功」と判定
        const isSuccess = (lesson.understanding_level ?? 0) >= 4;

        // 生徒情報
        const student = lesson.students as { jlpt_level: string | null; goal_text: string | null; current_phase: string | null } | null;
        const jlptLevel = jlptToInt(student?.jlpt_level ?? null);

        // ゴールタイプを goal_text から抽出（例: "Goal: Lv.70 (旅行を楽しみたい)" → travel）
        const goalText = (student?.goal_text ?? '').toLowerCase();
        let goalType = 'other';
        if (goalText.includes('旅行') || goalText.includes('travel')) goalType = 'travel';
        else if (goalText.includes('jlpt') || goalText.includes('試験') || goalText.includes('challenge')) goalType = 'jlpt';
        else if (goalText.includes('ビジネス') || goalText.includes('仕事') || goalText.includes('work')) goalType = 'business';
        else if (goalText.includes('アニメ') || goalText.includes('anime')) goalType = 'anime';
        else if (goalText.includes('友達') || goalText.includes('friends')) goalType = 'friends';
        else if (goalText.includes('日常') || goalText.includes('daily')) goalType = 'daily';

        // Geminiでパターン抽出
        const prompt = `以下の日本語授業記録を分析し、「課の進め方パターン」を抽出してください。

## 授業記録
- 学習トピック: ${lesson.topics || '未記録'}
- 語彙・表現: ${lesson.vocabulary || '未記録'}
- つまずき・弱点: ${lesson.mistakes || 'なし'}
- 宿題: ${lesson.homework || 'なし'}
- 次回目標: ${lesson.next_goal || '未設定'}
- 理解度: ${lesson.understanding_level || 3}/5
- 現在の進度: ${student?.current_phase || '未設定'}

## 抽出ルール
授業記録から「この課をスキップした」「この課に集中した」「この課に戻った」というパターンを読み取り、
以下のJSON配列で返してください。
パターンが読み取れない場合は空配列 [] を返してください。

[
  {
    "unit_action": "skip" | "focus" | "return",
    "unit_id": "課を識別するID（例: unit_kanji, lesson_honorific）",
    "unit_label": "人間が読める課名（例: 漢字Unit, 敬語レッスン）"
  }
]

JSONのみ出力。Markdownコードブロック不要。`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text().trim()
            .replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

        let patterns: Array<{ unit_action: string; unit_id: string; unit_label: string }> = [];
        try {
            patterns = JSON.parse(text);
            if (!Array.isArray(patterns)) patterns = [];
        } catch {
            patterns = [];
        }

        if (patterns.length === 0) {
            return NextResponse.json({ message: 'No patterns extracted', patterns: [] });
        }

        // knowledge_base に upsert
        const upsertResults = [];
        for (const p of patterns) {
            if (!['skip', 'focus', 'return'].includes(p.unit_action)) continue;
            if (!p.unit_id || typeof p.unit_id !== 'string') continue;

            const { data: existing } = await supabase
                .from('knowledge_base')
                .select('id, success_count, fail_count')
                .eq('goal_type', goalType)
                .eq('jlpt_level', jlptLevel)
                .eq('unit_action', p.unit_action)
                .eq('unit_id', p.unit_id)
                .single();

            if (existing) {
                const { error } = await supabase
                    .from('knowledge_base')
                    .update({
                        success_count: existing.success_count + (isSuccess ? 1 : 0),
                        fail_count: existing.fail_count + (isSuccess ? 0 : 1),
                        unit_label: p.unit_label || existing,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', existing.id);
                if (!error) upsertResults.push({ action: 'updated', unit_id: p.unit_id });
            } else {
                const { error } = await supabase
                    .from('knowledge_base')
                    .insert({
                        goal_type: goalType,
                        jlpt_level: jlptLevel,
                        unit_action: p.unit_action,
                        unit_id: p.unit_id,
                        unit_label: p.unit_label || p.unit_id,
                        success_count: isSuccess ? 1 : 0,
                        fail_count: isSuccess ? 0 : 1,
                    });
                if (!error) upsertResults.push({ action: 'inserted', unit_id: p.unit_id });
            }
        }

        // 使用ログ
        supabase.from('ai_usage_log').insert({
            user_id: user.id,
            model: 'gemini-2.0-flash',
            prompt_type: 'knowledge_extraction',
            token_usage: 0
        }).then(() => {}, console.error);

        return NextResponse.json({
            message: 'Knowledge base updated',
            isSuccess,
            goalType,
            jlptLevel,
            patterns,
            upsertResults,
        });

    } catch (error: unknown) {
        console.error('Knowledge API Error:', error);
        return NextResponse.json(
            { error: 'Failed to update knowledge base', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
