/**
 * 旅行のテキスト（2026-10-04 MTG・10/9 かずき決定・9-2・10/10 充実）
 *
 * 2026-10-10 かずき決定：レベル1を5→10場面、レベル2・3を各5場面、1場面を厚くする
 * （フレーズ12・使う場面4・会話2本・穴埋め8・文化のひとこと）
 *
 * - テキストの画面に「旅行」のタブ。レベル（3つ）→ 場面 → 5つの部分（フレーズ・使う場面・会話・文化のひとこと・穴埋め）
 * - 授業中の画面：下の段の「旅行」のボタン（場面を選ぶと授業の流れに場面のカード）と、
 *   左の「きょうの進め方」の「教科書｜旅行」の切り替え（場面の部分を手順として並べる）
 * - よみは教科書と同じ「漢字（かんじ）」の形。英語の訳を付ける
 * - 全員に見せる（ライト・一般の先生も・2026-10-05 かずき決定）
 * - 中身はアプリの中のファイル（content/travel/）。保管庫には入れない
 * ここは型と、並べ方・文にする処理だけ（テスト対象）。
 */
import { TRAVEL_LEVEL1 } from '@/content/travel/level1';
import { TRAVEL_LEVEL2 } from '@/content/travel/level2';
import { TRAVEL_LEVEL3 } from '@/content/travel/level3';

export type TravelLine = { ja: string; en: string };
export type TravelDialogueLine = { speaker: string; ja: string; en: string };
/** 会話1本（場面の中の1つの場面設定。題と行） */
export type TravelDialogue = { title: TravelLine; lines: TravelDialogueLine[] };
export type TravelBlank = { q: string; answer: string; en: string };

export type TravelScene = {
    id: string;
    /** 場面の名前（ふりがな付き） */
    title: string;
    subtitle: string;
    titleEn: string;
    /** この場面でできるようになること */
    goal: TravelLine;
    /** フレーズ（12） */
    phrases: TravelLine[];
    /** 使う場面（4） */
    usage: TravelLine[];
    /** 会話（2本） */
    dialogues: TravelDialogue[];
    /** 穴埋め（8） */
    blanks: TravelBlank[];
    /** 文化のひとこと */
    culture: TravelLine;
};

export type TravelLevel = {
    level: 1 | 2 | 3;
    label: string;
    /** だれ向けか */
    note: string;
    scenes: TravelScene[];
};

export const TRAVEL_LEVELS: TravelLevel[] = [
    { level: 1, label: 'レベル1', note: '初めて日本へ行く人（N5くらい）', scenes: TRAVEL_LEVEL1 },
    { level: 2, label: 'レベル2', note: '旅行に少し慣れた人（N4くらい）', scenes: TRAVEL_LEVEL2 },
    { level: 3, label: 'レベル3', note: '自分で旅を組み立てる人（N3くらい）', scenes: TRAVEL_LEVEL3 },
];

/** 場面の部分。穴埋めは答えを最後にまとめるので、いつも最後に置く */
export const TRAVEL_PARTS = [
    { key: 'phrases', label: 'フレーズ' },
    { key: 'usage', label: '使う場面' },
    { key: 'dialogues', label: '会話' },
    { key: 'culture', label: '文化のひとこと' },
    { key: 'blanks', label: '穴埋め' },
] as const;
export type TravelPartKey = (typeof TRAVEL_PARTS)[number]['key'];

/** 授業中の画面のカードで、穴埋めの答えを分ける印（この行より後が答え） */
export const TRAVEL_ANSWER_MARK = '―― 答え ――';

export function travelLevel(level: unknown): TravelLevel {
    return TRAVEL_LEVELS.find(l => String(l.level) === String(level)) ?? TRAVEL_LEVELS[0];
}

export function findTravelScene(id: string): { level: TravelLevel; scene: TravelScene } | null {
    for (const level of TRAVEL_LEVELS) {
        const scene = level.scenes.find(s => s.id === id);
        if (scene) return { level, scene };
    }
    return null;
}

const NUM = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫'];
const indent = (en: string) => `　 ${en}`;

/** 場面の1つの部分を、授業中の画面のカードに出す文にする（日本語の行の下に英語の行） */
export function travelPartText(scene: TravelScene, part: TravelPartKey): string {
    switch (part) {
        case 'phrases':
            return scene.phrases.map((p, i) => `${NUM[i] ?? `${i + 1}.`} ${p.ja}\n${indent(p.en)}`).join('\n');
        case 'usage':
            return scene.usage.map(u => `・${u.ja}\n${indent(u.en)}`).join('\n');
        case 'dialogues':
            return scene.dialogues
                .map((d, i) => [
                    `〈会話${i + 1}〉${d.title.ja}`,
                    indent(d.title.en),
                    ...d.lines.map(l => `${l.speaker}：${l.ja}\n${indent(l.en)}`),
                ].join('\n'))
                .join('\n\n');
        case 'culture':
            return `${scene.culture.ja}\n${indent(scene.culture.en)}`;
        case 'blanks': {
            const questions = scene.blanks.map((b, i) => `${i + 1}. ${b.q}\n${indent(b.en)}`).join('\n');
            const answers = scene.blanks.map((b, i) => `${i + 1}. ${b.answer}`).join('\n');
            return `${questions}\n${TRAVEL_ANSWER_MARK}\n${answers}`;
        }
    }
}

/** 場面の名前（ふりがな付き）とサブの名前をつなげた見出し */
export function travelSceneHeading(scene: TravelScene): string {
    return `${scene.title}：${scene.subtitle}`;
}

/** 場面まるごとを、授業中の画面のカードに出す文にする（部分を順に。穴埋めの答えは最後） */
export function travelSceneText(scene: TravelScene): string {
    const goal = `目標：${scene.goal.ja}\n${indent(scene.goal.en)}`;
    const parts = TRAVEL_PARTS.map(p => `【${p.label}】\n${travelPartText(scene, p.key)}`);
    // 穴埋めの答えは最後にまとめる（印の行より後）。途中の部分に答えの印が入らないよう、穴埋めは最後に置く
    return [goal, ...parts].join('\n\n');
}

/** カードの文を、答えの前と答えに分ける（答えが無ければ answers は null） */
export function splitTravelAnswers(text: string): { body: string; answers: string | null } {
    const i = text.indexOf(`\n${TRAVEL_ANSWER_MARK}\n`);
    if (i < 0) return { body: text, answers: null };
    return { body: text.slice(0, i), answers: text.slice(i + TRAVEL_ANSWER_MARK.length + 2) };
}
