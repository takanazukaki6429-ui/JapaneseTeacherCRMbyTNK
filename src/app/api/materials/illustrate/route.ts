import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;   // 画像生成は最大60秒近くかかるため既定より長くとる

/**
 * 機能B-2: 授業中の即興イラスト生成
 *
 * 教科書の課と生徒の情報から、その場面のイラストを1枚作る。
 * 先生は追加入力をしない（課と生徒は画面が持っている）ので、
 * 指示文はここで組み立てる。
 *
 * モデルの選択（2026-08-13 実測3回ずつで比較して決定。速い版は 2026-09-22 に Lite へ変更＝下の FAST_MODEL）:
 *   fast     = gemini-3.1-flash-image … 8〜10秒 / 主文の日本語は3/3正確、
 *              ただし背景の装飾文字が1/3で崩れた（〜2026-09-21）
 *   quality  = gpt-image-2（画質 medium）… 31〜42秒 / 背景の文字まで3/3正確
 *
 * 単価（2026-09-20 に公表値で確認・訂正）:
 *   fast    $0.067/枚（≒¥10）。以前ここに「約0.06円」と書いてあったのは
 *           $0.06 をドルのまま円と書いた取り違えで、実際は167倍だった
 *   quality $0.05/枚（≒¥7.5）。1536x1024・画質 medium の場合。
 *           画質を指定しないと $0.013〜$0.25 の間でぶれるため medium に固定した
 * 授業中に「すぐ欲しい」場合と「しっかり作りたい」場合があるため、先生が選べるようにする。
 */

type Mode = 'fast' | 'quality';

// 速い版のモデル（2026-09-22 かずき決定「一番原価を抑える組み合わせ」）：
//   gemini-3.1-flash-lite-image … $0.0336/枚（≒¥5）・3〜5秒。同じ場面2枚の比較で主文の日本語は2/2正確、
//   ふりがなが1/2で誤り（比較_安いモデルの質_2026-09-22.html）。3.1-flash-image（$0.067・8〜10秒）から切り替え。
//   きれい版（gpt-image-2）は自動では作らず、先生が絵のカードのボタンで頼んだ時だけ作る
const FAST_MODEL = 'gemini-3.1-flash-lite-image';

// 教材の画像は文字が崩れると使い物にならない（誤った日本語を生徒に見せることになる）ため、
// 指示文でも文字の正確さを最優先で要求する
function buildPrompt(params: {
    level: string | null;
    lessonTitle: string | null;
    grammarOrPhrase: string | null;
    transcript: string | null;
    sceneHint: string;
    nationality: string | null;
    nativeLanguage: string | null;
}) {
    const { level, lessonTitle, grammarOrPhrase, transcript, sceneHint, nationality, nativeLanguage } = params;
    const looks = nationality
        ? `${nationality}出身の学習者。その国の人らしい外見にし、日本人ではないと一目でわかるようにする`
        : '外国人の学習者。日本人ではないと一目でわかる外見にする';
    const translationLine = nativeLanguage && nativeLanguage !== 'Japanese'
        ? `・日本語のセリフの下に、小さく${nativeLanguage}の訳を必ず添える`
        : '・日本語のセリフの下に、小さく英訳を必ず添える';

    const lines = ['日本語学習者向けの教材イラストを1枚作ってください。'];
    if (level) lines.push(`【レベル】${level}`);
    if (lessonTitle) lines.push(`【課】${lessonTitle}`);
    if (grammarOrPhrase) lines.push(`【学習する表現】${grammarOrPhrase}`);
    // 課が選ばれていなくても、今まさに授業で話している内容から場面を起こせるようにする
    if (transcript) lines.push(`【いま授業で話していること】${transcript}`);
    lines.push(
        `【場面】${sceneHint || (transcript ? 'いま話している内容に合う自然な場面' : 'この表現を実際に使う自然な場面')}`,
        `【登場する学習者】${looks}`,
        '【必ず守ること】',
        '・日本語のセリフを吹き出しに大きく、正確に入れる（誤字・崩れた文字は絶対に不可）',
        translationLine,
        '・背景に文字を入れる場合も、正しい日本語だけを使う（読めない文字を書かない）',
        '・やさしいアニメ調、明るい配色、日本語の教科書らしい見た目',
        '・文字は十分大きく、読みやすくする',
    );
    return lines.join('\n');
}

async function generateWithGemini(prompt: string) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY が未設定です');
    const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${FAST_MODEL}:generateContent?key=${key}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        }
    );
    if (!res.ok) throw new Error(`画像生成に失敗しました（${res.status}）`);
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
        if (p.inlineData?.data) {
            return {
                base64: p.inlineData.data as string,
                mime: (p.inlineData.mimeType as string) || 'image/png',
                tokens: data?.usageMetadata?.totalTokenCount ?? 0,
            };
        }
    }
    throw new Error('画像が返りませんでした');
}

async function generateWithOpenAI(prompt: string) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error('OPENAI_API_KEY が未設定です');
    const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        // quality を指定しないと、どの画質で課金されるかが決まらない（1枚 $0.013〜$0.25 と20倍ぶれる）。
        // 2026-09-20 かずき決定：medium に固定。low だと「背景の文字まで正確」というこの版の存在理由が消え、
        // high は1枚 $0.25 で、授業でよく使う先生だと月額を超える恐れがある（AI費用試算 2026-09-20 §8）
        body: JSON.stringify({ model: 'gpt-image-2', prompt, size: '1536x1024', n: 1, quality: 'medium' }),
    });
    if (!res.ok) throw new Error(`画像生成に失敗しました（${res.status}）`);
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('画像が返りませんでした');
    return {
        base64: b64 as string,
        mime: 'image/png',
        tokens: data?.usage?.total_tokens ?? 0,
    };
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const masterMaterialId = String(body.masterMaterialId || '');
        const studentId = body.studentId ? String(body.studentId) : null;
        const mode: Mode = body.mode === 'quality' ? 'quality' : 'fast';
        const sceneHint = String(body.sceneHint || '').slice(0, 200);
        // ライブ授業のヘッダーから押せるようにするため、課の指定は必須にしない。
        // 課が無いときは直近の会話から場面を起こす
        const transcript = String(body.transcript || '').slice(-800);   // 先生＋生徒の直近の会話（2026-09-06）

        if (!masterMaterialId && !transcript && !sceneHint) {
            return NextResponse.json(
                { error: '授業が始まっていないため、何の絵を描くか判断できません。少し会話してから、または教科書の課を選んでからお試しください。' },
                { status: 400 }
            );
        }

        // 画像は1枚あたりの単価が文章より高いので、専用の枠で回数を絞る。
        // 1コマで数枚が想定。上限は運用しながら調整する
        const HOURLY_LIMIT = 20;
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('prompt_type', 'illustrate')
            .gte('created_at', oneHourAgo);

        if (count !== null && count >= HOURLY_LIMIT) {
            return NextResponse.json(
                { error: `イラスト生成が1時間あたりの上限（${HOURLY_LIMIT}枚）に達しました。しばらく置いてからお試しください。` },
                { status: 429 }
            );
        }

        // 課は任意。選ばれていればその内容を、無ければ会話だけで描く
        let lessonLevel: string | null = null;
        let lessonTitle: string | null = null;
        let grammarText: string | null = null;

        if (masterMaterialId) {
            const { data: lesson } = await supabase
                .from('master_materials')
                .select('jlpt_level, lesson_label, lesson_number, title')
                .eq('id', masterMaterialId)
                .single();
            if (lesson) {
                lessonLevel = lesson.jlpt_level;
                lessonTitle = `${lesson.lesson_label ?? `第${lesson.lesson_number}課`} ${lesson.title}`;

                // 何の表現の絵かを決める材料として、文法セクションの冒頭を使う
                const { data: sections } = await supabase
                    .from('master_material_sections')
                    .select('section_type, content_md')
                    .eq('master_material_id', masterMaterialId)
                    .in('section_type', ['grammar', 'theme'])
                    .order('section_order');

                grammarText = (sections ?? [])
                    .map((s: { content_md: string }) =>
                        s.content_md.split('\n').filter((l: string) => !l.trim().startsWith('![')).join(' '))
                    .join(' ')
                    .slice(0, 300) || null;
            }
        }

        let nationality: string | null = null;
        let nativeLanguage: string | null = null;
        if (studentId) {
            const { data: student } = await supabase
                .from('students')
                .select('nationality')
                .eq('id', studentId)
                .single();
            nationality = student?.nationality ?? null;
        }
        if (body.nativeLanguage) nativeLanguage = String(body.nativeLanguage);

        const prompt = buildPrompt({
            level: lessonLevel,
            lessonTitle,
            grammarOrPhrase: grammarText,
            transcript: transcript || null,
            sceneHint,
            nationality,
            nativeLanguage,
        });

        const started = Date.now();
        const result = mode === 'quality'
            ? await generateWithOpenAI(prompt)
            : await generateWithGemini(prompt);

        supabase.from('ai_usage_log').insert({
            user_id: user.id,
            model: mode === 'quality' ? 'gpt-image-2' : FAST_MODEL,
            prompt_type: 'illustrate',
            token_usage: result.tokens,
        }).then(() => {}, console.error);

        return NextResponse.json({
            dataUrl: `data:${result.mime};base64,${result.base64}`,
            mode,
            elapsedMs: Date.now() - started,
        });

    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('Illustrate error:', message);
        return NextResponse.json(
            { error: `イラストの生成に失敗しました。もう一度お試しください。（${message}）` },
            { status: 500 }
        );
    }
}
