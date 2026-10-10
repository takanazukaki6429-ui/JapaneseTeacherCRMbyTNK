/**
 * 本番へ入れた時の、既存の先生へのお知らせ（2026-10-10 かずき決定）
 *
 * - 出す相手：既存の無料の先生（無料の印 is_free がある先生・33人前後）。新しく登録する先生には出さない
 *   （「今まで使えていた機能はこれまでどおり無料」が当てはまらないため）
 * - 出す場所：ホームの一番上の帯（閉じるボタン付き）
 * - 出す期間：閉じるまで。ただし施行日（本番へ入れる日）から30日たったら自動で消す。閉じたことは、その端末に覚える
 * - あいちゃんからも LINE などで同じ内容を伝える（strategy/お知らせ_既存の先生へ_更新と規約_2026-10-10.md）
 * ここは判定だけ（テスト対象）。帯は components/home/release-notice.tsx
 */
import { todayJst } from '@/lib/course';

/** お知らせの名前（閉じたことを端末に覚える時の名前にも使う） */
export const RELEASE_NOTICE_ID = 'release-2026-10';

/** お知らせを出す日数（施行日から） */
export const RELEASE_NOTICE_DAYS = 30;

/** 閉じたことを覚える名前（その端末の中） */
export const releaseNoticeDismissKey = (id: string = RELEASE_NOTICE_ID) => `asta_notice_dismissed_${id}`;

/** 「2026年10月12日」の形を「2026-10-12」にする。読めなければ null */
export function parseJpDate(text: string | null | undefined): string | null {
    const m = /^\s*(\d{4})年(\d{1,2})月(\d{1,2})日\s*$/.exec(text ?? '');
    if (!m) return null;
    const [, y, mo, d] = m;
    const month = Number(mo), day = Number(d);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return `${y}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 「YYYY-MM-DD」に日数を足す（日本時間の暦の上で） */
function addDaysYmd(ymd: string, days: number): string {
    const d = new Date(`${ymd}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().slice(0, 10);
}

/** お知らせを出すか：既存の無料の先生で、閉じておらず、施行日から30日の間（日本時間） */
export function showReleaseNotice(input: {
    isFree: boolean;
    effectiveDate: string;
    dismissed: boolean;
    now?: Date;
}): boolean {
    if (!input.isFree || input.dismissed) return false;
    const start = parseJpDate(input.effectiveDate);
    if (!start) return false;
    const today = todayJst(input.now);
    return today >= start && today < addDaysYmd(start, RELEASE_NOTICE_DAYS);
}
