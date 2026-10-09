/**
 * アプリの中のマニュアル（2026-10-09 かずき決定・9-4）
 *
 * - 形：「使い方」のページ（/manual）を1つ作って全部をまとめ、各画面の右上の「？」からその画面の章を開く
 * - 範囲：先生が使う全部の画面
 * - 写真は使わず、文字とボタンの印（アプリの中と同じ印）だけ。画面を直しても、文を直すだけで済む
 * - 右下の「使い方ヘルプ」（AI）も、このマニュアルと同じ文を読んで答える（manualPlainText）
 *
 * ここは型・画面と章の対応・AIに渡す文の作り方だけ（テスト対象）。中身は content/manual/
 */

/** ボタンの印（アプリの中で使っている印と同じ物を出す）。印の絵は components/manual/manual-icons.tsx */
export const MANUAL_ICON_KEYS = [
    'home', 'students', 'materials', 'settings', 'manual', 'help',
    'play', 'prepare', 'record', 'edit', 'trash', 'share', 'map', 'hearing', 'plus', 'save', 'copy', 'external',
    'sparkles', 'send', 'mic', 'translate', 'book', 'practice', 'rephrase', 'travel', 'memo',
    'star', 'globe', 'calendar', 'shield', 'download', 'card',
] as const;
export type ManualIconKey = (typeof MANUAL_ICON_KEYS)[number];

/** 画面の中のボタン・欄（印と、画面に出ている名前） */
export type ManualButton = { icon?: ManualIconKey; label: string };

/** 1行の説明。ボタンがあれば先頭に印つきで出す */
export type ManualItem = { button?: ManualButton; text: string };

export type ManualBlock =
    | { type: 'text'; text: string }
    /** 番号つきの手順 */
    | { type: 'steps'; items: ManualItem[] }
    /** ボタン・欄の説明の並び */
    | { type: 'items'; items: ManualItem[] }
    /** 気をつけること */
    | { type: 'note'; text: string }
    /** プランによる違い（ライトでは使えない など） */
    | { type: 'plan'; text: string };

export type ManualSection = { heading: string; blocks: ManualBlock[] };

export type ManualChapter = {
    /** ページの中の位置（/manual#id）と、各画面の「？」が開く章の名前 */
    id: string;
    title: string;
    /** この画面でできること（1〜2文） */
    summary: string;
    /** この画面の開き方 */
    where?: string;
    sections: ManualSection[];
};

/**
 * 画面の住所 → 章。上から順に見て、最初に合った物。
 * 管理の画面とマニュアルの画面そのものには「？」を出さない（null）
 */
const PATH_TO_CHAPTER: [RegExp, string | null][] = [
    [/^\/manual(\/|$)/, null],
    [/^\/admin(\/|$)/, null],
    [/^\/students\/[^/]+\/lessons\/live(\/|$)/, 'live'],
    [/^\/students\/[^/]+\/lessons\/prepare(\/|$)/, 'prepare'],
    [/^\/students\/[^/]+\/lessons\/new(\/|$)/, 'record'],   // 記録を直す時も同じ画面（?lessonId=）
    [/^\/students\/[^/]+\/initial-hearing(\/|$)/, 'hearing'],
    [/^\/students\/[^/]+\/roadmap(\/|$)/, 'roadmap'],
    [/^\/students\/new(\/|$)/, 'students'],
    [/^\/students\/[^/]+(\/edit)?\/?$/, 'student'],
    [/^\/students\/?$/, 'students'],
    [/^\/materials\/textbook(\/|$)/, 'textbook'],
    [/^\/materials\/travel(\/|$)/, 'travel'],
    [/^\/materials(\/|$)/, 'materials'],
    [/^\/settings\/billing(\/|$)/, 'plans'],
    [/^\/settings(\/|$)/, 'settings'],
    [/^\/$/, 'home'],
    // 授業の一覧（/lessons）と AIツール（/ai-tools）は、画面からの入口が無いので章を持たない（null＝マニュアルの最初を開く）
];

/** 今の画面の章（無ければ null＝マニュアルの最初を開く） */
export function chapterIdForPath(pathname: string | null | undefined): string | null {
    if (!pathname) return null;
    for (const [re, id] of PATH_TO_CHAPTER) {
        if (re.test(pathname)) return id;
    }
    return null;
}

/** 「？」を出す画面か（マニュアルの画面と管理の画面には出さない） */
export function showsScreenHelp(pathname: string | null | undefined): boolean {
    if (!pathname) return false;
    return !/^\/(manual|admin)(\/|$)/.test(pathname);
}

export function findChapter(chapters: ManualChapter[], id: string | null | undefined): ManualChapter | null {
    if (!id) return null;
    return chapters.find(c => c.id === id) ?? null;
}

const buttonText = (b: ManualButton) => `［${b.label}］`;
const itemText = (it: ManualItem) => (it.button ? `${buttonText(it.button)} ${it.text}` : it.text);

function blockText(b: ManualBlock): string {
    switch (b.type) {
        case 'text': return b.text;
        case 'steps': return b.items.map((it, i) => `${i + 1}. ${itemText(it)}`).join('\n');
        case 'items': return b.items.map(it => `・${itemText(it)}`).join('\n');
        case 'note': return `（気をつけること）${b.text}`;
        case 'plan': return `（プランによる違い）${b.text}`;
    }
}

/** 1つの章を、AIに渡す文にする（ボタンは［名前］の形） */
export function chapterPlainText(c: ManualChapter): string {
    const head = [`## ${c.title}`, c.summary, c.where ? `開き方：${c.where}` : null].filter(Boolean).join('\n');
    const body = c.sections.map(s => `### ${s.heading}\n${s.blocks.map(blockText).join('\n')}`).join('\n\n');
    return `${head}\n\n${body}`;
}

/** マニュアル全部を、AIに渡す文にする（使い方ヘルプが読む） */
export function manualPlainText(chapters: ManualChapter[]): string {
    return chapters.map(chapterPlainText).join('\n\n');
}
