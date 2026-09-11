'use client';

/**
 * ホームの「ASTAに聞く」：生徒に紐づかない質問の入力欄1本（画面の要素一覧_2026-09-10.md 画面1）。
 * 答えはこの画面の下にそのまま出す（別の画面へ移動しない）。
 */
import { useState } from 'react';
import { MessagesSquare, Send, Loader2, X } from 'lucide-react';

export function AskAsta() {
    const [prompt, setPrompt] = useState('');
    const [answer, setAnswer] = useState('');
    const [loading, setLoading] = useState(false);

    const ask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim() || loading) return;
        setLoading(true);
        setAnswer('');
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt.trim(), type: 'home_ask' }),   // ホームの質問（利用実態を画面ごとに数えるため）
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || '答えを受け取れませんでした');
            setAnswer(data.text);
        } catch (err) {
            setAnswer(`答えを受け取れませんでした：${err instanceof Error ? err.message : '不明な理由'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="bg-white rounded-3xl p-6 shadow-[0_2px_24px_rgba(156,79,90,0.06)] space-y-4">
            <h2 className="text-lg font-bold text-[#3b2e2a] flex items-center gap-2">
                <MessagesSquare size={20} className="text-[#9c4f5a]" /> ASTAに聞く
            </h2>
            <form onSubmit={ask} className="flex items-center gap-2 bg-[#f7f3ec] border border-[#dccfc4] rounded-full pl-5 pr-1.5 py-1.5">
                <input
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="聞きたいことを書いてください（例：て形の教え方は？）"
                    className="flex-1 min-w-0 bg-transparent text-[15px] text-[#3b2e2a] placeholder:text-[#8a7d77] focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    className="bg-[#9c4f5a] hover:bg-[#8a434d] disabled:opacity-50 text-white text-[15px] font-bold px-5 py-2 rounded-full flex items-center gap-1.5 transition-colors"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />} 質問する
                </button>
            </form>
            {loading && <p className="text-sm text-[#534344]">ASTAが考えています…</p>}
            {answer && (
                <div className="relative bg-[#f7f3ec] rounded-2xl p-5 pr-12">
                    <button type="button" onClick={() => setAnswer('')} aria-label="答えを閉じる" className="absolute top-3 right-3 p-1.5 text-[#534344] hover:text-[#3b2e2a] rounded-full">
                        <X size={16} />
                    </button>
                    <p className="text-xs font-bold text-[#9c4f5a] mb-2">ASTAの答え</p>
                    <p className="text-[15px] text-[#3b2e2a] whitespace-pre-wrap leading-relaxed">{answer}</p>
                </div>
            )}
        </section>
    );
}
