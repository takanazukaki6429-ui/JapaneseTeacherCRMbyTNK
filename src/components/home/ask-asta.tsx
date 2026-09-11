'use client';

/**
 * ホームの「ASTAに聞く」：生徒に紐づかない質問の入力欄1本（画面の要素一覧_2026-09-10.md 画面1）。
 * 見た目は画面案 ホーム_色D書体E.html。答えはこの画面の下にそのまま出す（別の画面へ移動しない）。
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
        <section className="w-full pt-4 pb-4">
            <div className="bg-white rounded-3xl p-6 lg:p-7 shadow-[0_10px_30px_-5px_rgba(107,92,165,0.08)] border border-[#e8ddff]/40 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[#6b5ca5]">
                    <MessagesSquare size={24} strokeWidth={1.5} />
                    <h2 className="text-[18px] leading-[28px] font-bold text-[#3a3350]">ASTAに聞く</h2>
                </div>
                <form onSubmit={ask} className="relative flex items-center mt-1">
                    <input
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="聞きたいことを書いてください（例：て形の教え方は？）"
                        className="w-full h-14 pl-5 pr-36 bg-[#fdf7ff] rounded-2xl border border-[#6b5ca5]/20 text-[15px] text-[#3a3350] placeholder:text-[#7d7789] focus:outline-none focus:ring-4 focus:ring-[#6b5ca5]/10 focus:border-[#6b5ca5] shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={loading || !prompt.trim()}
                        className="absolute right-2 top-2 bottom-2 bg-[#6b5ca5] text-white hover:opacity-95 active:scale-[0.97] transition-all px-5 rounded-xl text-[15px] leading-[22px] font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                        <span>質問する</span>
                        {!loading && <Send size={16} strokeWidth={1.8} />}
                    </button>
                </form>
                {loading && <p className="text-[15px] text-[#484550]">ASTAが考えています…</p>}
                {answer && (
                    <div className="relative bg-[#f8f1ff] rounded-2xl p-5 pr-12 border border-[#e8ddff]/40">
                        <button type="button" onClick={() => setAnswer('')} aria-label="答えを閉じる" className="absolute top-3 right-3 p-1.5 text-[#484550] hover:text-[#3a3350] rounded-full">
                            <X size={16} />
                        </button>
                        <p className="text-[12px] leading-[18px] font-bold text-[#6b5ca5] mb-2">ASTAの答え</p>
                        <p className="text-[15px] leading-[26px] text-[#3a3350] whitespace-pre-wrap">{answer}</p>
                    </div>
                )}
            </div>
        </section>
    );
}
