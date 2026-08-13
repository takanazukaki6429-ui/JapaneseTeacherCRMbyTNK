import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * 機能B: 授業中の即興生成（要件定義書 §3.3.7）
 *
 * 教科書の「今やっている課」と生徒の情報をもとに、その場で
 * 追加の練習問題・例文・やさしい言い換えを作る。
 *
 * 事前カスタム（機能A・授業前にまとめて作る）とは別物で、
 * こちらは授業中に先生がボタンを押した瞬間に生成する。
 */

// 先生が授業中に押す前提の機能なので、1コマで数回〜十数回を想定して1時間60回。
// 教材生成など他の用途（20回/時）とは別枠にして、押し負けないようにする。
const HOURLY_LIMIT = 60;

type Mode = 'exercises' | 'examples' | 'explain';

const MODE_INSTRUCTION: Record<Mode, string> = {
    exercises: `この課の文法・語彙を使った【追加の練習問題】を3問作ってください。
・問題文と解答をセットで出す
・生徒がその場で口頭で答えられる長さにする
・難易度はこの課のレベルに合わせる`,
    examples: `この課の文法を使った【例文】を5つ作ってください。
・生徒の目標や興味に合う場面を選ぶ
・日本語の例文＋やさしい意味の説明をセットにする
・ふりがなは難しい漢字にだけ付ける`,
    explain: `この課の文法を、生徒が「わからない」と言ったときのために
【別の言い方でやさしく説明】してください。
・教科書の説明とは違う切り口にする
・身近なたとえを1つ入れる
・先生がそのまま口に出して使える文章にする`,
};

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const masterMaterialId = String(body.masterMaterialId || '');
        const mode = String(body.mode || '') as Mode;
        const studentId = body.studentId ? String(body.studentId) : null;
        const note = String(body.note || '').slice(0, 200);   // 先生の追加指示（任意）

        if (!masterMaterialId || !MODE_INSTRUCTION[mode]) {
            return NextResponse.json({ error: '課と生成内容を指定してください' }, { status: 400 });
        }

        // 利用回数の確認（この機能専用の枠）
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('prompt_type', 'improvise')
            .gte('created_at', oneHourAgo);

        if (count !== null && count >= HOURLY_LIMIT) {
            return NextResponse.json(
                { error: `この機能の利用が1時間あたりの上限（${HOURLY_LIMIT}回）に達しました。しばらく置いてからお試しください。` },
                { status: 429 }
            );
        }

        // 教科書の該当課を取得。全文は長すぎるので、生成に効く部分だけに絞る
        const { data: lesson } = await supabase
            .from('master_materials')
            .select('jlpt_level, lesson_label, lesson_number, title')
            .eq('id', masterMaterialId)
            .single();

        if (!lesson) {
            return NextResponse.json({ error: '指定された課が見つかりません' }, { status: 404 });
        }

        const { data: sections } = await supabase
            .from('master_material_sections')
            .select('section_type, content_md')
            .eq('master_material_id', masterMaterialId)
            .in('section_type', ['theme', 'goals', 'grammar', 'vocabulary']);

        const { data: vocab } = await supabase
            .from('master_material_vocabulary')
            .select('word, meaning_en')
            .eq('master_material_id', masterMaterialId)
            .order('word_order')
            .limit(40);

        // 画像参照の行はAIに渡しても意味がないので落とす
        const stripImages = (md: string) =>
            md.split('\n').filter(l => !l.trim().startsWith('![')).join('\n');

        const lessonContext = (sections ?? [])
            .map(s => `【${s.section_type}】\n${stripImages(s.content_md).slice(0, 1800)}`)
            .join('\n\n');

        const vocabList = (vocab ?? []).map(v => `${v.word}（${v.meaning_en ?? ''}）`).join('、');

        // 生徒の情報（あれば）。ライブ授業画面と同じ考え方で、目標・レベル・つまずきを渡す
        let studentContext = '';
        if (studentId) {
            const { data: student } = await supabase
                .from('students')
                .select('name, jlpt_level, goal_text, nationality, memo')
                .eq('id', studentId)
                .single();
            const { data: lessons } = await supabase
                .from('lessons')
                .select('mistakes')
                .eq('student_id', studentId)
                .order('date', { ascending: false })
                .limit(2);

            if (student) {
                const mistakes = (lessons ?? [])
                    .map(l => l.mistakes)
                    .filter(Boolean)
                    .join(' / ');
                studentContext = [
                    `生徒: ${student.name ?? ''}`,
                    `現在のレベル: ${student.jlpt_level ?? '未設定'}`,
                    `学習の目標: ${student.goal_text ?? '未設定'}`,
                    `国籍: ${student.nationality ?? '未設定'}`,
                    mistakes ? `前回までのつまずき: ${mistakes}` : '',
                ].filter(Boolean).join('\n');
            }
        }

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'AIの設定が未完了です' }, { status: 500 });
        }

        const prompt = `あなたは日本語教師の授業をその場で支援するアシスタントです。
先生が授業中に使うので、すぐ読める短さで、そのまま口に出せる形にしてください。

【今やっている課】
${lesson.jlpt_level} ${lesson.lesson_label ?? `第${lesson.lesson_number}課`}：${lesson.title}

【この課の内容】
${lessonContext || '（本文なし）'}

${vocabList ? `【この課の語彙】\n${vocabList}\n` : ''}
${studentContext ? `【生徒の情報】\n${studentContext}\n` : ''}
${note ? `【先生からの追加指示】\n${note}\n` : ''}
【依頼】
${MODE_INSTRUCTION[mode]}

⚠️ 前置き・挨拶は不要。本題だけを日本語で出力してください。`;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // 利用記録（原価の実測に使う）
        supabase.from('ai_usage_log').insert({
            user_id: user.id,
            model: 'gemini-2.5-flash',
            prompt_type: 'improvise',
            token_usage: result.response.usageMetadata?.totalTokenCount ?? 0,
        }).then(() => {}, console.error);

        return NextResponse.json({ text });

    } catch (error) {
        console.error('Improvise error:', error instanceof Error ? error.message : error);
        return NextResponse.json(
            { error: '生成に失敗しました。もう一度お試しください。' },
            { status: 500 }
        );
    }
}
