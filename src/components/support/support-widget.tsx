/**
 * v1.0 工程表 4.8: ユーザー向けAIサポート（フローティングウィジェット）
 *
 * 全ページ右下に表示。クリックでAIヘルプチャットを開く。
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
                    aria-label="ヘルプ"
                    className="fixed bottom-5 right-5 z-50 w-13 h-13 p-3.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white rounded-full shadow-[0_4px_24px_rgba(111,83,133,0.4)] hover:scale-105 transition-transform"
                >
                    <MessageCircleQuestion size={24} />
                </button>
            )}

            {/* チャットパネル */}
            {open && (
                <div className="fixed bottom-5 right-5 z-50 w-[min(380px,calc(100vw-2.5rem))] h-[min(540px,calc(100vh-2.5rem))] bg-white rounded-3xl shadow-[0_8px_48px_rgba(111,83,133,0.25)] border border-[#c9a8e0]/30 flex flex-col overflow-hidden">
                    {/* ヘッダー */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#6f5385] to-[#9b77b5] text-white shrink-0">
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} />
                            <h2 className="font-bold text-sm">AIヘルプ</h2>
                        </div>
                        <button onClick={() => setOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {/* メッセージ */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#faf9fd]">
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <MessageCircleQuestion size={36} className="mx-auto text-[#c9a8e0] mb-3" />
                                <p className="text-sm text-[#1a1c1e] font-medium">ASTAの使い方を聞いてください</p>
                                <p className="text-xs text-[#4b454e] mt-1.5 leading-relaxed">
                                    例：「字幕PiPの使い方は？」<br />「マイクが動かない時は？」
                                </p>
                            </div>
                        )}
                        {messages.map((m, i) => (
                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                                    m.role === 'user'
                                        ? 'bg-gradient-to-br from-[#6f5385] to-[#9b77b5] text-white rounded-tr-none'
                                        : 'bg-white text-[#1a1c1e] rounded-tl-none shadow-sm border border-[#f4f3f7]'
                                }`}>
                                    {m.text}
                                </div>
                            </div>
                        ))}
                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-tl-none px-3.5 py-3 shadow-sm border border-[#f4f3f7] flex gap-1">
                                    {[0, 150, 300].map(d => (
                                        <span key={d} className="w-1.5 h-1.5 bg-[#c9a8e0] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                    ))}
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* 入力 */}
                    <form onSubmit={send} className="p-3 border-t border-[#f4f3f7] bg-white flex items-center gap-2 shrink-0">
                        <input
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="質問を入力…"
                            className="flex-1 px-3.5 py-2.5 bg-[#f4f3f7] rounded-full outline-none focus:bg-[#f2daff] transition-colors text-xs text-[#1a1c1e]"
                        />
                        <button type="submit" disabled={!input.trim() || loading}
                            className="p-2.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white rounded-full disabled:opacity-50 transition-opacity shrink-0">
                            <Send size={15} />
                        </button>
                    </form>
                </div>
            )}
        </>
    );
}
