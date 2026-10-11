import { describe, it, expect } from 'vitest';
import { SpeechSegmenter } from '../speech-segmenter';
import fixture from './fixtures/segmenter-noisy-speech.json';

describe('声の区切り方：雑音の上の声を捨てない（2026-10-11 かずき指摘「日本語の内容が一部省略される」）', () => {
    it('雑音を混ぜた日本語の話（実際の音声の音量）で、話している間に1回も捨てない', () => {
        const seg = new SpeechSegmenter(0);
        const events: { t: number; action: string }[] = [];
        fixture.rms.forEach((rms: number, k: number) => {
            const t = (k + 1) * 50;
            const a = seg.push(rms, t);
            if (a) { events.push({ t, action: a }); seg.reset(t); }
        });
        // 以前の作りは、6.7秒より後の声を2.5秒ごとに「捨て」にしていた（話の後半が丸ごと抜けた）
        const duringSpeech = events.filter(e => e.t <= fixture.speechEndMs + 700);
        expect(duringSpeech.length).toBeGreaterThan(0);
        expect(duringSpeech.every(e => e.action === 'send')).toBe(true);
    });

    // 雑音床が雑音に追従すること（直した後の決まり。始めの20秒は雑音床を上げないので、雑音も送ることがある）
    it('雑音だけが続く時は、始めの20秒の後は捨てる（送らない）', () => {
        const seg = new SpeechSegmenter(0);
        const late: string[] = [];
        let seed = 3;
        const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
        for (let t = 50; t <= 45000; t += 50) {
            const a = seg.push(0.012 + rnd() * 0.01, t);   // 0.012〜0.022 の雑音だけ
            if (a) { if (t > 23000) late.push(a); seg.reset(t); }
        }
        expect(late.length).toBeGreaterThan(0);
        expect(late.every(a => a === 'discard')).toBe(true);
    });
});
