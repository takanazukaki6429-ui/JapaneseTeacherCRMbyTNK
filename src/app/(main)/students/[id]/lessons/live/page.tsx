'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft, Send, MessageCircle, BookOpen, CheckCircle,
    Save, Sparkles, X, Mic, MicOff, Loader2, Zap
} from 'lucide-react';
import Link from 'next/link';

// ────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────
type KeyPoint = { question: string; answer: string };
type PrepContent = { review_quiz: KeyPoint[]; intro_topic: string; advice: string };
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type AutoSuggestion = { id: number; text: string; timestamp: Date };

// Web Speech API の型宣言
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
}
declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    }
}

// ────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────
const CHAR_TRIGGER = 100;   // 100文字ごとに自動分析
const EXCHANGE_TRIGGER = 3; // 3発言ごとに自動分析

// ────────────────────────────────────────────
// コンポーネント
// ────────────────────────────────────────────
export default function LiveLessonPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = typeof params.id === 'string' ? params.id : '';
    const searchParams = useSearchParams();
    const scheduledLessonId = searchParams.get('scheduledLessonId');

    // ── 既存state ──
    const [prepContent, setPrepContent] = useState<PrepContent | null>(null);
    const [activeTab, setActiveTab] = useState<'prep' | 'auto' | 'chat'>('prep');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ── 案Y：音声認識 state ──
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');          // 累積テキスト
    const [interimText, setInterimText] = useState('');         // 暫定テキスト（表示用）
    const [autoSuggestions, setAutoSuggestions] = useState<AutoSuggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [streamingText, setStreamingText] = useState('');     // ストリーミング表示中

    // ── 案Y：トリガーカウンタ ──
    const charsSinceLastTrigger = useRef(0);
    const exchangesSinceLastTrigger = useRef(0);
    const suggestionCounter = useRef(0);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const transcriptRef = useRef('');  // closureの問題を回避するためref管理

    // ────────────────────────────────────────────
    // 初期化
    // ────────────────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem(`prep_content_${studentId}`);
        if (saved) {
            try { setPrepContent(JSON.parse(saved)); } catch { /* ignore */ }
        }
    }, [studentId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    // ────────────────────────────────────────────
    // 案Y：自動分析トリガー
    // ────────────────────────────────────────────
    const triggerAnalysis = useCallback(async (currentTranscript: string) => {
        if (isAnalyzing || currentTranscript.trim().length < 10) return;

        setIsAnalyzing(true);
        setStreamingText('');
        setActiveTab('auto');

        let accumulated = '';

        try {
            const res = await fetch('/api/ai/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'live_assistant',
                    transcript: currentTranscript.slice(-600), // 直近600文字のみ送信
                }),
            });

            if (!res.ok || !res.body) throw new Error('Stream failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6);
                    if (data === '[DONE]') break;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            accumulated += parsed.text;
                            setStreamingText(accumulated);
                        }
                    } catch { /* ignore parse errors */ }
                }
            }

            // ストリーミング完了 → サジェスト一覧に追加
            if (accumulated.trim()) {
                suggestionCounter.current += 1;
                setAutoSuggestions(prev => [
                    { id: suggestionCounter.current, text: accumulated, timestamp: new Date() },
                    ...prev.slice(0, 4), // 最新5件まで保持
                ]);
            }
        } catch (err) {
            console.error('Auto analysis error:', err);
        } finally {
            setIsAnalyzing(false);
            setStreamingText('');
            charsSinceLastTrigger.current = 0;
            exchangesSinceLastTrigger.current = 0;
        }
    }, [isAnalyzing]);

    // ────────────────────────────────────────────
    // 案Y：音声認識 開始 / 停止
    // ────────────────────────────────────────────
    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('このブラウザは音声認識に対応していません。Chrome を使用してください。');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ja-JP';

        recognition.onresult = (e: SpeechRecognitionEvent) => {
            let interim = '';
            let newFinal = '';

            for (let i = e.resultIndex; i < e.results.length; i++) {
                const result = e.results[i];
                if (result.isFinal) {
                    newFinal += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            setInterimText(interim);

            if (newFinal) {
                const updated = transcriptRef.current + newFinal;
                transcriptRef.current = updated;
                setTranscript(updated);

                // トリガーカウント更新
                charsSinceLastTrigger.current += newFinal.length;
                exchangesSinceLastTrigger.current += 1;

                // トリガー判定
                if (
                    charsSinceLastTrigger.current >= CHAR_TRIGGER ||
                    exchangesSinceLastTrigger.current >= EXCHANGE_TRIGGER
                ) {
                    triggerAnalysis(updated);
                }
            }
        };

        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            if (e.error !== 'no-speech') {
                console.error('SpeechRecognition error:', e.error);
            }
        };

        recognition.onend = () => {
            // continuous=trueでも途切れることがある → 自動再起動
            if (recognitionRef.current) {
                try { recognition.start(); } catch { /* already started */ }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [triggerAnalysis]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // 自動再起動を止める
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
        setInterimText('');
    }, []);

    // アンマウント時にクリーンアップ
    useEffect(() => {
        return () => { stopListening(); };
    }, [stopListening]);

    // ────────────────────────────────────────────
    // 既存：手動チャット
    // ────────────────────────────────────────────
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const supabase = createClient();
        const userContent = input;
        const userMsg: ChatMessage = { role: 'user', content: userContent };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);
        setActiveTab('chat');

        try {
            await supabase.from('lesson_chat_logs').insert({
                student_id: studentId,
                lesson_id: scheduledLessonId || null,
                role: 'user',
                content: userContent
            });

            const prompt = `あなたはレッスン中の日本語教師をサポートするAIアシスタント（カンペ）です。
先生からの質問（文法の違い、例文の要求など）に対して、**簡潔に**、**わかりやすく**、**生徒にそのまま説明できるような**回答を提示してください。
長々とした解説は不要です。即座に使えるフレーズや例文を優先してください。

先生の質問: ${userContent}`;

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) throw new Error('AI request failed');

            const data = await res.json();
            const aiContent = data.text;
            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);

            await supabase.from('lesson_chat_logs').insert({
                student_id: studentId,
                lesson_id: scheduledLessonId || null,
                role: 'assistant',
                content: aiContent
            });
        } catch (err) {
            console.error('Chat Error:', err);
            setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const finishLesson = () => {
        stopListening();
        const query = scheduledLessonId ? `?scheduledLessonId=${scheduledLessonId}` : '';
        router.push(`/students/${studentId}/lessons/new${query}`);
    };

    // ────────────────────────────────────────────
    // UI
    // ────────────────────────────────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.4))] max-w-5xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">

            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 bg-teal-600 text-white shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-1 hover:bg-teal-700 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg flex items-center gap-2">
                            LIVE カンペモード
                            <span className="text-xs bg-red-500 px-2 py-0.5 rounded-full animate-pulse">ON AIR</span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* 音声認識トグルボタン */}
                    <button
                        onClick={isListening ? stopListening : startListening}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${isListening
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                            : 'bg-white/20 hover:bg-white/30 text-white'
                            }`}
                    >
                        {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                        {isListening ? 'AI認識中' : 'AI起動'}
                    </button>

                    <button
                        onClick={finishLesson}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-teal-700 font-bold rounded-lg hover:bg-teal-50 transition-colors shadow-sm text-sm"
                    >
                        <Save size={16} />
                        終了・記録
                    </button>
                </div>
            </div>

            {/* コンテンツエリア */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* タブ（モバイル） */}
                <div className="md:hidden flex border-b border-slate-200">
                    {(['prep', 'auto', 'chat'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 text-xs font-bold relative ${activeTab === tab ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500'}`}
                        >
                            {tab === 'prep' && '準備メモ'}
                            {tab === 'auto' && (
                                <span className="flex items-center justify-center gap-1">
                                    <Zap size={12} />AIサジェスト
                                    {autoSuggestions.length > 0 && (
                                        <span className="absolute top-1 right-2 bg-red-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                                            {autoSuggestions.length}
                                        </span>
                                    )}
                                </span>
                            )}
                            {tab === 'chat' && 'AIチャット'}
                        </button>
                    ))}
                </div>

                {/* 左パネル：準備メモ */}
                <div className={`w-full md:w-1/3 overflow-y-auto p-4 bg-slate-50 border-r border-slate-200 ${activeTab === 'chat' || activeTab === 'auto' ? 'hidden md:block' : ''}`}>
                    {prepContent ? (
                        <div className="space-y-4">
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                                    <CheckCircle size={16} className="text-teal-500" />
                                    復習クイズ
                                </h2>
                                <ul className="space-y-2">
                                    {prepContent.review_quiz.map((q, i) => (
                                        <li key={i} className="text-xs">
                                            <p className="font-bold text-slate-700 mb-0.5">Q. {q.question}</p>
                                            <p className="text-slate-500 pl-3 border-l-2 border-slate-200">A. {q.answer}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <h2 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-sm">
                                    <MessageCircle size={16} className="text-blue-500" />
                                    導入トーク
                                </h2>
                                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{prepContent.intro_topic}</p>
                            </div>
                            <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-100">
                                <h2 className="font-bold text-yellow-800 mb-1 text-xs uppercase tracking-wide">Advice</h2>
                                <p className="text-xs text-yellow-900 italic">{prepContent.advice}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <BookOpen size={40} className="mb-3 opacity-50" />
                            <p className="text-sm">準備データがありません</p>
                            <Link href={`/students/${studentId}/lessons/prepare`} className="text-teal-600 underline mt-2 text-xs">
                                準備ページへ
                            </Link>
                        </div>
                    )}
                </div>

                {/* 右エリア：AIサジェスト + チャット */}
                <div className="flex-1 flex flex-col overflow-hidden">

                    {/* ── AIサジェストパネル（案Y メイン） ── */}
                    <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'chat' ? 'hidden md:flex' : activeTab === 'prep' ? 'hidden md:flex' : 'flex'} md:flex`}>

                        {/* サジェストヘッダー */}
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Zap size={12} className="text-yellow-500" />
                                AI リアルタイムサジェスト
                                {isListening && (
                                    <span className="ml-2 text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse">
                                        認識中
                                    </span>
                                )}
                            </span>
                            {isAnalyzing && (
                                <span className="flex items-center gap-1 text-xs text-teal-600">
                                    <Loader2 size={12} className="animate-spin" />
                                    分析中…
                                </span>
                            )}
                        </div>

                        {/* 音声テキスト表示（暫定テキスト） */}
                        {isListening && (
                            <div className="px-4 pt-2 pb-1 bg-slate-50 border-b border-slate-100 shrink-0">
                                <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">
                                    {interimText
                                        ? <span className="text-slate-500 italic">{interimText}</span>
                                        : <span className="text-slate-300">話しているとAIが認識します…</span>
                                    }
                                </p>
                            </div>
                        )}

                        {/* ストリーミング表示（分析中） */}
                        {(isAnalyzing || streamingText) && (
                            <div className="mx-4 mt-3 p-3 bg-teal-50 border border-teal-200 rounded-xl shrink-0">
                                <p className="text-xs font-bold text-teal-700 mb-1 flex items-center gap-1">
                                    <Sparkles size={12} />
                                    AIが分析しています…
                                </p>
                                <p className="text-sm text-teal-900 whitespace-pre-wrap leading-relaxed">
                                    {streamingText}
                                    {isAnalyzing && <span className="animate-pulse">▋</span>}
                                </p>
                            </div>
                        )}

                        {/* サジェスト一覧 */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {autoSuggestions.length === 0 && !isListening && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                    <Mic size={40} className="mb-3 opacity-30" />
                                    <p className="text-sm font-medium">「AI起動」ボタンを押すと</p>
                                    <p className="text-xs mt-1">授業中の会話をAIが自動で分析します</p>
                                </div>
                            )}
                            {autoSuggestions.length === 0 && isListening && !isAnalyzing && (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 py-12">
                                    <Mic size={40} className="mb-3 text-teal-400 animate-pulse" />
                                    <p className="text-sm font-medium text-slate-600">音声認識中…</p>
                                    <p className="text-xs mt-1">{CHAR_TRIGGER}文字 または {EXCHANGE_TRIGGER}発言でAIが自動分析します</p>
                                </div>
                            )}
                            {autoSuggestions.map((s) => (
                                <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-teal-600 uppercase tracking-wide flex items-center gap-1">
                                            <Sparkles size={10} /> サジェスト #{s.id}
                                        </span>
                                        <span className="text-[10px] text-slate-400">
                                            {s.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── 区切り線（デスクトップ） ── */}
                    <div className="hidden md:block border-t border-slate-200 shrink-0" />

                    {/* ── 手動AIチャット（下部） ── */}
                    <div className={`flex flex-col bg-white ${activeTab === 'prep' || activeTab === 'auto' ? 'hidden md:flex' : 'flex'} md:flex md:max-h-64`}>
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={12} /> 手動チャット
                            </span>
                            {messages.length > 0 && (
                                <button onClick={() => setMessages([])} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                                    <X size={12} /> Clear
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {messages.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-4">
                                    「〜の例文を作って」など手動で質問できます
                                </p>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${msg.role === 'user'
                                        ? 'bg-teal-600 text-white rounded-tr-none'
                                        : 'bg-slate-100 text-slate-800 rounded-tl-none'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-100 rounded-2xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                                        {[0, 150, 300].map((d) => (
                                            <span key={d} className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 border-t border-slate-100 bg-slate-50 shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="AIに質問する…"
                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 transition-colors shadow-sm"
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
