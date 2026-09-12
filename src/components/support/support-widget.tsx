/**
 * v1.0 工程表 4.8: ユーザー向けAIサポート（フローティングウィジェット）
 *
 * 全ページ右下に表示。クリックで「使い方ヘルプ」（ASTAの使い方を答えるAI）を開く。
 * 授業や教え方の相談はホームの「ASTAに聞く（授業の相談）」が受け持つ（2026-09-12 かずき決定：案A）。
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircleQuestion, X, Send, Loader2, Sparkles } from 'lucide-react';

type Msg = { role: 'user' | 'ai'; text: string };

export function SupportWidget() {
    const [open, setOpen] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Msg[]>([]);
    const [loading, setLoading] = useState(false);
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    const send = async (e: React.FormEvent) => {
        e.preventDefault();
        const q = input.trim();
        if (!q || loading) return;
        setMessages(prev => [...prev, { role: 'user', text: q }]);
        setInput('');
        setLoading(true);
        try {
            const res = await fetch('/api/support', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ question: q }),
            });
            const data = await res.json();
            setMessages(prev => [...prev, { role: 'ai', text: data.answer || data.error || '回答を取得できませんでした' }]);
        } catch {
            setMessages(prev => [...prev, { role: 'ai', text: '通信エラーが発生しました。時間をおいてお試しください。' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {/* トリガーボタン */}
            {!open && (
                <button
                    onClick={() => setOpen(true)}
                    aria-label="使い方ヘルプ"
                    title="使い方ヘルプ（ASTAの使い方を聞く）"
                    className="fixed bottom-5 right-5 z-50 w-13 h-13 p-3.5 bg-[#6b5ca5] text-white rounded-full shadow-[0_4px_24px_rgba(107,92,165,0.4)] hover:scale-105 transition-transform"
                >
                    <MessageCircleQuestion size={24} />
                </button>
            )}

            {/* チャットパネル */}
            {open && (
                <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] h-[min(540px,calc(100vh-2.5rem))] bg-white rounded-3xl shadow-[0_8px_48px_rgba(107,92,165,0.25)] border border-[#ccbeff]/30 flex flex-col overflow-hidden">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#6b5ca5] text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} />
                            <h2 className="font-bold text-sm">使い方ヘルプ</h2>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* メッセージ */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f6f3fb]">
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <MessageCircleQuestion size={36} className="mx-auto text-[#ccbeff] mb-3" />
                                <p className="text-sm text-[#3a3350] font-medium">ASTAの使い方を聞いてください</p>
                                <p className="text-xs text-[#484550] mt-1.5 leading-relaxed">
                                    例：「生徒の画面に翻訳を出すには？」<br />「マイクが動かない時は？」
                                </p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                                    m.role === 'user'
                                        ? 'bg-[#6b5ca5] text-white rounded-tr-none'
                                        : 'bg-white text-[#3a3350] rounded-tl-none shadow-sm border border-[#f0ebf8]'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-tl-none px-3.5 py-3 shadow-sm border border-[#f0ebf8] flex gap-1">
                                    {[0, 150, 300].map(d => (
                                        <span key={d} className="w-1.5 h-1.5 bg-[#ccbeff] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* 入力 */}
                    <form onSubmit={send} className="p-3 border-t border-[#f0ebf8] bg-white flex items-center gap-2 shrink-0">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="質問を入力…"
                            className="flex-1 px-3.5 py-2.5 bg-[#f0ebf8] rounded-full outline-none focus:bg-[#efe9ff] transition-colors text-xs text-[#3a3350]"
                        />
                        <button type="submit" disabled={!input.trim() || loading}
                            className="p-2.5 bg-[#6b5ca5] text-white rounded-full disabled:opacity-50 transition-opacity shrink-0">
                            <Send size={15} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
