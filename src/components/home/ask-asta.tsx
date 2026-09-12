'use client';

/**
 * ホームの「ASTAに聞く（授業の相談）」：授業や教え方の相談の入力欄1本（画面の要素一覧_2026-09-10.md 画面1）。
 * ASTAは日本語教師の相談相手として、先生の生徒の情報（レベル・今の課・前回のつまずき）を踏まえて答える（/api/ai の home_ask）。
 * ASTAの使い方の質問は、右下の「使い方ヘルプ」が受け持つ（2026-09-12 かずき決定：案A）。
 * 見た目は画面案 ホーム_色D書体E.html。答えはこの画面の下にそのまま出す（別の画面へ移動しない）。
 */
import { useState } from 'react';
import { MessagesSquare, Send, Loader2, X } from 'lucide-react';

/** AIの答えに混ざる記号（** や #）を落として、素直な文にする */
function readable(md: string): string {
    return md
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/^\s*[*-]\s+/gm, '・')
        .trim();
}

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
            setAnswer(readable(data.text ?? ''));
        } catch (err) {
            setAnswer(`答えを受け取れませんでした：${err instanceof Error ? err.message : '不明な理由'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="w-full mb-8">
            <div className="bg-white rounded-3xl p-6 lg:p-7 shadow-[0_10px_30px_-5px_rgba(156,79,90,0.08)] border border-[#e9e2d7]/40 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[#7f3843]">
                    <MessagesSquare size={24} strokeWidth={1.5} />
                    <h2 className="text-[18px] leading-[28px] font-bold text-[#1e1b15]">ASTAに聞く（授業の相談）</h2>
                </div>
                <p className="text-[12px] leading-[18px] text-[#484550] -mt-1">生徒の情報（レベル・今の課・前回のつまずき）を踏まえて答えます。ASTAの使い方は、右下の「？」（使い方ヘルプ）で聞いてください。</p>
                <form onSubmit={ask} className="relative flex items-center mt-1">
                    <input
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        placeholder="授業や教え方の相談を書いてください（例：マリアさんの次の授業で何をする？）"
                        className="w-full h-14 pl-5 pr-36 bg-[#fff8f0] rounded-2xl border border-[#7f3843]/20 text-[15px] text-[#1e1b15] placeholder:text-[#8a7672] focus:outline-none focus:ring-4 focus:ring-[#7f3843]/10 focus:border-[#7f3843] shadow-inner"
                    />
                    <button
                        type="submit"
                        disabled={loading || !prompt.trim()}
                        className="absolute right-2 top-2 bottom-2 bg-[#7f3843] text-white hover:opacity-95 active:scale-[0.97] transition-all px-5 rounded-xl text-[15px] leading-[22px] font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : null}
                        <span>質問する</span>
                        {!loading && <Send size={16} strokeWidth={1.8} />}
                    </button>
                </form>
                {loading && <p className="text-[15px] text-[#534344]">ASTAが考えています…</p>}
                {answer && (
                    <div className="relative bg-[#faf3e7] rounded-2xl p-5 pr-12 border border-[#e9e2d7]/40">
                        <button type="button" onClick={() => setAnswer('')} aria-label="答えを閉じる" className="absolute top-3 right-3 p-1.5 text-[#534344] hover:text-[#1e1b15] rounded-full">
                            <X size={16} />
                        </button>
                        <p className="text-[12px] leading-[18px] font-bold text-[#7f3843] mb-2">ASTAの答え</p>
                        <p className="text-[15px] leading-[26px] text-[#1e1b15] whitespace-pre-wrap">{answer}</p>
                    </div>
                )}
            </div>
        </section>
    );
}
