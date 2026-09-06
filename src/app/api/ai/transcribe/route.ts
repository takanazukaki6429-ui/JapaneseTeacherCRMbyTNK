import { NextRequest, NextResponse } from 'next/server';
import { getSpeechClient, getTranslateClient, getProjectId, isGoogleCloudConfigured } from '@/lib/google-cloud';
import { createClient } from '@/lib/supabase/server';

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
 *     → Google Cloud STT v2 で文字起こし（生徒の母国語 + en-US + ja-JP の3言語検出・句読点つき）
 *     → 文脈があれば前後をつなげてから Google Cloud Translation v2 で日本語訳
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

type TranscribeResult = { original: string; japanese: string; merged: boolean };

/**
 * 1切れの音声を Google Cloud STT v2 で文字起こしする。
 * 句読点つきで認識する（文の終わりが分かると、結合の判定と翻訳の質が上がる）。
 * 言語によっては句読点が未対応の可能性があるため（未実測）、
 * 「引数が不正」(code 3) で断られた時だけ句読点なしで1回やり直す。
 */
async function recognizeChunk(audioBytes: Buffer, languageCodes: string[]) {
    const speech = getSpeechClient();
    const projectId = getProjectId();
    const request = {
        recognizer: `projects/${projectId}/locations/global/recognizers/_`,
        content: audioBytes.toString('base64'),
    };
    const config = {
        autoDecodingConfig: {},               // webm/opus を自動判定
        languageCodes,
        model: 'latest_short',                // 短い発話向け（1切れ最長12秒）
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
 * Google Cloud STT v2 + Translation で文字起こし＋翻訳。
 * context（直前の発話の原文）があれば、つなげた文章として翻訳する（B案の結合）
 */
async function transcribeWithGoogle(audioBytes: Buffer, studentLanguage: string, context: string): Promise<TranscribeResult> {
    const studentCode = LANGUAGE_TO_STT_CODE[studentLanguage] || 'en-US';
    const languageCodes = Array.from(new Set([studentCode, 'en-US', 'ja-JP']));

    const sttResponse = await recognizeChunk(audioBytes, languageCodes);

    // 認識結果を連結
    const original = (sttResponse.results || [])
        .map(r => r.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();

    if (!original) {
        return { original: '', japanese: '', merged: false };
    }

    // 直前の発話が文の途中で終わっていた場合、画面側がその原文を文脈として送ってくる。
    // 前後をつなげた文章として翻訳し、画面側は前の吹き出しを差し替える
    const merged = context ? `${context} ${original}` : original;

    // 検出言語が日本語ならそのまま、それ以外は日本語訳
    const detectedLang = sttResponse.results?.[0]?.languageCode || '';
    if (detectedLang.startsWith('ja')) {
        return { original: merged, japanese: merged, merged: !!context };
    }

    const translate = getTranslateClient();
    const [translated] = await translate.translate(merged, 'ja');

    return { original: merged, japanese: translated, merged: !!context };
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();

        // 認証チェック（従来は無認証＝誰でも叩き放題だった。最重要のコスト栓）
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (!user || authError) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

        if (!audioBlob || audioBlob.size < 500) {
            return NextResponse.json({ original: '', japanese: '' });
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
        // token_usage には音声バイト数を記録（1切れの長さは可変なので、利用時間はバイト数から概算する）
        const logUsage = (engine: string) => {
            supabase.from('ai_usage_log').insert({
                user_id: user.id,
                model: engine,
                prompt_type: 'transcribe',
                token_usage: audioBlob.size,
            }).then(() => {}, console.error);
        };

        const result = await transcribeWithGoogle(audioBuffer, studentLanguage, context);
        logUsage('google-stt');
        return NextResponse.json({ ...result, engine: 'google-stt' });

    } catch (error) {
        // 認識失敗＝何も表示しない（Geminiで捏造するより誠実）。原因はログに残す
        console.error('Transcribe error:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Transcription failed', original: '', japanese: '' }, { status: 500 });
    }
}
