import { describe, it, expect } from 'vitest';
import {
    TRAVEL_ANSWER_MARK,
    TRAVEL_LEVELS,
    TRAVEL_PARTS,
    findTravelScene,
    splitTravelAnswers,
    travelLevel,
    travelPartText,
    travelSceneText,
    type TravelScene,
} from '../travel';

const LEVEL1 = TRAVEL_LEVELS[0];

/** 場面の中の日本語の文を全部集める */
function jaTexts(sc: TravelScene): string[] {
    return [
        sc.title, sc.subtitle, sc.goal.ja,
        ...sc.phrases.map(p => p.ja),
        ...sc.usage.map(u => u.ja),
        ...sc.dialogue.flatMap(d => [d.speaker, d.ja]),
        ...sc.blanks.flatMap(b => [b.q, b.answer]),
    ];
}

describe('旅行のテキスト レベル1（2026-10-09 かずき決定の5場面）', () => {
    it('5場面：空港・ホテル・レストラン・買い物・電車と道', () => {
        expect(LEVEL1.level).toBe(1);
        expect(LEVEL1.scenes.map(s => s.id)).toEqual(['airport', 'hotel', 'restaurant', 'shopping', 'train']);
    });

    it('どの場面も、フレーズ8つ・使う場面3つ以上・会話6行以上・穴埋め5問', () => {
        for (const sc of LEVEL1.scenes) {
            expect(sc.phrases, sc.id).toHaveLength(8);
            expect(sc.usage.length, sc.id).toBeGreaterThanOrEqual(3);
            expect(sc.dialogue.length, sc.id).toBeGreaterThanOrEqual(6);
            expect(sc.blanks, sc.id).toHaveLength(5);
        }
    });

    it('日本語と英語の訳が空でない', () => {
        for (const sc of LEVEL1.scenes) {
            const lines = [sc.goal, ...sc.phrases, ...sc.usage, ...sc.dialogue, ...sc.blanks];
            for (const l of lines) {
                expect(l.en.trim().length, `${sc.id}: ${JSON.stringify(l)}`).toBeGreaterThan(0);
            }
            for (const t of jaTexts(sc)) expect(t.trim().length, sc.id).toBeGreaterThan(0);
            expect(sc.titleEn.trim().length).toBeGreaterThan(0);
        }
    });

    it('穴埋めの問題には（　　）がある', () => {
        for (const sc of LEVEL1.scenes) {
            for (const b of sc.blanks) expect(b.q, `${sc.id}: ${b.q}`).toContain('（　　）');
        }
    });

    it('漢字には、すぐ後ろにふりがな（ひらがな）が付いている（教科書と同じ形）', () => {
        for (const sc of LEVEL1.scenes) {
            for (const t of jaTexts(sc)) {
                // 漢字の並び（まるごと）の直後が「（」でない所＝ふりがなの付け忘れ
                const missing = [...t.matchAll(/[一-龥々ヶ]+/g)]
                    .filter(m => t[(m.index ?? 0) + m[0].length] !== '（')
                    .map(m => m[0]);
                expect(missing, `${sc.id}: ${t}`).toEqual([]);
                // ふりがなの中身はひらがなだけ
                for (const m of t.matchAll(/[一-龥々ヶ]+（([^）]*)）/g)) {
                    expect(m[1], `${sc.id}: ${t}`).toMatch(/^[ぁ-んー]+$/);
                }
                // 括弧の数がそろっている
                expect((t.match(/（/g) ?? []).length, `${sc.id}: ${t}`).toBe((t.match(/）/g) ?? []).length);
            }
        }
    });
});

describe('授業中の画面のカードの文', () => {
    const airport = LEVEL1.scenes[0];

    it('部分ごとに、日本語の行の下に英語の行', () => {
        const text = travelPartText(airport, 'phrases');
        expect(text).toContain('① 観光（かんこう）です。\n　 It’s for sightseeing.');
        expect(travelPartText(airport, 'dialogue')).toContain('係員（かかりいん）：パスポートをお願（ねが）いします。');
    });

    it('穴埋めは、答えを印の後ろにまとめる。分けると答えが別になる', () => {
        const text = travelPartText(airport, 'blanks');
        expect(text).toContain(TRAVEL_ANSWER_MARK);
        const { body, answers } = splitTravelAnswers(text);
        expect(body).toContain('1. 旅行（りょこう）の目的（もくてき）は（　　）です。');
        expect(body).not.toContain('観光（かんこう）\n');
        expect(answers).toBe('1. 観光（かんこう）\n2. います\n3. どこ\n4. 泊（と）まります\n5. お願（ねが）いします');
    });

    it('場面まるごとの文には、目標と4つの部分が順に入り、答えは最後', () => {
        const text = travelSceneText(airport);
        const order = ['目標：', ...TRAVEL_PARTS.map(p => `【${p.label}】`)].map(k => text.indexOf(k));
        expect(order.every(i => i >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        const { answers } = splitTravelAnswers(text);
        expect(answers?.startsWith('1. 観光（かんこう）')).toBe(true);
    });

    it('答えの無い文は、そのまま', () => {
        expect(splitTravelAnswers('こんにちは')).toEqual({ body: 'こんにちは', answers: null });
    });
});

describe('探す・選ぶ', () => {
    it('場面の id から、場面とレベルが分かる', () => {
        expect(findTravelScene('train')?.level.level).toBe(1);
        expect(findTravelScene('nothing')).toBeNull();
    });
    it('レベルの指定がおかしければレベル1', () => {
        expect(travelLevel('2').level).toBe(2);
        expect(travelLevel('x').level).toBe(1);
        expect(travelLevel(undefined).level).toBe(1);
    });
});
