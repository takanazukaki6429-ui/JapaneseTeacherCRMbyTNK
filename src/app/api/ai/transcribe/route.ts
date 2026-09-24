import { NextRequest, NextResponse } from 'next/server';
import { getSpeechClient, getTranslateClient, getProjectId, isGoogleCloudConfigured } from '@/lib/google-cloud';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { canUseApp, READ_ONLY_MESSAGE } from '@/lib/plan-access-server';
import { notifyAdmin } from '@/lib/notify';
import { getTranslationQuota } from '@/lib/translation-quota';

// 生徒の声の日本語訳は 3.1 Flash-Lite（2026-09-22 かずき決定「一番原価を抑える組み合わせ」）。
// Google の翻訳は $20/100万文字（月50万文字までは ASTA 全体で無料）で1文¥0.2、Lite は1文¥0.006。
// 6文の比較で Lite の方が自然な日本語だった（Google は直訳調）。ただし 0.2秒→0.9秒と遅くなる。
// Lite が失敗した時だけ Google の翻訳でやり直す（翻訳モードを止めないため）
const TRANSLATE_MODEL = 'gemini-3.1-flash-lite';

// ── 文字起こし＋訳を Gemini の音声入力で1回にまとめる（2026-09-23 かずき決定・Cの試験の結果）──
// 同じ音声50本の比較（検証_文字起こしGemini比較_2026-09-23.md）：
//   3.5 Flash-Lite（捏造禁止の指示つき）＝声なし17本で捏造0・速さは Chirp 3 と同じ・原価は5分の1（1分¥0.55）
//   3.1 Flash-Lite は雑音から「先生、おはようございます。」等を作った（17本中10本）ので使わない
//   2026-07-12 に Gemini を外した理由（不明瞭な音から会話を捏造）は、この指示と 3.5 Lite の組み合わせでは再現しなかった
// Vercel の環境変数 STT_ENGINE=google で Chirp 3＋訳に戻せる（コード変更なし）。Gemini 側が失敗した時も Chirp 3 でやり直す
const STT_ENGINE: 'gemini' | 'google' = process.env.STT_ENGINE === 'google' ? 'google' : 'gemini';
const GEMINI_STT_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_STT_TIMEOUT_MS = 12000;

function buildGeminiSttPrompt(studentLanguage: string, context: string): string {
    const contextLine = context
        ? `\nThe student's previous segment (already transcribed) was: "${context}". This audio may continue that sentence. Put ONLY this audio's words in "original", but make "japanese" the natural Japanese translation of the previous segment and this audio combined.`
        : '';
    return `This audio is a short segment of a language student speaking to their Japanese teacher during an online lesson. The student's native language is ${studentLanguage}; they may also speak English or Japanese.
Transcribe EXACTLY what is said (keep the original language), then translate it into natural Japanese.${contextLine}
Also report the language of the speech as a 2-letter code in "language" (e.g. "en", "ja", "es").
If there is no clear human speech (silence, noise, music, unintelligible sound), output exactly: {"original":"","japanese":"","language":""}
Never guess or invent words that are not clearly audible. If only part of a sentence is audible, transcribe only that part.
IMPORTANT: Fabrication is the worst possible failure. Background noise, hiss, hum, wind, static, or music is NOT speech. When in doubt, output empty strings. It is always better to output nothing than to invent a sentence.
Output ONLY JSON: {"original":"...","japanese":"...","language":".."}`;
}

async function transcribeWithGemini(audioBytes: Buffer, mimeType: string, studentLanguage: string, context: string): Promise<TranscribeResult> {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_STT_TIMEOUT_MS);
    try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_STT_MODEL}:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
                contents: [{ parts: [
                    { text: buildGeminiSttPrompt(studentLanguage, context) },
                    { inlineData: { mimeType, data: audioBytes.toString('base64') } },
                ] }],
                generationConfig: { responseMimeType: 'application/json' },
            }),
        });
        if (!res.ok) throw new Error(`gemini stt ${res.status}`);
        const data = await res.json();
        const raw = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? '').join('');
        const parsed = JSON.parse(raw) as { original?: string; japanese?: string; language?: string };
        const original = String(parsed.original ?? '').trim();
        const language = String(parsed.language ?? '').toLowerCase();
        if (!original) return { original: '', japanese: '', merged: false, engine: GEMINI_STT_MODEL };
        const isJapanese = language.startsWith('ja');
        // 生徒が日本語で話した時は原文＝訳（翻訳モードの画面側の扱いに合わせる）
        const merged = context ? `${context} ${original}` : original;
        const japanese = isJapanese ? (context ? tidyJapaneseSpacing(merged) : tidyJapaneseSpacing(original)) : String(parsed.japanese ?? '').trim();
        return { original: isJapanese ? tidyJapaneseSpacing(merged) : merged, japanese: japanese || merged, merged: !!context, engine: GEMINI_STT_MODEL };
    } finally {
        clearTimeout(timer);
    }
}

async function translateToJapanese(text: string, sourceLanguage: string): Promise<{ japanese: string; engine: string }> {
    if (process.env.GEMINI_API_KEY) {
        try {
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: TRANSLATE_MODEL });
            const result = await model.generateContent(
                `Translate the following ${sourceLanguage} text (spoken by a Japanese-language student to their teacher) into natural Japanese. Output ONLY the translation, nothing else.\n\n${text}`
            );
            const japanese = result.response.text().trim();
            if (japanese) return { japanese, engine: TRANSLATE_MODEL };
        } catch (err) {
            console.error('[transcribe] gemini translate failed, falling back to Google Translate:', err instanceof Error ? err.message : err);
        }
    }
    const translate = getTranslateClient();
    const [translated] = await translate.translate(text, 'ja');
    return { japanese: translated, engine: 'google-translate' };
}

export const dynamic = 'force-dynamic';

// 翻訳モードは発話の切れ目ごとに叩かれる特殊ルート（2026-09-06 までは2.5秒固定）。
// 上限は旧方式の水準（連続75分で約1800回/時）を据え置く。切れ目方式では回数は減るので余裕側。
// これを超える＝複数タブ・閉じ忘れ・外部からの濫用とみなして遮断する。
const TRANSCRIBE_HOURLY_LIMIT = 1800;

/**
 * v1.0 工程表 Week2: リアルタイム翻訳（Streaming STT 疑似ストリーミング = A'案）
 *
 * アーキテクチャ:
 *   クライアントが発話の切れ目ごと（0.7秒の間・最長12秒）に音声を POST
 *   （生徒の母国語名と、直前の発話が文の途中なら その原文＝文脈 も同送）
 *     → Google Cloud STT v2 の Chirp 3 で文字起こし（言語は自動判定・句読点つき。
 *        失敗時は旧設定 latest_short＝母国語 + en-US + ja-JP の3言語指定でやり直す）
 *     → 文脈があれば前後をつなげてから 3.1 Flash-Lite で日本語訳（2026-09-22。失敗時は Google Cloud Translation v2）
 *       （画面側は前の吹き出しを結合訳で差し替える。2026-09-06 かずき決定 A＋B案）
 *
 * Gemini フォールバックは 2026-07-12 に廃止。
 * 音声が不明瞭なとき実在しない会話を捏造することが実運用で確認されたため、
 * 認識失敗時は空を返して何も表示しない（偽の翻訳を出すより誠実）。
 *
 * v1.0 工程表 4.17: 音声データ即時削除
 *   音声バイナリはリクエストのメモリ内のみ。処理後スコープ外となり即時GC。
 *   DB保存・ファイル書き出しは一切しない。
 */

// 生徒の母国語名（live画面の言語セレクタと同じ値）→ STT言語コード。
// latest_short × global は同時検出3言語まで（2026-07-12実測）。
// 聞く言語は「生徒の母国語 + en-US + ja-JP」の3つ（上限ちょうど）。
// 日本語は 2026-09-06 に追加：それまで日本語が対象外で、生徒が日本語で話すと
// 拾えないか英語として誤認していた（かずき指摘）。母国語+英語の全ペアは実測済み
const LANGUAGE_TO_STT_CODE: Record<string, string> = {
    English: 'en-US',
    Spanish: 'es-ES',
    Portuguese: 'pt-BR',
    Korean: 'ko-KR',
    Chinese: 'cmn-Hans-CN',   // 旧 'zh' は latest_short 非対応で全リクエストが失敗していた
    French: 'fr-FR',
    German: 'de-DE',
    Thai: 'th-TH',
    Vietnamese: 'vi-VN',
    Indonesian: 'id-ID',
};

type TranscribeResult = { original: string; japanese: string; merged: boolean; engine: string };

// 認識モデル（2026-09-06 かずき決定「い」）。既定は新世代の Chirp 3：
//  - 言語を「自動判定」に任せられる（母国語・英語・日本語の3言語制限が消える）
//  - 同じ音声18文の比較で、意味が変わる聞き間違いが 5件→0件、英語の単語誤り率 5.0%→1.4%
//    （読み上げ音声での検証。詳細＝ my-company/03/strategy/検証_音声認識モデル比較_2026-09-06.md）
//  - 料金は同じ枠。応答時間もほぼ同じ（約1.5〜1.8秒）
// Vercel の環境変数 STT_MODEL=latest_short で旧設定に戻せる（コード変更なし）
const STT_MODEL: 'chirp_3' | 'latest_short' = process.env.STT_MODEL === 'latest_short' ? 'latest_short' : 'chirp_3';
const CHIRP_LOCATION = 'us';   // Chirp 3 は global では使えず、us / eu などの複数リージョンで提供

// Chirp 3 は日本語を「すみ ませ ん 、 駅 は」のように語ごとの空白つきで返す（比較検証で確認）。
// 日本語の文字に接する空白だけ落とす（英単語どうしの空白は残る）
const CJK = '[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uff00-\uffef]';
const CJK_SPACING = new RegExp(`(?<=${CJK})\\s+|\\s+(?=${CJK})`, 'g');
function tidyJapaneseSpacing(text: string): string {
    return text.replace(CJK_SPACING, '');
}

/**
 * 1切れの音声を Google Cloud STT v2 で文字起こしする（モデル指定）。
 * 句読点つきで認識する（文の終わりが分かると、結合の判定と翻訳の質が上がる）。
 * 言語によっては句読点が未対応の可能性があるため（未実測）、
 * 「引数が不正」(code 3) で断られた時だけ句読点なしで1回やり直す。
 */
async function runRecognize(model: 'chirp_3' | 'latest_short', audioBytes: Buffer, languageCodes: string[]) {
    const location = model === 'chirp_3' ? CHIRP_LOCATION : 'global';
    const speech = getSpeechClient(location);
    const projectId = getProjectId();
    const request = {
        recognizer: `projects/${projectId}/locations/${location}/recognizers/_`,
        content: audioBytes.toString('base64'),
    };
    const config = {
        autoDecodingConfig: {},               // webm/opus を自動判定
        languageCodes,
        model,
    };
    try {
        const [res] = await speech.recognize({
            ...request,
            config: { ...config, features: { enableAutomaticPunctuation: true } },
        });
        return res;
    } catch (err) {
        if ((err as { code?: number }).code !== 3) throw err;
        console.warn('[transcribe] punctuation rejected, retrying without it:', err instanceof Error ? err.message : err);
        const [res] = await speech.recognize({ ...request, config });
        return res;
    }
}

/**
 * 既定は Chirp 3（言語は自動判定）。新モデル側の障害（地域・上限など）で翻訳が止まらないよう、
 * 失敗したら旧設定（latest_short・母国語+英語+日本語の3言語指定）で1回やり直す
 */
async function recognizeChunk(audioBytes: Buffer, fallbackLanguageCodes: string[]) {
    if (STT_MODEL === 'chirp_3') {
        try {
            return await runRecognize('chirp_3', audioBytes, ['auto']);
        } catch (err) {
            console.error('[transcribe] chirp_3 failed, falling back to latest_short:', err instanceof Error ? err.message : err);
        }
    }
    return runRecognize('latest_short', audioBytes, fallbackLanguageCodes);
}

/**
 * Google Cloud STT v2 + Translation で文字起こし＋翻訳。
 * context（直前の発話の原文）があれば、つなげた文章として翻訳する（B案の結合）
 */
async function transcribeWithGoogle(audioBytes: Buffer, studentLanguage: string, context: string): Promise<TranscribeResult> {
    const studentCode = LANGUAGE_TO_STT_CODE[studentLanguage] || 'en-US';
    const languageCodes = Array.from(new Set([studentCode, 'en-US', 'ja-JP']));

    const sttResponse = await recognizeChunk(audioBytes, languageCodes);

    // 検出言語（Chirp 3 は 'ja'、旧モデルは 'ja-JP' のように返る）
    const detectedLang = sttResponse.results?.[0]?.languageCode || '';
    const isJapanese = detectedLang.startsWith('ja');

    // 認識結果を連結
    let original = (sttResponse.results || [])
        .map(r => r.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();
    if (isJapanese) original = tidyJapaneseSpacing(original);

    if (!original) {
        return { original: '', japanese: '', merged: false, engine: 'google-stt' };
    }

    // 直前の発話が文の途中で終わっていた場合、画面側がその原文を文脈として送ってくる。
    // 前後をつなげた文章として翻訳し、画面側は前の吹き出しを差し替える
    const merged = context ? (isJapanese ? tidyJapaneseSpacing(`${context} ${original}`) : `${context} ${original}`) : original;

    // 日本語ならそのまま、それ以外は日本語訳
    if (isJapanese) {
        return { original: merged, japanese: merged, merged: !!context, engine: 'google-stt' };
    }

    const sourceLanguage = detectedLang.startsWith('en') ? 'English' : (detectedLang ? `${studentLanguage} or English` : studentLanguage);
    const { japanese, engine } = await translateToJapanese(merged, sourceLanguage);

    return { original: merged, japanese, merged: !!context, engine: `google-stt+${engine}` };
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // 認証チェック（従来は無認証＝誰でも叩き放題だった。最重要のコスト栓）
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 解約した先生は「見るだけ」（2026-09-25 案B）。AI は使えない
        if (!(await canUseApp(supabase, user.id))) {
            return NextResponse.json({ error: READ_ONLY_MESSAGE, original: '', japanese: '' }, { status: 402 });
        }

        // レート制限（transcribe専用カウント。/api/ai・/api/ai/stream の上限とは分離）
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { count } = await supabase
            .from('ai_usage_log')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('prompt_type', 'transcribe')
            .gte('created_at', oneHourAgo);

        if (count !== null && count >= TRANSCRIBE_HOURLY_LIMIT) {
            // 運営者へ通知（2026-09-11）。上限に達した最初の1回だけ送る：
            // 上限を超えた後は利用記録が増えないので、回数がちょうど上限の時が「初めて止めた時」
            if (count === TRANSCRIBE_HOURLY_LIMIT) {
                await notifyAdmin({
                    level: 'warning',
                    title: '翻訳の利用が1時間の上限に達しました',
                    body: `先生のID: ${user.id}\n直近1時間の翻訳回数: ${count}（上限 ${TRANSCRIBE_HOURLY_LIMIT}）\n複数のタブ・閉じ忘れ・想定外の使い方の可能性があります。`,
                });
            }
            return NextResponse.json(
                { error: 'Rate limit exceeded', original: '', japanese: '' },
                { status: 429 }
            );
        }

        const formData = await req.formData();
        const audioBlob = formData.get('audio') as Blob;
        const studentLanguage = String(formData.get('language') || 'English');
        // 直前の生徒発話の原文（文の途中で終わっていた時だけ画面側が付ける）。長さは抑える
        const context = String(formData.get('context') || '').trim().slice(0, 400);
        // 1切れの音声の長さ（ミリ秒・画面側が録音の開始〜停止で測る）。無ければバイト数から概算（opus 約16KB/秒）
        const durationMs = Math.max(0, Math.round(Number(formData.get('duration_ms')) || (audioBlob ? audioBlob.size / 16 : 0)));

        if (!audioBlob || audioBlob.size < 500) {
            return NextResponse.json({ original: '', japanese: '' });
        }

        // 月の上限（2026-09-23 かずき決定・案B）。届いたら翻訳モードだけ止める（他の機能はそのまま）
        const quota = await getTranslationQuota(supabase, user.id);
        if (quota.usedMin >= quota.capMin) {
            return NextResponse.json(
                { error: 'monthly_limit', capMin: quota.capMin, usedMin: quota.usedMin, original: '', japanese: '' },
                { status: 429 }
            );
        }

        if (!isGoogleCloudConfigured()) {
            console.error('[transcribe] GOOGLE_APPLICATION_CREDENTIALS_JSON is not set');
            return NextResponse.json(
                { error: 'Speech recognition is not configured', original: '', japanese: '' },
                { status: 500 }
            );
        }

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        // 使用ログ記録（非同期・ノンブロッキング）
        // token_usage には音声の長さ（ミリ秒）を記録する（2026-09-23〜。月の上限がこれを合計する。
        // それより前の行はバイト数＝translation-quota.ts の USAGE_MS_SINCE で区別）
        const logUsage = (engine: string) => {
            supabase.from('ai_usage_log').insert({
                user_id: user.id,
                model: engine,
                prompt_type: 'transcribe',
                token_usage: durationMs,
            }).then(() => {}, console.error);
        };

        let result: TranscribeResult | null = null;
        if (STT_ENGINE === 'gemini') {
            try {
                result = await transcribeWithGemini(audioBuffer, audioBlob.type || 'audio/webm', studentLanguage, context);
            } catch (err) {
                // 時間切れ・形式の崩れ・上限など。翻訳モードを止めないよう Chirp 3 でやり直す
                console.error('[transcribe] gemini stt failed, falling back to google:', err instanceof Error ? err.message : err);
            }
        }
        if (!result) result = await transcribeWithGoogle(audioBuffer, studentLanguage, context);
        // 使った物まで記録に残す（gemini-3.5-flash-lite / google-stt / google-stt+gemini-3.1-flash-lite / google-stt+google-translate）
        logUsage(result.engine);
        // 残り分数も返す（画面側が残りわずかの案内に使う）
        const remainingMin = Math.max(0, Math.round((quota.capMin - quota.usedMin - durationMs / 60000) * 10) / 10);
        return NextResponse.json({ ...result, remainingMin, capMin: quota.capMin });

    } catch (error) {
        // 認識失敗＝何も表示しない（Geminiで捏造するより誠実）。原因はログに残す
        console.error('Transcribe error:', error instanceof Error ? error.message : error);
        // 音が不明瞭・短いなど「送られてきた音声が認識できない」場合が大半なので 400 で返す。
        // 500 は監視の仕組みが「アプリの故障」として拾ってしまう（2026-09-10 掃除）
        return NextResponse.json({ error: 'Transcription failed', original: '', japanese: '' }, { status: 400 });
    }
}
