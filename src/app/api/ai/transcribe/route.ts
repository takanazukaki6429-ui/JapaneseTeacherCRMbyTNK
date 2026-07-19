import { NextRequest, NextResponse } from 'next/server';
import { getSpeechClient, getTranslateClient, getProjectId, isGoogleCloudConfigured } from '@/lib/google-cloud';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

// 翻訳モードは2.5秒チャンクで叩かれる特殊ルート。
// 正常利用（連続75分）で約1800回/時になるため、上限はその水準に設定。
// これを超える＝複数タブ・閉じ忘れ・外部からの濫用とみなして遮断する。
const TRANSCRIBE_HOURLY_LIMIT = 1800;

/**
 * v1.0 工程表 Week2: リアルタイム翻訳（Streaming STT 疑似ストリーミング = A'案）
 *
 * アーキテクチャ:
 *   クライアントが 2.5秒チャンクで音声を POST（生徒の母国語名も同送）
 *     → Google Cloud STT v2 で文字起こし（生徒の母国語 + en-US の2言語検出）
 *     → Google Cloud Translation v2 で日本語訳
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
// latest_short × global は同時検出3言語まで（2026-07-12実測）のため、
// 「生徒の母国語 + en-US」の最大2言語に絞る。全ペア実測で成功確認済み。
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

type TranscribeResult = { original: string; japanese: string };

/**
 * Google Cloud STT v2 + Translation で文字起こし＋翻訳
 */
async function transcribeWithGoogle(audioBytes: Buffer, studentLanguage: string): Promise<TranscribeResult> {
    const speech = getSpeechClient();
    const projectId = getProjectId();

    const studentCode = LANGUAGE_TO_STT_CODE[studentLanguage] || 'en-US';
    const languageCodes = Array.from(new Set([studentCode, 'en-US']));

    const [sttResponse] = await speech.recognize({
        recognizer: `projects/${projectId}/locations/global/recognizers/_`,
        config: {
            autoDecodingConfig: {},               // webm/opus を自動判定
            languageCodes,
            model: 'latest_short',                // 短い発話向け（チャンク方式に最適）
        },
        content: audioBytes.toString('base64'),
    });

    // 認識結果を連結
    const original = (sttResponse.results || [])
        .map(r => r.alternatives?.[0]?.transcript || '')
        .join(' ')
        .trim();

    if (!original) {
        return { original: '', japanese: '' };
    }

    // 検出言語が日本語ならそのまま、それ以外は日本語訳
    const detectedLang = sttResponse.results?.[0]?.languageCode || '';
    if (detectedLang.startsWith('ja')) {
        return { original, japanese: original };
    }

    const translate = getTranslateClient();
    const [translated] = await translate.translate(original, 'ja');

    return { original, japanese: translated };
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
        // token_usage には音声バイト数を記録（チャンクは2.5秒固定なので行数×2.5秒で利用時間を集計できる）
        const logUsage = (engine: string) => {
            supabase.from('ai_usage_log').insert({
                user_id: user.id,
                model: engine,
                prompt_type: 'transcribe',
                token_usage: audioBlob.size,
            }).then(() => {}, console.error);
        };

        const result = await transcribeWithGoogle(audioBuffer, studentLanguage);
        logUsage('google-stt');
        return NextResponse.json({ ...result, engine: 'google-stt' });

    } catch (error) {
        // 認識失敗＝何も表示しない（Geminiで捏造するより誠実）。原因はログに残す
        console.error('Transcribe error:', error instanceof Error ? error.message : error);
        return NextResponse.json({ error: 'Transcription failed', original: '', japanese: '' }, { status: 500 });
    }
}
