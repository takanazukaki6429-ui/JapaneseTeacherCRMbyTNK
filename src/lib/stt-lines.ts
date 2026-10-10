/**
 * 翻訳モード（生徒の声）の指示文と、答えの読み取り（2026-10-11 かずき決定・原価を下げる直し）
 *
 * 以前は答えを JSON（{"original","japanese","language"}）で書かせていた。
 * 同じ音声50本の試験（my-company/03/strategy/検証_翻訳モードの原価の直し_2026-10-11）で分かったこと：
 *  - JSON だと、日本語を「\u3059」のような記号の並びで書く回が100回中18回あった。
 *    記号は1文字で約6倍の量になり、その分が答えの単価で課金される。記号の書き損じで文字化けも出た
 *    （「駅はどこですか【？】」「同じに胞えます」、別の書き方では訳がまるごと「禁づとても奸しいです」）
 *  - 生徒が日本語で話した時も訳の欄に同じ文を書かせていた（コードは捨てていた）
 * 「O:」「J:」の札を付けた2行の文で書かせる形にすると、記号書き0・捏造0（声なし17本×6回）・
 * 聞き取りの誤りは今と同じで、声のある音声1分あたりの費用が ¥0.78 → ¥0.40 になった。
 * 指示文を短くした版は、雑音から「Sensei, thank you.」などを作った（51回中3回）ので使わない。
 */

/** 生徒の声1切れに付ける指示（試験で通った文そのまま。文脈は最後に足す） */
export function buildGeminiSttPrompt(studentLanguage: string, context: string): string {
    const contextLine = context
        ? `\nThe student's previous segment (already transcribed) was: "${context}". This audio may continue that sentence. Put ONLY this audio's words on the O line, but make the J line the natural Japanese translation of the previous segment and this audio combined.`
        : '';
    return `This audio is a short segment of a language student speaking to their Japanese teacher during an online lesson. The student's native language is ${studentLanguage}; they may also speak English or Japanese.
Answer in exactly two lines:
O: the exact transcript of what is said (keep the original language)
J: the natural Japanese translation. If the speech is Japanese, leave J empty.
If there is no clear human speech (silence, noise, music, unintelligible sound), answer "O:" and "J:" with nothing after them.
Never guess or invent words that are not clearly audible. If only part of a sentence is audible, transcribe only that part.
IMPORTANT: Fabrication is the worst possible failure. Background noise, hiss, hum, wind, static, or music is NOT speech. When in doubt, leave both empty. It is always better to output nothing than to invent a sentence.${contextLine}`;
}

/**
 * 「O: …」「J: …」の2行を読む。札の「O:」が無い答えは形が崩れているので null（呼ぶ側でやり直す）。
 * 行が途中で折り返されていても、O は J の札の前まで、J は最後までを1行にまとめる
 */
export function parseSttLines(raw: string): { original: string; japanese: string } | null {
    const oMatch = /^[ \t]*O:/m.exec(raw);
    if (!oMatch) return null;
    const afterO = raw.slice(oMatch.index + oMatch[0].length);
    const jMatch = /^[ \t]*J:/m.exec(afterO);
    const oPart = jMatch ? afterO.slice(0, jMatch.index) : afterO;
    const jPart = jMatch ? afterO.slice(jMatch.index + jMatch[0].length) : '';
    const oneLine = (s: string) => s.replace(/\s*\n\s*/g, ' ').trim();
    return { original: oneLine(oPart), japanese: oneLine(jPart) };
}

/** ひらがな・カタカナを含むか（漢字だけの文は中国語と区別できないので数えない） */
export function hasKana(text: string): boolean {
    return /[\u3041-\u3096\u30a1-\u30fa\u30fc]/.test(text);
}

/**
 * 生徒が日本語で話した文か。かなを含み、日本語の文字（かな・漢字）がローマ字以上の時だけ日本語とみなす。
 * 英語の文に「ありがとう」などが混ざっただけの時は日本語とみなさず、訳を出す
 */
export function isJapaneseSpeech(text: string): boolean {
    if (!hasKana(text)) return false;
    const japaneseChars = (text.match(/[\u3041-\u3096\u30a1-\u30fa\u30fc\u4e00-\u9fff]/g) ?? []).length;
    const latinChars = (text.match(/[A-Za-z]/g) ?? []).length;
    return japaneseChars >= latinChars;
}
