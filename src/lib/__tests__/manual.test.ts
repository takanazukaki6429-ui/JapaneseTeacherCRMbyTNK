import { describe, it, expect } from 'vitest';
import {
    MANUAL_ICON_KEYS,
    chapterIdForPath,
    chapterPlainText,
    findChapter,
    manualPlainText,
    showsScreenHelp,
    type ManualBlock,
    type ManualChapter,
} from '../manual';
import { MANUAL_CHAPTERS } from '@/content/manual/chapters';

describe('画面と章の対応（各画面の右上の「この画面の使い方」が開く章）', () => {
    const cases: [string, string | null][] = [
        ['/', 'home'],
        ['/students', 'students'],
        ['/students/abc', 'student'],
        ['/students/abc/edit', 'student'],
        ['/students/abc/lessons/live', 'live'],
        ['/students/abc/lessons/prepare', 'prepare'],
        ['/students/abc/lessons/new', 'record'],
        ['/students/abc/initial-hearing', 'hearing'],
        ['/students/abc/roadmap', 'roadmap'],
        ['/materials', 'materials'],
        ['/materials/123', 'materials'],
        ['/materials/textbook/xyz', 'textbook'],
        ['/materials/travel', 'travel'],
        ['/materials/travel/airport', 'travel'],
        ['/settings', 'settings'],
        ['/settings/billing', 'plans'],
        ['/manual', null],
        ['/admin/invite-codes', null],
    ];
    it.each(cases)('%s → %s', (path, id) => {
        expect(chapterIdForPath(path)).toBe(id);
    });

    it('対応する章は、マニュアルに全部ある', () => {
        for (const [path, id] of cases) {
            if (id) expect(findChapter(MANUAL_CHAPTERS, id), path).not.toBeNull();
        }
    });

    it('マニュアルの画面と管理の画面には「？」を出さない', () => {
        expect(showsScreenHelp('/manual')).toBe(false);
        expect(showsScreenHelp('/admin/dashboard')).toBe(false);
        expect(showsScreenHelp('/students')).toBe(true);
        expect(showsScreenHelp(null)).toBe(false);
    });
});

/** 章の中の文を全部集める（ボタンの名前も） */
function allTexts(c: ManualChapter): string[] {
    const fromBlock = (b: ManualBlock): string[] => {
        switch (b.type) {
            case 'text':
            case 'note':
            case 'plan':
                return [b.text];
            case 'steps':
            case 'items':
                return b.items.flatMap(it => [it.text, it.button?.label ?? '']);
        }
    };
    return [c.title, c.summary, c.where ?? '', ...c.sections.flatMap(s => [s.heading, ...s.blocks.flatMap(fromBlock)])];
}

describe('マニュアルの中身（全部の画面・2026-10-09 かずき決定）', () => {
    it('章の名前は重ならず、どの章にも説明と節がある', () => {
        const ids = MANUAL_CHAPTERS.map(c => c.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const c of MANUAL_CHAPTERS) {
            expect(c.title.trim(), c.id).not.toBe('');
            expect(c.summary.trim(), c.id).not.toBe('');
            expect(c.sections.length, c.id).toBeGreaterThan(0);
            for (const s of c.sections) {
                expect(s.heading.trim(), c.id).not.toBe('');
                expect(s.blocks.length, `${c.id}: ${s.heading}`).toBeGreaterThan(0);
            }
        }
    });

    it('先生が使う画面の章がそろっている', () => {
        const ids = new Set(MANUAL_CHAPTERS.map(c => c.id));
        for (const id of ['start', 'home', 'students', 'student', 'hearing', 'roadmap', 'prepare', 'live', 'record', 'materials', 'textbook', 'travel', 'settings', 'plans', 'trouble']) {
            expect(ids.has(id), id).toBe(true);
        }
    });

    it('ボタンの印は、決めた印だけ', () => {
        const keys = new Set<string>(MANUAL_ICON_KEYS);
        for (const c of MANUAL_CHAPTERS) {
            for (const s of c.sections) {
                for (const b of s.blocks) {
                    if (b.type !== 'steps' && b.type !== 'items') continue;
                    for (const it of b.items) {
                        if (it.button?.icon) expect(keys.has(it.button.icon), `${c.id}: ${it.button.label}`).toBe(true);
                    }
                }
            }
        }
    });

    it('英語の言葉を使わない（固有名詞と、画面に出ている名前だけは使ってよい・憲法 v2.4）', () => {
        // 固有名詞（サービス・機器・アプリの名前）と、画面に出ている名前（二要素認証（MFA）・DELETE など）だけ
        const ALLOWED = new Set([
            'ASTA', 'AI', 'Chrome', 'Zoom', 'Google', 'Authenticator', 'Mac', 'iPhone', 'AirPlay', 'Handoff',
            'Stripe', 'LINE', 'Excel', 'CSV', 'QR', 'MFA', 'DELETE', 'Enter',
            'N5', 'N4', 'N3', 'N2', 'N1', 'JLPT',
        ]);
        const found = new Set<string>();
        for (const c of MANUAL_CHAPTERS) {
            for (const raw of allTexts(c)) {
                const t = raw.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '');   // 連絡先のメールアドレスは除く
                for (const m of t.matchAll(/[A-Za-z][A-Za-z0-9]+/g)) {
                    if (!ALLOWED.has(m[0])) found.add(`${c.id}: ${m[0]}`);
                }
            }
        }
        expect([...found]).toEqual([]);
    });

    it('使い方ヘルプ（AI）に渡す文には、全部の章とボタンの名前が入る', () => {
        const text = manualPlainText(MANUAL_CHAPTERS);
        for (const c of MANUAL_CHAPTERS) expect(text).toContain(`## ${c.title}`);
        const live = findChapter(MANUAL_CHAPTERS, 'live');
        expect(live && chapterPlainText(live)).toMatch(/［[^］]+］/);
    });
});

describe('AIに渡す文の形', () => {
    const chapter: ManualChapter = {
        id: 'x', title: '見本', summary: 'できること', where: 'ホームから',
        sections: [{
            heading: '手順',
            blocks: [
                { type: 'steps', items: [{ button: { icon: 'play', label: '授業を始める' }, text: 'を押す' }, { text: '話す' }] },
                { type: 'items', items: [{ text: '説明' }] },
                { type: 'note', text: '注意' },
                { type: 'plan', text: 'ライトでは使えない' },
            ],
        }],
    };
    it('見出し・手順の番号・ボタンの名前・注意・プランの違いが文になる', () => {
        expect(chapterPlainText(chapter)).toBe(
            '## 見本\nできること\n開き方：ホームから\n\n### 手順\n1. ［授業を始める］ を押す\n2. 話す\n・説明\n（気をつけること）注意\n（プランによる違い）ライトでは使えない',
        );
    });
});
