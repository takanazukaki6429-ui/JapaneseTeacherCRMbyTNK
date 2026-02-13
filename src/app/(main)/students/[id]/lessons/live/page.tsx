'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Send, MessageCircle, BookOpen, CheckCircle, Save, Loader2, Sparkles, X } from 'lucide-react';
import Link from 'next/link';

type KeyPoint = {
    question: string;
    answer: string;
};

type PrepContent = {
    review_quiz: KeyPoint[];
    intro_topic: string;
    advice: string;
};

type ChatMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export default function LiveLessonPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = typeof params.id === 'string' ? params.id : '';
    const searchParams = useSearchParams();
    const scheduledLessonId = searchParams.get('scheduledLessonId');

    // State
    const [prepContent, setPrepContent] = useState<PrepContent | null>(null);
    const [activeTab, setActiveTab] = useState<'prep' | 'chat'>('prep');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Load prepared content from local storage
        const saved = localStorage.getItem(`prep_content_${studentId}`);
        if (saved) {
            try {
                setPrepContent(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse prep content', e);
            }
        }
    }, [studentId]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, activeTab]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const supabase = createClient();
        const userContent = input;

        const userMsg = { role: 'user' as const, content: userContent };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);
        setActiveTab('chat');

        try {
            // 1. Save User Message
            await supabase.from('lesson_chat_logs').insert({
                student_id: studentId,
                lesson_id: scheduledLessonId || null,
                role: 'user',
                content: userContent
            });

            const prompt = `
あなたはレッスン中の日本語教師をサポートするAIアシスタント（カンペ）です。
先生からの質問（文法の違い、例文の要求など）に対して、**簡潔に**、**わかりやすく**、**生徒にそのまま説明できるような**回答を提示してください。
長々とした解説は不要です。即座に使えるフレーズや例文を優先してください。

先生の質問: ${userContent}
`;
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) throw new Error('AI request failed');

            const data = await res.json();
            const aiContent = data.text;
            const aiMsg = { role: 'assistant' as const, content: aiContent };
            setMessages(prev => [...prev, aiMsg]);

            // 2. Save AI Message
            await supabase.from('lesson_chat_logs').insert({
                student_id: studentId,
                lesson_id: scheduledLessonId || null,
                role: 'assistant',
                content: aiContent
            });

        } catch (error) {
            console.error('Chat Error:', error);
            setMessages(prev => [...prev, { role: 'assistant', content: 'すみません、エラーが発生しました。もう一度お試しください。' }]);
        } finally {
            setIsTyping(false);
        }
    };

    const finishLesson = () => {
        // Navigate to Lesson Record page
        // We could pass the date/time via query params if needed
        const query = scheduledLessonId ? `?scheduledLessonId=${scheduledLessonId}` : '';
        router.push(`/students/${studentId}/lessons/new${query}`);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.4))] max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
            {/* Header */}
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
                <button
                    onClick={finishLesson}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-teal-700 font-bold rounded-lg hover:bg-teal-50 transition-colors shadow-sm text-sm"
                >
                    <Save size={16} />
                    レッスン終了・記録
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* Tabs (Mobile only) */}
                <div className="md:hidden flex border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('prep')}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'prep' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500'}`}
                    >
                        準備メモ
                    </button>
                    <button
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-3 text-sm font-bold ${activeTab === 'chat' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500'}`}
                    >
                        AIチャット
                    </button>
                </div>

                {/* Left Panel: Prepared Content */}
                <div className={`flex-1 overflow-y-auto p-4 bg-slate-50 ${activeTab === 'chat' ? 'hidden md:block' : ''}`}>
                    {prepContent ? (
                        <div className="space-y-6">
                            {/* Quiz Card */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <CheckCircle size={18} className="text-teal-500" />
                                    復習クイズ (Ice Break)
                                </h2>
                                <ul className="space-y-3">
                                    {prepContent.review_quiz.map((q, i) => (
                                        <li key={i} className="text-sm">
                                            <p className="font-bold text-slate-700 mb-1">Q. {q.question}</p>
                                            <p className="text-slate-500 pl-4 border-l-2 border-slate-200">A. {q.answer}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Intro Topic */}
                            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                                <h2 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    <MessageCircle size={18} className="text-blue-500" />
                                    導入トーク
                                </h2>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                                    {prepContent.intro_topic}
                                </p>
                            </div>

                            {/* Advice */}
                            <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                <h2 className="font-bold text-yellow-800 mb-2 text-xs uppercase tracking-wide">Advice</h2>
                                <p className="text-sm text-yellow-900 italic">
                                    {prepContent.advice}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400">
                            <BookOpen size={48} className="mb-4 opacity-50" />
                            <p>準備データがありません。</p>
                            <Link href={`/students/${studentId}/lessons/prepare`} className="text-teal-600 underline mt-2">
                                準備ページへ戻る
                            </Link>
                        </div>
                    )}
                </div>

                {/* Right Panel: AI Chat */}
                <div className={`flex-1 flex flex-col bg-white border-l border-slate-200 ${activeTab === 'prep' ? 'hidden md:flex' : 'flex'}`}>
                    <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={12} /> AI Teacher Support
                        </span>
                        {messages.length > 0 && (
                            <button onClick={() => setMessages([])} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                                <X size={12} /> Clear
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.length === 0 && (
                            <div className="text-center text-slate-400 py-12">
                                <p className="text-sm">「〜の例文を作って」「敬語に直して」</p>
                                <p className="text-xs mt-1">困ったときはAIに聞きましょう</p>
                            </div>
                        )}
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.role === 'user'
                                    ? 'bg-teal-600 text-white rounded-tr-none'
                                    : 'bg-slate-100 text-slate-800 rounded-tl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="AIに質問する..."
                                className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className="p-2.5 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
