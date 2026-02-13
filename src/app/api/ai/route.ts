import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
// Ensure GEMINI_API_KEY is set in .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const { prompt, context } = await req.json();

        // Debug logging
        console.log('Environment Check:', {
            hasGeminiKey: !!process.env.GEMINI_API_KEY,
            envKeys: Object.keys(process.env).filter(k => k.includes('GEMINI')),
            cwd: process.cwd(),
        });

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                {
                    error: 'API key not configured',
                    details: 'GEMINI_API_KEY is missing from process.env. Please verify .env.local in project root.'
                },
                { status: 500 }
            );
        }

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt is required' },
                { status: 400 }
            );
        }

        // Combine context and prompt if context exists
        const fullPrompt = context
            ? `CONTEXT:\n${context}\n\nUSER PROMPT:\n${prompt}`
            : prompt;

        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        // Generate content
        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();

        return NextResponse.json({ text });

    } catch (error: any) {
        console.error('AI API Error Details:', error);
        console.error('API Key Configured:', !!process.env.GEMINI_API_KEY);

        return NextResponse.json(
            {
                error: 'Failed to generate content',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
