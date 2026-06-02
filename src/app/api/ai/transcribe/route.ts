import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSpeechClient, getTranslateClient, getProjectId, isGoogleCloudConfigured } from '@/lib/google-cloud';

export const dynamic = 'force-dynamic';

/**
 * v1.0 工程表 Week2: リアルタイム翻訳（Streaming STT 疑似ストリーミング = A'案）
 *
 * アーキテクチャ:
 *   クライアントが 2.5秒チャンクで音声を POST
 *     → Google Cloud STT v2 で文字起こし（多言語自動検出）
 *     → Google Cloud Translation v2 で日本語訳
 *     → 失敗時は Gemini multimodal にフォールバック
 *
 * v1.0 工程表 4.17: 音声データ即時削除
 *   音声バイナリはリクエストのメモリ内のみ。処理後スコープ外となり即時GC。
 *   DB保存・ファイル書き出しは一切しない。
 */

// STT が検出を試みる言語（要件定義書 v1.0 §3.4.4: en/ko/es/fr/it + pt/zh）
const STT_LANGUAGE_CODES = ['en-US', 'ko-KR', 'es-ES', 'fr-FR', 'it-IT', 'pt-BR', 'zh'];

type TranscribeResult = { original: string; japanese: string };

/**
 * Google Cloud STT v2 + Translation で文字起こし＋翻訳
 */
async function transcribeWithGoogle(audioBytes: Buffer): Promise<TranscribeResult> {
    const speech = getSpeechClient();
    const projectId = getProjectId();

    const [sttResponse] = await speech.recognize({
        recognizer: `projects/${projectId}/locations/global/recognizers/_`,
        config: {
            autoDecodingConfig: {},               // webm/opus を自動判定
            languageCodes: STT_LANGUAGE_CODES,
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

/**
 * Gemini multimodal フォールバック（STT失敗 or 未設定時）
 */
async function transcribeWithGemini(base64Audio: string, mimeType: string): Promise<TranscribeResult> {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent([
        { inlineData: { mimeType, data: base64Audio } },
        `この音声を文字起こしし、日本語に翻訳してください。
日本語教師のオンラインレッスンで生徒（外国人）が話している音声です。
以下のJSON形式のみで返してください（Markdownなし）:
{
  "original": "元の言語での文字起こし（聞き取れない・無音なら空文字）",
  "japanese": "日本語訳（元が日本語の場合もそのまま返す）"
}`,
    ]);

    const text = result.response.text();
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(clean) as TranscribeResult;
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audioBlob = formData.get('audio') as Blob;

        if (!audioBlob || audioBlob.size < 500) {
            return NextResponse.json({ original: '', japanese: '' });
        }

        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);
        const base64Audio = audioBuffer.toString('base64');
        const mimeType = (audioBlob.type || 'audio/webm').split(';')[0];

        // 1. Google Cloud STT v2 + Translate を優先
        if (isGoogleCloudConfigured()) {
            try {
                const result = await transcribeWithGoogle(audioBuffer);
                return NextResponse.json({ ...result, engine: 'google-stt' });
            } catch (googleError) {
                console.warn('[transcribe] Google STT failed, falling back to Gemini:',
                    googleError instanceof Error ? googleError.message : googleError);
                // フォールバックへ続行
            }
        }

        // 2. Gemini フォールバック
        const result = await transcribeWithGemini(base64Audio, mimeType);
        return NextResponse.json({ ...result, engine: 'gemini' });

    } catch (error) {
        console.error('Transcribe error:', error);
        return NextResponse.json({ error: 'Transcription failed', original: '', japanese: '' }, { status: 500 });
    }
}
