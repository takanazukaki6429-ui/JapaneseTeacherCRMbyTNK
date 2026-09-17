/**
 * 授業前の1枚（2026-09-17 かずき決定：自動で作る）
 *
 * ASTAが、前回の授業記録から「今日の指針・復習クイズ・導入の話題・気をつけること」を作る。
 * - 作る・保存する・読み出すをここ1か所にまとめ、生徒の1枚（帯）と授業前の準備の画面が同じ物を使う
 * - 保存はこの端末の中（localStorage）。最新の授業記録の日付ごとに分けて持つので、新しい記録が入れば作り直される
 * - ライブ授業の「授業前のメモ」は、これまでどおり prep_content_<生徒> を読むので、その名前でも保存する
 */
export type PrepQuiz = { question: string; answer: string };

export type PrepSheet = {
    /** 生徒の1枚の帯に出す一文（今日どう進めるか） */
    guide?: string;
    review_quiz: PrepQuiz[];
    intro_topic: string;
    advice: string;
};

export type PrepSource = {
    studentName: string;
    jlptLevel?: string | null;
    textbook?: string | null;
    lastDate?: string | null;
    topics?: string | null;
    mistakes?: string | null;
    homework?: string | null;
    nextGoal?: string | null;
};

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

export function buildPrepPrompt(src: PrepSource): string {
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

出力は次のJSONだけ（前後に文章やコードの囲みを付けない）:
{
  "guide": "今日の進め方を1〜2文で",
  "review_quiz": [{"question": "問題文", "answer": "答え"}, {"question": "問題文", "answer": "答え"}, {"question": "問題文", "answer": "答え"}],
  "intro_topic": "授業の最初に話す短い導入（挨拶を含む話し言葉）",
  "advice": "今日気をつけること（前回のつまずきを踏まえて2〜3行）"
}`;
}

/** ASTAに作ってもらい、この端末に保存して返す */
export async function generatePrepSheet(
    studentId: string,
    stamp: string,
    src: PrepSource,
    type: 'prep_plan' | 'prep_sheet' = 'prep_plan',
): Promise<PrepSheet> {
    const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: buildPrepPrompt(src), type }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.details || data.error || '作れませんでした');
    const clean = String(data.text ?? '').replace(/```json/g, '').replace(/```/g, '').trim();
    const sheet = JSON.parse(clean) as PrepSheet;
    if (!Array.isArray(sheet.review_quiz)) throw new Error('形が違います');
    savePrepSheet(studentId, stamp, sheet);
    return sheet;
}
