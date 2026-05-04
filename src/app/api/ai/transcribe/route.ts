import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audioBlob = formData.get('audio') as Blob;

        if (!audioBlob || audioBlob.size < 500) {
            return NextResponse.json({ original: '', japanese: '' });
        }

        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = Buffer.from(arrayBuffer).toString('base64');
        const mimeType = (audioBlob.type || 'audio/webm').split(';')[0];

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
        const parsed = JSON.parse(clean);

        return NextResponse.json(parsed);
    } catch (error) {
        console.error('Transcribe error:', error);
        return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }
}
