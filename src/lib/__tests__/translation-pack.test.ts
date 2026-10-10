import { describe, it, expect } from 'vitest';
import { allocatePackUsage, packMinForMonth, packRemainingMin, type PackRow } from '../translation-pack';

const MIN = 60000;
const pack = (id: number, expires: string, usedMin = 0, minutes = 500): PackRow => ({ id, minutes, expires_at: expires, used_ms: usedMin * MIN });

describe('追加パック：500分を90日のうちに使い切る（2026-10-11 かずき決定）', () => {
    it('買った月：プランの上限を超えた分だけパックから使い、上限は「プラン＋500分」のまま', () => {
        // ライト2,580分・今月2,700分使った・パックからはすでに120分使った
        const packs = [pack(1, '2027-01-18T00:00:00Z', 120)];
        expect(packRemainingMin(packs)).toBe(380);
        expect(packMinForMonth(2580, 2700 * MIN, packs)).toBe(500);   // 残り380＋今月パックから使った120
    });

    it('次の月：使った分は戻らない（残りの380分だけ足す）', () => {
        const packs = [pack(1, '2027-01-18T00:00:00Z', 120)];
        expect(packMinForMonth(2580, 0, packs)).toBe(380);
        expect(packMinForMonth(2580, 1000 * MIN, packs)).toBe(380);   // プランの中で使っている間は、パックは減らない
    });

    it('使い切ったパックは0分。月が変わっても足されない', () => {
        const packs = [pack(1, '2027-01-18T00:00:00Z', 500)];
        expect(packMinForMonth(2580, 0, packs)).toBe(0);
    });

    it('プランの上限を超えた分だけを、期限の早いパックから割り当てる', () => {
        const packs = [pack(2, '2027-02-01T00:00:00Z'), pack(1, '2027-01-18T00:00:00Z', 498)];
        // 今月2,575分使った後に、10分の音声 → 上限を超えたのは5分。期限の早い1番の残り2分 → 次に2番から3分
        expect(allocatePackUsage(2580, 2575 * MIN, 10 * MIN, packs)).toEqual([
            { id: 1, used_ms: 500 * MIN },
            { id: 2, used_ms: 3 * MIN },
        ]);
    });

    it('プランの中で使っている間は、パックは減らない', () => {
        expect(allocatePackUsage(2580, 100 * MIN, 1 * MIN, [pack(1, '2027-01-18T00:00:00Z')])).toEqual([]);
    });

    it('すでに上限を超えている時は、その1切れの全部をパックから使う', () => {
        expect(allocatePackUsage(2580, 2600 * MIN, 6000, [pack(1, '2027-01-18T00:00:00Z', 20)])).toEqual([
            { id: 1, used_ms: 20 * MIN + 6000 },
        ]);
    });

    it('前の作り（毎月500分ずつ）の穴が無いこと：4か月とも上限まで使っても、パックから使えるのは合わせて500分', () => {
        let packs = [pack(1, '2027-01-29T00:00:00Z')];
        let fromPacks = 0;
        for (let month = 0; month < 4; month++) {
            let used = 0;
            // その月の上限に届くまで、10秒ずつ使う
            for (;;) {
                const cap = 2580 + packMinForMonth(2580, used, packs);
                if (used / MIN >= cap) break;
                const updates = allocatePackUsage(2580, used, 10000, packs);
                for (const u of updates) {
                    fromPacks += u.used_ms - (Number(packs.find(p => p.id === u.id)?.used_ms) || 0);
                    packs = packs.map(p => (p.id === u.id ? { ...p, used_ms: u.used_ms } : p));
                }
                used += 10000;
            }
        }
        expect(fromPacks / MIN).toBe(500);
    });
});
