import { describe, it, expect } from 'vitest';
import {
    FREE_TALK_COUNT,
    RECENT_LESSON_LIMIT,
    TALK_CHARS_PER_LESSON,
    buildPrepPrompt,
    buildPrepSource,
    missingFreeTalk,
    normalizeFreeTalk,
    pastLessons,
    prepStamp,
    studentLines,
    talkSince,
    talksFromFlows,
    type PrepSheet,
} from '../prep-sheet';

const NOW = new Date('2026-10-09T03:00:00Z');   // 日本時間 10/9 12:00

const lesson = (date: string, extra: Record<string, unknown> = {}) => ({ date, status: 'completed', ...extra });

describe('記録として扱う授業（予定ではない・今より前・新しい順）', () => {
    it('予定と、まだ先の授業は除き、新しい順に並べる', () => {
        const rows = [
            lesson('2026-10-01T01:00:00Z'),
            lesson('2026-10-12T01:00:00Z', { status: 'scheduled' }),   // 予定
            lesson('2026-10-08T01:00:00Z'),
            lesson('2026-10-10T01:00:00Z'),                            // まだ先（予定の印が無くても）
            lesson('2026-10-05T01:00:00Z', { status: null }),          // 印が無い古い記録は記録として扱う
        ];
        expect(pastLessons(rows, NOW).map(l => l.date)).toEqual([
            '2026-10-08T01:00:00Z', '2026-10-05T01:00:00Z', '2026-10-01T01:00:00Z',
        ]);
    });
});

describe('会話を読む範囲の始まり（直近2回の授業のうち古いほうの日・日本時間の0時）', () => {
    it('2回目の授業の日（日本時間）の0時', () => {
        // 10/2 23:30（世界の標準時）＝日本時間 10/3 8:30 の授業 → 日本時間 10/3 の0時＝10/2 15:00（世界の標準時）
        const past = [lesson('2026-10-08T01:00:00Z'), lesson('2026-10-02T23:30:00Z'), lesson('2026-09-30T01:00:00Z')];
        expect(talkSince(past)).toBe('2026-10-02T15:00:00.000Z');
    });
    it('記録が1回だけなら、その日', () => {
        expect(talkSince([lesson('2026-10-08T01:00:00Z')])).toBe('2026-10-07T15:00:00.000Z');
    });
    it('記録が無い・日付が読めない時は読まない', () => {
        expect(talkSince([])).toBeNull();
        expect(talkSince([lesson('not-a-date')])).toBeNull();
    });
});

describe('授業中に生徒が話したこと（保存した授業の流れから）', () => {
    it('生徒の発話だけを取り出す。先生の発話・ASTAの物・短い相づち・同じ文は入れない', () => {
        const items = [
            { kind: 'said', text: '週末は何をしましたか？' },
            { kind: 'student-said', text: '週末に友だちと京都へ行きました。' },
            { kind: 'student-said', text: 'はい' },
            { kind: 'material', text: '練習問題の文です。とても長い文です。' },
            { kind: 'student-said', text: '  お寺を  たくさん見ました。 ' },
            { kind: 'student-said', text: '週末に友だちと京都へ行きました。' },
        ];
        expect(studentLines(items)).toEqual(['週末に友だちと京都へ行きました。', 'お寺を たくさん見ました。']);
        expect(studentLines(null)).toEqual([]);
    });

    it('上限を超える時は長い文から選び、選んだ文は元の順に並べる', () => {
        const items = [
            { kind: 'student-said', text: 'あいうえおか' },             // 6字
            { kind: 'student-said', text: 'かきくけこさしすせそ' },     // 10字
            { kind: 'student-said', text: 'たちつてとな' },             // 6字
            { kind: 'student-said', text: 'はひふへほまみむめも' },     // 10字
        ];
        expect(studentLines(items, 20)).toEqual(['かきくけこさしすせそ', 'はひふへほまみむめも']);
        expect(studentLines(items, 26)).toEqual(['あいうえおか', 'かきくけこさしすせそ', 'はひふへほまみむめも']);
    });

    it('1つの発話が長すぎる時は切る。1回の授業の文字数は上限まで', () => {
        const long = 'あ'.repeat(500);
        const [line] = studentLines([{ kind: 'student-said', text: long }]);
        expect(line.length).toBe(201);
        expect(line.endsWith('…')).toBe(true);
        const many = Array.from({ length: 40 }, (_, i) => ({ kind: 'student-said', text: `${i}番目の話です。週末に友だちと出かけて、おいしい物を食べました。` }));
        expect(many.reduce((n, it) => n + it.text.length, 0)).toBeGreaterThan(TALK_CHARS_PER_LESSON);
        const total = studentLines(many).reduce((n, l) => n + l.length, 0);
        expect(total).toBeLessThanOrEqual(TALK_CHARS_PER_LESSON);
        expect(total).toBeGreaterThan(TALK_CHARS_PER_LESSON - 40);
    });

    it('授業の流れは新しい順に2回まで。話したことが無い回は入れない', () => {
        const rows = [
            { created_at: '2026-10-01T02:00:00Z', items: [{ kind: 'student-said', text: '一番古い授業の話です。' }] },
            { created_at: '2026-10-08T02:00:00Z', items: [{ kind: 'student-said', text: '一番新しい授業の話です。' }] },
            { created_at: '2026-10-05T02:00:00Z', items: [{ kind: 'said', text: '先生だけが話した授業です。' }] },
        ];
        expect(talksFromFlows(rows)).toEqual([{ date: '2026-10-08T02:00:00Z', lines: ['一番新しい授業の話です。'] }]);
    });
});

describe('1枚の材料', () => {
    const student = {
        name: 'アンナ', jlpt_level: 'N4', textbook: 'みんなの日本語', memo: '猫を飼っている',
        goal_text: '日本で働きたい（AI判定）', purposes: 'travel',
    };
    const lessons = [
        lesson('2026-10-12T01:00:00Z', { status: 'scheduled' }),
        ...Array.from({ length: 7 }, (_, i) => lesson(`2026-10-0${8 - i}T01:00:00Z`, { topics: `第${20 - i}課`, homework: `宿題${i}`, next_goal: `目標${i}`, mistakes: `つまずき${i}` })),
    ];

    it('前回の記録は今までどおり一番新しい記録。予定は前回にしない', () => {
        const src = buildPrepSource(student, lessons, [], NOW);
        expect(src.lastDate).toBe('2026-10-08T01:00:00Z');
        expect(src.topics).toBe('第20課');
        expect(src.homework).toBe('宿題0');
        expect(src.nextGoal).toBe('目標0');
    });

    it('直近の記録は5回まで。目的の「（AI判定）」は落とし、興味は目的の名前にする', () => {
        const src = buildPrepSource(student, lessons, [], NOW);
        expect(src.recentLessons).toHaveLength(RECENT_LESSON_LIMIT);
        expect(src.recentLessons?.map(l => l.topics)).toEqual(['第20課', '第19課', '第18課', '第17課', '第16課']);
        expect(src.goalText).toBe('日本で働きたい');
        expect(src.interest).toBe('旅行を楽しみたい');
        expect(src.memo).toBe('猫を飼っている');
    });

    it('目的が「その他」・読めない時は、興味なし', () => {
        expect(buildPrepSource({ ...student, purposes: 'other' }, [], [], NOW).interest).toBeNull();
        expect(buildPrepSource({ ...student, purposes: 'xyz' }, [], [], NOW).interest).toBeNull();
        expect(buildPrepSource({ ...student, purposes: null }, [], [], NOW).interest).toBeNull();
    });

    it('記録が無ければ前回は無し（作らない側の判定に使う）', () => {
        const src = buildPrepSource(student, [], [], NOW);
        expect(src.lastDate).toBeNull();
        expect(prepStamp(src.lastDate)).toBe('none');
    });
});

describe('ASTAへの頼み方', () => {
    const base = {
        studentName: 'アンナ', jlptLevel: 'N4', textbook: 'みんなの日本語', lastDate: '2026-10-08T01:00:00Z',
        topics: '〜たことがあります', mistakes: '助詞の「に」と「で」', homework: '作文', nextGoal: '第20課',
    };

    it('フリートーク無しの時は、今までと同じ頼み方（材料も free_talk も入れない）', () => {
        const prompt = buildPrepPrompt({ ...base, memo: '猫を飼っている', talks: [{ date: '2026-10-08T01:00:00Z', lines: ['京都へ行きました。'] }] });
        expect(prompt).toContain('# 前回の授業記録（2026-10-08）');
        expect(prompt).not.toContain('フリートーク');
        expect(prompt).not.toContain('free_talk');
        expect(prompt).not.toContain('猫を飼っている');
        expect(prompt).toContain('（60字以内）\n\n出力は次のJSONだけ');
    });

    it('フリートーク有りの時は、材料（メモ・目標・興味・直近の記録・会話）と決まりと答えの形が入る', () => {
        const prompt = buildPrepPrompt({
            ...base,
            memo: '猫を飼っている', goalText: '日本で働きたい', interest: '旅行を楽しみたい',
            recentLessons: [
                { date: '2026-10-08T01:00:00Z', topics: '〜たことがあります', vocabulary: '趣味' },
                { date: '2026-10-02T23:30:00Z', topics: null },
            ],
            talks: [{ date: '2026-10-08T02:00:00Z', lines: ['週末に友だちと京都へ行きました。'] }],
        }, { freeTalk: true });
        expect(prompt).toContain('- メモ: 猫を飼っている');
        expect(prompt).toContain('- 学習の目的: 日本で働きたい');
        expect(prompt).toContain('- 興味（体験レッスンで選んだ目的）: 旅行を楽しみたい');
        // 日付は日本時間の「月/日」
        expect(prompt).toContain('- 10/8: 内容: 〜たことがあります／語彙: 趣味');
        expect(prompt).toContain('- 10/3: 記録の中身なし');
        expect(prompt).toContain('## 10/8 の授業\n- 週末に友だちと京都へ行きました。');
        expect(prompt).toContain('材料に無い出来事・好み・予定・ニュースは作らない');
        expect(prompt).toContain('生徒のレベル（N4）');
        expect(prompt).toContain(`${FREE_TALK_COUNT}つ作る`);
        expect(prompt.match(/"follow_up"/g)).toHaveLength(FREE_TALK_COUNT);
    });

    it('会話が保存されていない時は「保存された会話なし」（記録だけで作る）', () => {
        const prompt = buildPrepPrompt({ ...base, recentLessons: [], talks: [] }, { freeTalk: true });
        expect(prompt).toContain('（保存された会話なし）');
        expect(prompt).toContain('## 直近の授業の記録（新しい順・5回まで）\n- なし');
        expect(prompt).toContain('- メモ: なし');
    });

    it('長い記録は切って渡す', () => {
        const prompt = buildPrepPrompt({ ...base, memo: 'あ'.repeat(1000) }, { freeTalk: true });
        expect(prompt).toContain(`- メモ: ${'あ'.repeat(300)}…`);
        expect(prompt).not.toContain('あ'.repeat(301));
    });
});

describe('ASTAの答えのフリートーク', () => {
    it('質問が無い物は捨て、空白を落とし、3つまで', () => {
        const raw = [
            { topic: ' 京都 ', question: ' 京都で何を見ましたか？ ', follow_up: 'どうでしたか？', grammar: '〜たことがあります', basis: '10/8の会話' },
            { topic: '空', question: '' },
            { topic: '猫', question: '猫の名前は何ですか？', follow_up: 3, grammar: null },
            'おかしな物',
            { question: '4つ目' },
            { question: '5つ目' },
        ];
        expect(normalizeFreeTalk(raw)).toEqual([
            { topic: '京都', question: '京都で何を見ましたか？', follow_up: 'どうでしたか？', grammar: '〜たことがあります', basis: '10/8の会話' },
            { topic: '猫', question: '猫の名前は何ですか？', follow_up: '', grammar: '', basis: '' },
            { topic: '', question: '4つ目', follow_up: '', grammar: '', basis: '' },
        ]);
    });
    it('配列でなければ空', () => {
        expect(normalizeFreeTalk(undefined)).toEqual([]);
        expect(normalizeFreeTalk({ question: 'x' })).toEqual([]);
    });
});

describe('保存済みの1枚を作り直すか', () => {
    const sheet: PrepSheet = { review_quiz: [], intro_topic: '', advice: '' };
    it('フリートークを使える先生で、フリートーク無しで作った1枚なら作り直す', () => {
        expect(missingFreeTalk(sheet, true)).toBe(true);
    });
    it('フリートーク有りで作った1枚（ネタが0でも）・使えない先生は作り直さない', () => {
        expect(missingFreeTalk({ ...sheet, free_talk: [] }, true)).toBe(false);
        expect(missingFreeTalk(sheet, false)).toBe(false);
    });
});
