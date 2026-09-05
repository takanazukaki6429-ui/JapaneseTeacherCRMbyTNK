/**
 * 生徒の音声を「文の切れ目」で区切るための判定器（2026-09-06・かずき決定 A案）
 *
 * 以前は2.5秒固定で機械的に切っていたため、文の途中で切れて
 * 文字起こしも翻訳も文脈を失っていた（「populated these days」→「近年人口が増加している」）。
 * ここでは音の大きさ（RMS）の時系列だけを受け取り、いつ録音を区切るかを決める。
 * 音の取り出し（Web Audio）やファイル送信は持たない純粋な判定なので、Node で単体検証できる。
 *
 * 判定ルール：
 *  - 声が一度も入っていない区間は idleMs（2.5秒）ごとに捨てて録音を作り直す
 *    （長い無音を先頭に抱えたファイルを送らない＝費用と遅延の抑制）
 *  - 声が入ったあと、silenceMs（0.7秒）声が途切れたら区切って送る
 *  - 声が続いても softMaxMs（8秒）を超えたら、次の小さな息継ぎ（softDipMs 0.25秒）で区切る
 *  - hardMaxMs（12秒）を超えたら無条件に区切る
 *  - 区切った区間に声が minSpeechMs（0.3秒）未満しか無ければ雑音とみなして捨てる
 *  - 「声」のしきい値は雑音床（静かな時の平均音量）に合わせて自動で追従する
 *
 * しきい値の初期値は Zoom 等のタブ音声を想定した経験値で、実機未検証（2026-09-06）。
 */

export type SegmenterConfig = {
    silenceMs: number;
    minSpeechMs: number;
    idleMs: number;
    softMaxMs: number;
    softDipMs: number;
    hardMaxMs: number;
    minThreshold: number;   // 雑音床が低くても、これ未満の音量は声とみなさない
    floorRatio: number;     // 雑音床の何倍を超えたら声とみなすか
};

export const DEFAULT_SEGMENTER_CONFIG: SegmenterConfig = {
    silenceMs: 700,
    minSpeechMs: 300,
    idleMs: 2500,
    softMaxMs: 8000,
    softDipMs: 250,
    hardMaxMs: 12000,
    minThreshold: 0.01,
    floorRatio: 4,
};

/** 'send' = 区切って送る／'discard' = 区切るが捨てる／null = 続ける */
export type SegmentAction = 'send' | 'discard' | null;

export class SpeechSegmenter {
    private readonly cfg: SegmenterConfig;
    private segStart: number;
    private lastAt: number;
    private speechMs = 0;
    private lastSpeechAt: number | null = null;
    private noiseFloor: number;

    constructor(now: number, cfg: Partial<SegmenterConfig> = {}) {
        this.cfg = { ...DEFAULT_SEGMENTER_CONFIG, ...cfg };
        this.segStart = now;
        this.lastAt = now;
        this.noiseFloor = this.cfg.minThreshold / this.cfg.floorRatio;
    }

    /** いま「声」とみなす音量の境目（雑音床に追従） */
    get threshold(): number {
        return Math.max(this.cfg.minThreshold, this.noiseFloor * this.cfg.floorRatio);
    }

    /** 新しい区間を始める（録音を作り直した直後に呼ぶ）。雑音床は引き継ぐ */
    reset(now: number): void {
        this.segStart = now;
        this.lastAt = now;
        this.speechMs = 0;
        this.lastSpeechAt = null;
    }

    /** 音量の1サンプル（RMS）を渡す。区切るべきならその扱いを返す */
    push(rms: number, now: number): SegmentAction {
        const dt = Math.max(0, now - this.lastAt);
        this.lastAt = now;
        const isSpeech = rms > this.threshold;

        if (isSpeech) {
            this.speechMs += dt;
            this.lastSpeechAt = now;
        } else {
            // 静かな瞬間だけで雑音床を更新（ゆっくり追従）。声は床に入れない
            this.noiseFloor = this.noiseFloor * 0.95 + rms * 0.05;
        }

        const elapsed = now - this.segStart;
        const hadSpeech = this.speechMs >= this.cfg.minSpeechMs;

        // 声が一度も無い区間：一定時間で捨てて作り直す
        if (this.lastSpeechAt === null) {
            return elapsed >= this.cfg.idleMs ? 'discard' : null;
        }
        const quietFor = now - this.lastSpeechAt;

        // 上限：長すぎる区間は無条件で区切る
        if (elapsed >= this.cfg.hardMaxMs) return hadSpeech ? 'send' : 'discard';
        // 声のあとに間が空いた：文の切れ目とみなす
        if (quietFor >= this.cfg.silenceMs) return hadSpeech ? 'send' : 'discard';
        // 長く続く発話：小さな息継ぎで区切る
        if (elapsed >= this.cfg.softMaxMs && quietFor >= this.cfg.softDipMs) return hadSpeech ? 'send' : 'discard';
        return null;
    }
}

/** Web Audio の時間領域データ（-1〜1）から音量（RMS）を求める */
export function rmsOf(samples: Float32Array): number {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
    return Math.sqrt(sum / (samples.length || 1));
}
