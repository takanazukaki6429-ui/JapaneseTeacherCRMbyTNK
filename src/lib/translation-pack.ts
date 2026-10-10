/**
 * 追加パック（翻訳モード＋500分・買った日から90日で失効）の残りと、使った分の割り当て（2026-10-11 かずき決定）
 *
 * 規約・料金の画面・使い方には「500分・90日間有効・未使用分は返金しない」と書いてある。
 * 以前の作りは、期限内のパックの分数を毎月の上限にそのまま足していたため、月が変わると使った分が0に戻り、
 * 上限を超える先生はパック1つで月ごとに500分ずつ（最大4か月＝2,000分）使えた。
 * 直した後：プランの上限を超えて使った分を、期限の早いパックから順に「使った分」（used_ms）として記録し、
 * パックの残りから引く。月の上限は「プランの分＋パックの残り＋今月すでにパックから使った分」。
 */

export type PackRow = { id: number; minutes: number; expires_at: string; used_ms?: number | null };

const MS_PER_MIN = 60000;

/** 期限内のパックの残り（分） */
export function packRemainingMin(packs: PackRow[]): number {
    return packs.reduce((s, p) => s + Math.max(0, (Number(p.minutes) || 0) - Math.max(0, Number(p.used_ms) || 0) / MS_PER_MIN), 0);
}

/**
 * 今月の上限に足すパックの分（分）＝ パックの残り ＋ 今月すでにパックから使った分。
 * 今月パックから使った分は「今月の利用 − プランの上限」（プランの上限を超えた分は、全部パックから使ったため）
 */
export function packMinForMonth(planCapMin: number, usedMs: number, packs: PackRow[]): number {
    const usedFromPacksThisMonth = Math.max(0, usedMs / MS_PER_MIN - planCapMin);
    return packRemainingMin(packs) + usedFromPacksThisMonth;
}

/**
 * 1切れの音声のうち、プランの上限を超えた分を、期限の早いパックから順に割り当てる。
 * 戻り値は、使った分が増えるパックごとの新しい used_ms（増えないパックは入れない）
 */
export function allocatePackUsage(planCapMin: number, usedMsBefore: number, durationMs: number, packs: PackRow[]): { id: number; used_ms: number }[] {
    const capMs = planCapMin * MS_PER_MIN;
    const before = Math.max(0, usedMsBefore);
    const after = before + Math.max(0, durationMs);
    let overflow = Math.max(0, after - Math.max(before, capMs));
    const updates: { id: number; used_ms: number }[] = [];
    const byExpiry = [...packs].sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
    for (const p of byExpiry) {
        if (overflow <= 0) break;
        const used = Math.max(0, Number(p.used_ms) || 0);
        const left = (Number(p.minutes) || 0) * MS_PER_MIN - used;
        if (left <= 0) continue;
        const take = Math.min(left, overflow);
        updates.push({ id: p.id, used_ms: Math.round(used + take) });
        overflow -= take;
    }
    return updates;
}
