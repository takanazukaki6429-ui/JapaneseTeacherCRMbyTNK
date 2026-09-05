// 音声区切り判定器（src/lib/speech-segmenter.ts）の単体検証。
// 実行：node scripts/check-speech-segmenter.ts（Node 22.6+ の型消去で動く。テスト基盤は入れていない）
// 音量の時系列を50msごとに流し、いつ・どう区切るかを8場面で確かめる（2026-09-06）

import { SpeechSegmenter } from '../src/lib/speech-segmenter.ts';

const TICK = 50;
const QUIET = 0.002;   // 静かな部屋
const VOICE = 0.08;    // 話し声

type Step = [durationMs: number, rms: number];
type Event = { t: number; action: 'send' | 'discard' };

function run(profile: Step[]): Event[] {
    const seg = new SpeechSegmenter(0);
    const events: Event[] = [];
    let t = 0;
    for (const [dur, rms] of profile) {
        for (let k = 0; k < dur / TICK; k++) {
            t += TICK;
            const a = seg.push(rms, t);
            if (a) { events.push({ t, action: a }); seg.reset(t); }
        }
    }
    return events;
}

let failed = 0;
function check(name: string, ok: boolean, detail: string) {
    console.log(`${ok ? 'OK ' : 'NG '} ${name}  ${detail}`);
    if (!ok) failed++;
}

// 1. ずっと無音 → 2.5秒ごとに捨てるだけ。送らない
{
    const ev = run([[6000, QUIET]]);
    check('無音は捨てるだけ', ev.length === 2 && ev.every(e => e.action === 'discard') && ev[0].t === 2500 && ev[1].t === 5000,
        JSON.stringify(ev));
}
// 2. 1.5秒話して黙る → 黙ってから0.7秒で送る
{
    const ev = run([[1500, VOICE], [2000, QUIET]]);
    check('一言のあと0.7秒の間で送る', ev.length === 1 && ev[0].action === 'send' && ev[0].t === 2200, JSON.stringify(ev));
}
// 3. 0.1秒の物音だけ → 雑音として捨てる（送らない）
{
    const ev = run([[100, VOICE], [2000, QUIET]]);
    check('短い物音は捨てる', ev.length === 1 && ev[0].action === 'discard', JSON.stringify(ev));
}
// 4. 文の中の短い間（0.4秒）では切らない → 2文がひとつの区切りになる
{
    const ev = run([[1000, VOICE], [400, QUIET], [1000, VOICE], [1500, QUIET]]);
    check('0.4秒の間では切らない', ev.length === 1 && ev[0].action === 'send' && ev[0].t === 3100, JSON.stringify(ev));
}
// 5. 9秒話し続けて0.3秒の息継ぎ → 8秒を超えた後の息継ぎで区切る
{
    const ev = run([[9000, VOICE], [300, QUIET], [3000, VOICE], [1500, QUIET]]);
    check('8秒超えの息継ぎで区切る', ev.length === 2 && ev[0].action === 'send' && ev[0].t === 9250 && ev[1].action === 'send',
        JSON.stringify(ev));
}
// 6. 息継ぎ無しで13秒 → 12秒で強制的に区切る
{
    const ev = run([[13000, VOICE], [1500, QUIET]]);
    check('12秒で強制区切り', ev.length === 2 && ev[0].action === 'send' && ev[0].t === 12000, JSON.stringify(ev));
}
// 7. 無音2.3秒の直後に話し始める → 2.5秒の捨て処理に巻き込まれず、話し終わりまで続く
{
    const ev = run([[2300, QUIET], [1500, VOICE], [1500, QUIET]]);
    check('話し始めは捨てない', ev.length === 1 && ev[0].action === 'send' && ev[0].t === 4500, JSON.stringify(ev));
}
// 8. 雑音床の追従：うるさい部屋（0.006）では、それより少し大きいだけの音は声にしない
{
    const seg = new SpeechSegmenter(0);
    let t = 0;
    for (let k = 0; k < 100; k++) { t += TICK; seg.push(0.006, t); }
    const th = seg.threshold;
    check('雑音床に追従してしきい値が上がる', th > 0.02 && th < 0.03, `threshold=${th.toFixed(4)}`);
}

console.log(failed === 0 ? '\n全て合格' : `\n${failed}件 不合格`);
process.exit(failed === 0 ? 0 : 1);
