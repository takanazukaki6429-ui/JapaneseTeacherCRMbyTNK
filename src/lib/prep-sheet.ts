/**
 * 授業前の1枚（2026-09-17 かずき決定：自動で作る）
 *
 * ASTAが、前回の授業記録から「今日の指針・復習クイズ・導入の話題・気をつけること」を作る。
 * - 作る・保存する・読み出すをここ1か所にまとめ、生徒の1枚（帯）と授業前の準備の画面が同じ物を使う
 * - 保存はこの端末の中（localStorage）。最新の授業記録の日付ごとに分けて持つので、新しい記録が入れば作り直される
 * - ライブ授業の「授業前のメモ」は、これまでどおり prep_content_<生徒> を読むので、その名前でも保存する
 *
 * フリートークのネタ（2026-10-09 かずき決定・9-3）：
 * - 材料＝直近5回の授業の記録＋生徒のメモ・目標・興味＋直近2回の授業中に生徒が話したこと（保存した授業の流れ）。
 *   会話が保存されていない授業は記録だけ
 * - ネタは3つ。それぞれ「最初の質問」「続けて聞く質問」「どの日のどの話から作ったか」。
 *   最近習った文法を、生徒が答えで使えるように聞く（どの文法かも書く）。今の導入トークは残す
 * - レギュラー以上（lib/plan-features.ts の free_talk・2026-10-05）。世の中の動きは後で
 * - 記録・会話に無いことは作らない。質問は先生がそのまま聞ける、生徒のレベルの日本語
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { todayJst } from '@/lib/course';
import { ja } from '@/app/(main)/roadmap/ja';
import { parsePurposeIds } from '@/lib/roadmap/from-student';

export type PrepQuiz = { question: string; answer: string };

/** フリートークのネタ1つ */
export type FreeTalk = {
    /** ネタの見出し */
    topic: string;
    /** 最初に聞く質問（先生がそのまま聞ける、生徒のレベルの日本語） */
    question: string;
    /** 答えを受けて、続けて聞く質問 */
    follow_up: string;
    /** 答えで使ってほしい、最近習った文法（記録に見当たらなければ空） */
    grammar: string;
    /** どの日のどの話から作ったか */
    basis: string;
};

export type PrepSheet = {
    /** 生徒の1枚の帯に出す一文（今日どう進めるか） */
    guide?: string;
    review_quiz: PrepQuiz[];
    intro_topic: string;
    advice: string;
    /** フリートークのネタ。undefined＝フリートーク無しで作った1枚（ライト・無料の先生・この機能より前に作った物） */
    free_talk?: FreeTalk[];
};

/** フリートークの材料にする、授業の記録1回分 */
export type PrepLesson = {
    date: string;
    topics?: string | null;
    content?: string | null;
    vocabulary?: string | null;
    mistakes?: string | null;
};

/** 授業中に生徒が話したこと（保存した授業の流れから・1回の授業分） */
export type PrepTalk = { date: string; lines: string[] };

export type PrepSource = {
    studentName: string;
    jlptLevel?: string | null;
    textbook?: string | null;
    lastDate?: string | null;
    topics?: string | null;
    mistakes?: string | null;
    homework?: string | null;
    nextGoal?: string | null;
    /** ここから下はフリートークの材料 */
    memo?: string | null;
    goalText?: string | null;
    /** 興味（体験レッスンで選んだ目的） */
    interest?: string | null;
    /** 直近の授業の記録（新しい順・5回まで） */
    recentLessons?: PrepLesson[];
    /** 直近2回の授業中に生徒が話したこと */
    talks?: PrepTalk[];
};

export const FREE_TALK_COUNT = 3;
export const RECENT_LESSON_LIMIT = 5;
export const TALK_LESSON_LIMIT = 2;
/** 1回の授業から材料にする、生徒が話したことの文字数の上限 */
export const TALK_CHARS_PER_LESSON = 1200;
/** これより短い発話（相づち・「はい」など）は材料にしない */
const TALK_MIN_CHARS = 6;
/** 1つの発話の長さの上限 */
const TALK_LINE_MAX = 200;

/** 最新の授業記録の日付。これが変わったら作り直す */
export function prepStamp(lastLessonDate?: string | null): string {
    return lastLessonDate ? lastLessonDate.slice(0, 10) : 'none';
}

const stampedKey = (studentId: string, stamp: string) => `prep_sheet_${studentId}_${stamp}`;
const legacyKey = (studentId: string) => `prep_content_${studentId}`;

export function loadPrepSheet(studentId: string, stamp: string): PrepSheet | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(stampedKey(studentId, stamp));
        return raw ? (JSON.parse(raw) as PrepSheet) : null;
    } catch {
        return null;
    }
}

export function savePrepSheet(studentId: string, stamp: string, sheet: PrepSheet): void {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(stampedKey(studentId, stamp), JSON.stringify(sheet));
        localStorage.setItem(legacyKey(studentId), JSON.stringify(sheet));   // ライブ授業の「授業前のメモ」用
    } catch {
        /* 保存できなくても画面は動かす */
    }
}

/** フリートークを使える先生なのに、フリートーク無しで作った1枚か（この機能より前に作った物など）。true なら作り直す */
export function missingFreeTalk(sheet: PrepSheet, freeTalkAllowed: boolean): boolean {
    return freeTalkAllowed && sheet.free_talk === undefined;
}

/* ── 材料を集める ─────────────────────────────── */

type LessonLike = { date: string; status?: string | null };

/** 記録として扱う授業（予定ではなく、今より前）を新しい順に。生徒の1枚・ホームと同じ決め方 */
export function pastLessons<T extends LessonLike>(rows: T[], now: Date = new Date()): T[] {
    const t = now.getTime();
    return rows
        .filter(l => l.status !== 'scheduled' && new Date(l.date).getTime() <= t)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/** 日本時間の日付（'YYYY-MM-DD'）。読めない日付は null */
function jstYmd(date: string): string | null {
    const d = new Date(date);
    return Number.isNaN(d.getTime()) ? null : todayJst(d);
}

/** 日本時間の「月/日」（例：10/3） */
function jstMonthDay(date: string): string {
    const ymd = jstYmd(date);
    if (!ymd) return date.slice(0, 10);
    const [, m, d] = ymd.split('-');
    return `${Number(m)}/${Number(d)}`;
}

/**
 * 会話を読む範囲の始まり：直近2回の授業のうち、古いほうの日（日本時間）の0時。
 * 授業の流れは授業の記録より先に保存されることがあり、記録とは番号で結びつかないこともあるので、日で区切る。
 * 記録が無ければ null（会話は読まない）
 */
export function talkSince(past: { date: string }[]): string | null {
    const target = past[Math.min(TALK_LESSON_LIMIT, past.length) - 1];
    if (!target) return null;
    const ymd = jstYmd(target.date);
    return ymd ? new Date(`${ymd}T00:00:00+09:00`).toISOString() : null;
}

type FlowItemLike = { kind?: string; text?: string | null };
type FlowRowLike = { created_at: string; items: FlowItemLike[] | null };

/**
 * 保存した授業の流れから、生徒が話したこと（画面共有の音声を日本語にした物）を取り出す。
 * 先生の発話は入れない（2026-10-09 かずき決定「生徒が話したこと」）。
 * 短い相づちと同じ文は落とす。上限を超える時は長い文から選び（短い文ほど話題が少ない）、選んだ文は元の順に並べる
 */
export function studentLines(items: FlowItemLike[] | null | undefined, maxChars = TALK_CHARS_PER_LESSON): string[] {
    const seen = new Set<string>();
    const lines: string[] = [];
    for (const it of items ?? []) {
        if (it?.kind !== 'student-said') continue;
        const flat = String(it.text ?? '').replace(/\s+/g, ' ').trim();
        if (flat.length < TALK_MIN_CHARS || seen.has(flat)) continue;
        seen.add(flat);
        lines.push(flat.length > TALK_LINE_MAX ? `${flat.slice(0, TALK_LINE_MAX)}…` : flat);
    }
    if (lines.reduce((n, l) => n + l.length, 0) <= maxChars) return lines;
    const longFirst = lines.map((_, i) => i).sort((a, b) => lines[b].length - lines[a].length || a - b);
    const keep = new Set<number>();
    let used = 0;
    for (const i of longFirst) {
        if (used + lines[i].length > maxChars) continue;
        keep.add(i);
        used += lines[i].length;
    }
    return lines.filter((_, i) => keep.has(i));
}

/** 授業の流れ（直近2回）から、生徒が話したことを授業ごとにまとめる。話したことが無い回は入れない */
export function talksFromFlows(rows: FlowRowLike[]): PrepTalk[] {
    return [...rows]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, TALK_LESSON_LIMIT)
        .map(r => ({ date: r.created_at, lines: studentLines(r.items) }))
        .filter(t => t.lines.length > 0);
}

type StudentLike = {
    name: string;
    jlpt_level?: string | null;
    textbook?: string | null;
    memo?: string | null;
    goal_text?: string | null;
    purposes?: string | null;
};

type LessonRowLike = LessonLike & {
    topics?: string | null;
    content?: string | null;
    vocabulary?: string | null;
    mistakes?: string | null;
    homework?: string | null;
    next_goal?: string | null;
};

/** 興味（体験レッスンで選んだ目的・2つ以上の時は「・」でつなぐ）の名前。「その他」と読めない物は除き、残らなければ null */
function interestLabel(purposes: string | null | undefined): string | null {
    const labels = parsePurposeIds(purposes)
        .filter(id => id !== 'other')
        .map(id => (ja.purposes as Record<string, { label: string } | undefined>)[id]?.label)
        .filter((l): l is string => !!l);
    return labels.length > 0 ? labels.join('・') : null;
}

/** 生徒と授業の記録（予定が混ざっていてよい）から、1枚の材料を作る。前回の記録は今までどおり、一番新しい記録 */
export function buildPrepSource(student: StudentLike, lessons: LessonRowLike[], talks: PrepTalk[] = [], now: Date = new Date()): PrepSource {
    const past = pastLessons(lessons, now);
    const last = past[0] ?? null;
    return {
        studentName: student.name,
        jlptLevel: student.jlpt_level ?? null,
        textbook: student.textbook ?? null,
        lastDate: last?.date ?? null,
        topics: last?.topics ?? null,
        mistakes: last?.mistakes ?? null,
        homework: last?.homework ?? null,
        nextGoal: last?.next_goal ?? null,
        memo: student.memo ?? null,
        goalText: student.goal_text?.replace(/（AI判定）\s*$/, '').trim() || null,
        interest: interestLabel(student.purposes),
        recentLessons: past.slice(0, RECENT_LESSON_LIMIT).map(l => ({
            date: l.date,
            topics: l.topics ?? null,
            content: l.content ?? null,
            vocabulary: l.vocabulary ?? null,
            mistakes: l.mistakes ?? null,
        })),
        talks,
    };
}

/** 予定ではない、今より前の記録を新しい順に5回分読む条件（生徒の1枚・ホームと同じ決め方） */
export function recentLessonsQuery(supabase: SupabaseClient, studentId: string, columns: string) {
    return supabase
        .from('lessons')
        .select(columns)
        .eq('student_id', studentId)
        .or('status.is.null,status.neq.scheduled')
        .lte('date', new Date().toISOString())
        .order('date', { ascending: false })
        .limit(RECENT_LESSON_LIMIT);
}

/** 直近2回の授業中に生徒が話したことを読む（保存した授業の流れ）。読めない時は空＝記録だけで作る */
export async function fetchTalks(supabase: SupabaseClient, studentId: string, since: string | null): Promise<PrepTalk[]> {
    if (!since) return [];
    const { data, error } = await supabase
        .from('lesson_flows')
        .select('created_at, items')
        .eq('student_id', studentId)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(TALK_LESSON_LIMIT);
    if (error || !data) return [];
    return talksFromFlows(data as FlowRowLike[]);
}

/** 生徒の1枚の帯から作る時に、材料をまとめて読む。読めなければ null（呼ぶ側は今までの材料で作る） */
export async function loadPrepSource(
    supabase: SupabaseClient,
    studentId: string,
    opts: { withTalks: boolean },
): Promise<PrepSource | null> {
    const [{ data: student }, { data: lessons }] = await Promise.all([
        supabase.from('students').select('name, jlpt_level, textbook, memo, goal_text, purposes').eq('id', studentId).single(),
        recentLessonsQuery(supabase, studentId, 'date, status, topics, content, vocabulary, mistakes, homework, next_goal'),
    ]);
    if (!student) return null;
    const rows = (lessons ?? []) as unknown as LessonRowLike[];
    const talks = opts.withTalks ? await fetchTalks(supabase, studentId, talkSince(pastLessons(rows))) : [];
    return buildPrepSource(student as StudentLike, rows, talks);
}

/* ── ASTAへの頼み方 ───────────────────────────── */

const clip = (text: string | null | undefined, max: number): string => {
    const flat = (text ?? '').replace(/\s+/g, ' ').trim();
    return flat.length > max ? `${flat.slice(0, max)}…` : flat;
};

function freeTalkMaterials(src: PrepSource): string {
    const lessons = (src.recentLessons ?? []).map(l => {
        const parts = [
            l.topics && `内容: ${clip(l.topics, 150)}`,
            l.vocabulary && `語彙: ${clip(l.vocabulary, 120)}`,
            l.content && `メモ: ${clip(l.content, 200)}`,
            l.mistakes && `つまずき: ${clip(l.mistakes, 100)}`,
        ].filter(Boolean);
        return `- ${jstMonthDay(l.date)}: ${parts.length > 0 ? parts.join('／') : '記録の中身なし'}`;
    });
    const talks = (src.talks ?? []).map(t => `## ${jstMonthDay(t.date)} の授業\n${t.lines.map(l => `- ${l}`).join('\n')}`);
    return `# フリートークの材料（ネタは、ここに書いてあることからだけ作る）
## 生徒について
- メモ: ${clip(src.memo, 300) || 'なし'}
- 学習の目的: ${clip(src.goalText, 120) || 'なし'}
- 興味（体験レッスンで選んだ目的）: ${src.interest || 'なし'}

## 直近の授業の記録（新しい順・${RECENT_LESSON_LIMIT}回まで）
${lessons.length > 0 ? lessons.join('\n') : '- なし'}

## 授業中に生徒が話したこと（保存した授業の流れから・直近${TALK_LESSON_LIMIT}回・生徒の発話を日本語にした物）
${talks.length > 0 ? talks.join('\n') : '（保存された会話なし）'}

# フリートークのネタの決まり
- ${FREE_TALK_COUNT}つ作る。どのネタも、上の材料のどこかに根拠があること。材料に無い出来事・好み・予定・ニュースは作らない
- 会話の材料があれば、生徒が話した出来事や好きな物を優先する。材料が少ない時は、記録の「内容」「語彙」を生徒自身の生活に結びつけて聞く
- question は、先生が授業のはじめにそのまま読んで聞ける質問を1つ。生徒のレベル（${src.jlptLevel || '不明'}）で答えられる短い日本語
- follow_up は、生徒の答えを受けて続けて聞く質問を1つ
- grammar は、直近の記録に出てくる文法を1つ選んで書く。生徒がその文法を使って答えられるように question を作る（例：「〜たことがあります」を使ってほしいなら「〜たことがありますか？」と聞く）。記録に文法が見当たらない時は ""（空）にする
- basis は、どの日のどの話から作ったかを短く。日付は「10/3」の形（例：「10/3の会話『週末に京都へ行きました』」「10/1の記録の語彙『趣味』」「メモ『猫を飼っている』」）
- topic は、ネタの見出し（15字以内）
- 生徒が答えにくい話題（病気・お金・家族の不幸・政治・宗教など）は使わない`;
}

/** 答えのJSONの、フリートークのネタ1つの形 */
const FREE_TALK_SHAPE = '{"topic": "ネタの見出し", "question": "最初に聞く質問", "follow_up": "続けて聞く質問", "grammar": "答えで使ってほしい文法（無ければ空）", "basis": "どの日のどの話から作ったか"}';

export function buildPrepPrompt(src: PrepSource, opts: { freeTalk?: boolean } = {}): string {
    const freeTalk = opts.freeTalk === true;
    return `あなたはプロの日本語教師です。次の生徒の「今日の授業前の1枚」を作ってください。

# 生徒
- 名前: ${src.studentName}
- レベル: ${src.jlptLevel || '不明'}
- 使用教材・今の課: ${src.textbook || '未設定'}

# 前回の授業記録${src.lastDate ? `（${src.lastDate.slice(0, 10)}）` : '（まだ無し）'}
- やったこと: ${src.topics || 'なし'}
- つまずき: ${src.mistakes || 'なし'}
- 宿題: ${src.homework || 'なし'}
- 次回の目標: ${src.nextGoal || 'なし'}

# 決まり
- 記録に無いことは作り話をしない。記録が少ないときは、確かめる質問を導入の話題に入れる
- 先生はこれを見て、すぐ授業を始められること。抽象的な助言は書かない
- guide は「今日はここから入る」と分かる1〜2文（60字以内）
${freeTalk ? `\n${freeTalkMaterials(src)}\n` : ''}
出力は次のJSONだけ（前後に文章やコードの囲みを付けない）:
{
  "guide": "今日の進め方を1〜2文で",
  "review_quiz": [{"question": "問題文", "answer": "答え"}, {"question": "問題文", "answer": "答え"}, {"question": "問題文", "answer": "答え"}],
  "intro_topic": "授業の最初に話す短い導入（挨拶を含む話し言葉）",
  "advice": "今日気をつけること（前回のつまずきを踏まえて2〜3行）"${freeTalk ? `,
  "free_talk": [${Array.from({ length: FREE_TALK_COUNT }, () => FREE_TALK_SHAPE).join(', ')}]` : ''}
}`;
}

/** ASTAの答えのフリートークを、決まった形にそろえる（質問が無い物は捨てる・3つまで） */
export function normalizeFreeTalk(raw: unknown): FreeTalk[] {
    if (!Array.isArray(raw)) return [];
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
    return raw
        .map(r => (r && typeof r === 'object' ? (r as Record<string, unknown>) : {}))
        .map(r => ({ topic: str(r.topic), question: str(r.question), follow_up: str(r.follow_up), grammar: str(r.grammar), basis: str(r.basis) }))
        .filter(t => t.question.length > 0)
        .slice(0, FREE_TALK_COUNT);
}

/** ASTAに作ってもらい、この端末に保存して返す。freeTalk のときだけフリートークのネタも作る */
export async function generatePrepSheet(
    studentId: string,
    stamp: string,
    src: PrepSource,
    type: 'prep_plan' | 'prep_sheet' = 'prep_plan',
    opts: { freeTalk?: boolean } = {},
): Promise<PrepSheet> {
    const freeTalk = opts.freeTalk === true;
    const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrepPrompt(src, { freeTalk }), type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.details || data.error || '作れませんでした');
    const clean = String(data.text ?? '').replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(clean) as Omit<PrepSheet, 'free_talk'> & { free_talk?: unknown };
    if (!Array.isArray(parsed.review_quiz)) throw new Error('形が違います');
    const { free_talk: rawFreeTalk, ...rest } = parsed;
    // フリートーク無しで作った時は free_talk を持たない（作り直しの判定 missingFreeTalk が、それで見分ける）
    const sheet: PrepSheet = freeTalk ? { ...rest, free_talk: normalizeFreeTalk(rawFreeTalk) } : rest;
    savePrepSheet(studentId, stamp, sheet);
    return sheet;
}
