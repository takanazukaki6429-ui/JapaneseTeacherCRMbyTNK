import { describe, it, expect } from 'vitest';
import { buildGeminiSttPrompt, hasKana, isJapaneseSpeech, parseSttLines } from '../stt-lines';

describe('翻訳モードの答えの読み取り（2026-10-11 かずき決定・原価を下げる直し）', () => {
    it('英語の声：O に原文、J に訳', () => {
        expect(parseSttLines('O: Excuse me, where is the station?\nJ: すみません、駅はどこですか。'))
            .toEqual({ original: 'Excuse me, where is the station?', japanese: 'すみません、駅はどこですか。' });
    });

    it('日本語の声：J は空のまま', () => {
        expect(parseSttLines('O:昨日スーパーでリンゴを3つ買いました。\nJ:'))
            .toEqual({ original: '昨日スーパーでリンゴを3つ買いました。', japanese: '' });
    });

    it('声が無い時の答え（試験で出た3つの形）はどれも空', () => {
        for (const raw of ['O: \nJ: ', 'O:\nJ:', 'O: \nJ:']) {
            expect(parseSttLines(raw)).toEqual({ original: '', japanese: '' });
        }
    });

    it('O の札が無い答えは形の崩れ（null）。呼ぶ側で Gemini をやり直す', () => {
        expect(parseSttLines('Excuse me, where is the station?')).toBeNull();
        expect(parseSttLines('')).toBeNull();
    });

    it('行が折り返されても、O は J の札の前まで、J は最後までを1行にまとめる', () => {
        expect(parseSttLines('O: I want to go\nto Kyoto.\nJ: 京都に\n行きたいです。'))
            .toEqual({ original: 'I want to go to Kyoto.', japanese: '京都に 行きたいです。' });
        expect(parseSttLines('O: Hello')).toEqual({ original: 'Hello', japanese: '' });
    });

    it('日本語で話したかは、かなと文字の数で見分ける', () => {
        expect(isJapaneseSpeech('昨日スーパーでリンゴを3つ買いました。')).toBe(true);
        expect(isJapaneseSpeech('日本 の 食べ物 で 一 番 好き な の は ラーメン です 。')).toBe(true);
        expect(isJapaneseSpeech('私はNetflixが好きです')).toBe(true);
        expect(isJapaneseSpeech('Excuse me, where is the station?')).toBe(false);
        expect(isJapaneseSpeech('How do you say ありがとう in a polite way?')).toBe(false);   // 英語に日本語が混ざっただけ＝訳を出す
        expect(isJapaneseSpeech('我喜欢拉面')).toBe(false);   // 中国語（かな無し）＝訳を出す
        expect(hasKana('東京駅')).toBe(false);
    });

    it('指示文：2行の形と、捏造を防ぐ文がある。文脈は最後に足す', () => {
        const p = buildGeminiSttPrompt('English', '');
        expect(p).toContain("The student's native language is English");
        expect(p).toContain('O: the exact transcript');
        expect(p).toContain('J: the natural Japanese translation. If the speech is Japanese, leave J empty.');
        expect(p).toContain('IMPORTANT: Fabrication is the worst possible failure.');
        expect(p).not.toContain('JSON');
        const withContext = buildGeminiSttPrompt('English', 'On Saturday,');
        expect(withContext.startsWith(p)).toBe(true);
        expect(withContext).toContain('was: "On Saturday,"');
    });
});
