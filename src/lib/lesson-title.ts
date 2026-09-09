/**
 * 教科書の課名の整形（2026-09-10）
 *
 * 教材の元データには課名に英語が貼り付いているものがある。
 * 例：「義務・制約Lesson 2: Obligation and Constraint」
 * 先生（日本人）が見る画面では日本語だけにする。
 *
 * ただし94課のうち19課は日本語の課名が最初から無く英語だけなので、
 * 落とすと空になる。その場合は元のまま返す（空欄を出すより良い）。
 * 元データ側に日本語の課名を入れるのは別作業。
 */

/** 課名から貼り付いた英語を落とす。日本語が残らない場合は元のまま返す */
export function cleanLessonTitle(title: string | null | undefined): string {
    if (!title) return '';
    const hasJapanese = (s: string) => /[ぁ-んァ-ン一-龥]/.test(s);
    if (!hasJapanese(title)) return title.trim();

    let s = title.split(/\s*Lesson\s*\d+\s*[:：]/)[0];          // 「Lesson 12: …」以降を落とす
    s = s.replace(/\s*[A-Za-z][A-Za-z\s,&'\-.()]{6,}\s*$/, ''); // 末尾に残った英語の句を落とす
    s = s.trim();
    return hasJapanese(s) ? s : title.trim();
}
