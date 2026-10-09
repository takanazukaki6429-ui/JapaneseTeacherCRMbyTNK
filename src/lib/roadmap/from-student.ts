/**
 * 生徒の記録（students の1行）からロードマップの材料を作る
 *
 * 先生用ロードマップ画面と、生徒に渡すリンク先の画面で同じ計算を使うための共通部品。
 * 授業で先生が今のレベル（jlpt_level）を更新すると、どちらの画面も最新の値で作り直される。
 *
 * - 今のレベル：jlpt_level（N5〜N1）を 0〜100 の目盛りに置き換える
 * - 目標と期間：体験レッスンの保存時に current_phase へ書かれる「目標Lv.70」「6ヶ月」を読む
 * - 目的：purposes（9択。体験レッスンで2つ以上選ぶと「travel,work」の形で入る）。9択以外の値は使わない
 *   （2026-10-09：前は1つの時しか読まず、2つ以上選ぶとロードマップと生徒に渡すリンクで目的が消えていた）
 */
import { PURPOSE_ICONS } from './constants';
import type { PurposeId } from './types';
import type { Locale } from '@/app/(main)/roadmap/i18n';
import { nationalityToLangCode } from '@/lib/nationality';

export const JLPT_TO_SCORE: Record<string, number> = {
    N5: 15, N4: 30, N3: 50, N2: 70, N1: 90,
};

export function parseCurrentPhase(phase: string | null | undefined) {
    if (!phase) return {};
    const lvMatch = phase.match(/目標Lv\.(\d+)/);
    const moMatch = phase.match(/(\d+)ヶ月/);
    return {
        targetLevel: lvMatch ? parseInt(lvMatch[1], 10) : undefined,
        periodMonths: moMatch ? parseInt(moMatch[1], 10) : undefined,
    };
}

export type RoadmapInput = {
    currentLevel: number;
    targetLevel: number;
    periodMonths: number;
    purposeIds: PurposeId[];
};

type StudentLike = {
    jlpt_level?: string | null;
    current_phase?: string | null;
    purposes?: string | null;
};

/** purposes の文（「travel」「travel,work」）から、9択の目的を取り出す（重なり・9択以外は落とす） */
export function parsePurposeIds(raw: string | null | undefined): PurposeId[] {
    if (!raw) return [];
    const ids = raw.split(/[,、\s]+/).map(s => s.trim()).filter(s => s in PURPOSE_ICONS);
    return [...new Set(ids)] as PurposeId[];
}

/** ロードマップを作れるだけの材料がそろっていなければ null */
export function roadmapInputFromStudent(student: StudentLike | null | undefined): RoadmapInput | null {
    if (!student) return null;
    const currentLevel = student.jlpt_level ? JLPT_TO_SCORE[student.jlpt_level] : undefined;
    const { targetLevel, periodMonths } = parseCurrentPhase(student.current_phase);
    if (!currentLevel || !targetLevel || !periodMonths) return null;
    return { currentLevel, targetLevel, periodMonths, purposeIds: parsePurposeIds(student.purposes) };
}

/**
 * 国籍から、生徒に渡すロードマップの表示言語を決める（先生が画面で変えられる初期値）
 * 授業後の振り返り用の対応表（lib/nationality.ts）は6言語までなので、
 * ロードマップだけにある4言語（ドイツ語・タイ語・ベトナム語・インドネシア語）をここで先に見る。
 */
const EXTRA_ROADMAP_LOCALES: Record<string, Locale> = {
    'ドイツ': 'de', 'オーストリア': 'de', 'Germany': 'de', 'Austria': 'de',
    'タイ': 'th', 'Thailand': 'th',
    'ベトナム': 'vi', 'Vietnam': 'vi', 'Viet Nam': 'vi',
    'インドネシア': 'id', 'Indonesia': 'id',
};

export function roadmapLocaleForNationality(nationality: string | null | undefined): Locale {
    const trimmed = nationality?.trim() ?? '';
    return EXTRA_ROADMAP_LOCALES[trimmed] ?? (nationalityToLangCode(trimmed) as Locale);
}
