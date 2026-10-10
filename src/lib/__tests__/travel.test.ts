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

const [LEVEL1, LEVEL2, LEVEL3] = TRAVEL_LEVELS;
const ALL_SCENES = TRAVEL_LEVELS.flatMap(l => l.scenes);

/** 場面の中の日本語の文を全部集める */
function jaTexts(sc: TravelScene): string[] {
    return [
        sc.title, sc.subtitle, sc.goal.ja, sc.culture.ja,
        ...sc.phrases.map(p => p.ja),
        ...sc.usage.map(u => u.ja),
        ...sc.dialogues.flatMap(d => [d.title.ja, ...d.lines.flatMap(l => [l.speaker, l.ja])]),
        ...sc.blanks.flatMap(b => [b.q, b.answer]),
    ];
}

/** 場面の中の英語の訳を全部集める */
function enTexts(sc: TravelScene): string[] {
    return [
        sc.titleEn, sc.goal.en, sc.culture.en,
        ...sc.phrases.map(p => p.en),
        ...sc.usage.map(u => u.en),
        ...sc.dialogues.flatMap(d => [d.title.en, ...d.lines.map(l => l.en)]),
        ...sc.blanks.map(b => b.en),
    ];
}

describe('旅行のテキスト（2026-10-10 かずき決定：レベル1を10場面・レベル2と3を各5場面）', () => {
    it('レベル1：今までの5場面に、コンビニ・タクシー・観光地・病院と薬局・困った時を足した10場面', () => {
        expect(LEVEL1.level).toBe(1);
        expect(LEVEL1.scenes.map(s => s.id)).toEqual([
            'airport', 'hotel', 'restaurant', 'shopping', 'train',
            'convenience', 'taxi', 'sightseeing', 'clinic', 'trouble',
        ]);
    });
    it('レベル2（N4くらい）とレベル3（N3くらい）が各5場面', () => {
        expect(LEVEL2.scenes.map(s => s.id)).toEqual(['ryokan', 'tourist_info', 'reservation', 'izakaya', 'shinkansen']);
        expect(LEVEL3.scenes.map(s => s.id)).toEqual(['smalltalk', 'complaint', 'homestay', 'local_transport', 'experience']);
        expect(LEVEL2.note).toContain('N4');
        expect(LEVEL3.note).toContain('N3');
    });
    it('場面の名前（id）は、全部のレベルで重ならない', () => {
        const ids = ALL_SCENES.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('どの場面も、フレーズ12・使う場面4・会話2本（それぞれ6〜12行。前からの会話は11行の物がある）・穴埋め8・文化のひとこと', () => {
        for (const sc of ALL_SCENES) {
            expect(sc.phrases, sc.id).toHaveLength(12);
            expect(sc.usage, sc.id).toHaveLength(4);
            expect(sc.dialogues, sc.id).toHaveLength(2);
            for (const d of sc.dialogues) {
                expect(d.lines.length, `${sc.id}: ${d.title.ja}`).toBeGreaterThanOrEqual(6);
                expect(d.lines.length, `${sc.id}: ${d.title.ja}`).toBeLessThanOrEqual(12);
            }
            expect(sc.blanks, sc.id).toHaveLength(8);
            expect(sc.culture.ja.trim().length, sc.id).toBeGreaterThan(0);
        }
    });

    it('日本語と英語の訳が空でない。英語の訳に日本語が混ざっていない', () => {
        for (const sc of ALL_SCENES) {
            for (const t of jaTexts(sc)) expect(t.trim().length, sc.id).toBeGreaterThan(0);
            for (const t of enTexts(sc)) {
                expect(t.trim().length, `${sc.id}: 英語が空`).toBeGreaterThan(0);
                expect(t, `${sc.id}: ${t}`).not.toMatch(/[ぁ-んァ-ヶ一-龥]/);
            }
        }
    });

    it('穴埋めの問題には（　　）が1つある', () => {
        for (const sc of ALL_SCENES) {
            for (const b of sc.blanks) expect(b.q.split('（　　）').length - 1, `${sc.id}: ${b.q}`).toBe(1);
        }
    });

    it('漢字には、すぐ後ろにふりがな（ひらがな）が付いている（教科書と同じ形）', () => {
        for (const sc of ALL_SCENES) {
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

    it('今までのレベル1の5場面は、前からのフレーズ・会話・穴埋めがそのまま先頭に残っている', () => {
        const airport = LEVEL1.scenes[0];
        expect(airport.phrases[0]).toEqual({ ja: '観光（かんこう）です。', en: 'It’s for sightseeing.' });
        expect(airport.dialogues[0].lines[0].ja).toBe('パスポートをお願（ねが）いします。');
        expect(airport.blanks[0].q).toBe('旅行（りょこう）の目的（もくてき）は（　　）です。');
    });
});

describe('授業中の画面のカードの文', () => {
    const airport = LEVEL1.scenes[0];

    it('部分ごとに、日本語の行の下に英語の行', () => {
        const text = travelPartText(airport, 'phrases');
        expect(text).toContain('① 観光（かんこう）です。\n　 It’s for sightseeing.');
        expect(text).toContain('⑫ ');
        expect(travelPartText(airport, 'dialogues')).toContain('係員（かかりいん）：パスポートをお願（ねが）いします。');
    });

    it('会話は2本とも、題を付けて出す', () => {
        const text = travelPartText(airport, 'dialogues');
        expect(text).toContain(`〈会話1〉${airport.dialogues[0].title.ja}`);
        expect(text).toContain(`〈会話2〉${airport.dialogues[1].title.ja}`);
    });

    it('文化のひとことは、日本語の下に英語', () => {
        expect(travelPartText(airport, 'culture')).toBe(`${airport.culture.ja}\n　 ${airport.culture.en}`);
    });

    it('穴埋めは、答えを印の後ろにまとめる。分けると答えが別になる', () => {
        const text = travelPartText(airport, 'blanks');
        expect(text).toContain(TRAVEL_ANSWER_MARK);
        const { body, answers } = splitTravelAnswers(text);
        expect(body).toContain('1. 旅行（りょこう）の目的（もくてき）は（　　）です。');
        expect(body).not.toContain('観光（かんこう）\n');
        expect(answers?.startsWith('1. 観光（かんこう）\n2. います\n3. どこ\n4. 泊（と）まります\n5. お願（ねが）いします\n6. ')).toBe(true);
        expect(answers?.split('\n')).toHaveLength(8);
    });

    it('場面まるごとの文には、目標と5つの部分が順に入り、答えは最後', () => {
        const text = travelSceneText(airport);
        const order = ['目標：', ...TRAVEL_PARTS.map(p => `【${p.label}】`)].map(k => text.indexOf(k));
        expect(order.every(i => i >= 0)).toBe(true);
        expect([...order].sort((a, b) => a - b)).toEqual(order);
        expect(TRAVEL_PARTS[TRAVEL_PARTS.length - 1].key).toBe('blanks');
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
        expect(findTravelScene('ryokan')?.level.level).toBe(2);
        expect(findTravelScene('homestay')?.level.level).toBe(3);
        expect(findTravelScene('nothing')).toBeNull();
    });
    it('レベルの指定がおかしければレベル1', () => {
        expect(travelLevel('2').level).toBe(2);
        expect(travelLevel('3').level).toBe(3);
        expect(travelLevel('x').level).toBe(1);
        expect(travelLevel(undefined).level).toBe(1);
    });
});
