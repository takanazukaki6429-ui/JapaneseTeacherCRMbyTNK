/**
 * 先生の表示名（2026-10-09 かずき決定：設定の画面で変えられるようにする）
 *
 * 表示名は、ホームの見出し（「○○先生、お疲れさまです」）と左の並びの先生の名前に出る。
 * 設定で変えた時は、左の並びにもその場で知らせる（DISPLAY_NAME_EVENT）。
 */

/** 表示名の長さの上限 */
export const DISPLAY_NAME_MAX = 30;

/** 設定で表示名を変えた時に、左の並びへ知らせる合図の名前 */
export const DISPLAY_NAME_EVENT = 'asta:display-name';

/** 前後の空白を落とし、続く空白を1つにする。空・長すぎる時は null（保存しない） */
export function normalizeDisplayName(raw: string): string | null {
    const name = raw.replace(/\s+/g, ' ').trim();
    if (!name || name.length > DISPLAY_NAME_MAX) return null;
    return name;
}
