'use client';

/**
 * 生徒の1枚の「ASTAに聞く」：この生徒についての授業や教え方の相談（2026-09-13 生徒の1枚を案Cで作り直したときに追加）。
 * ホームと同じ相談相手の指示と生徒の情報で答える（/api/ai の student_ask。利用実態を画面ごとに数えるため名前を分ける）。
 */
import { useState } from 'react';
import { MessageCircleQuestion, ArrowUp, Loader2, X } from 'lucide-react';

/** AIの答えに混ざる記号（** や #）を落として、素直な文にする */
function readable(md: string): string {
    return md
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/^\s*[*-]\s+/gm, '・')
        .trim();
}

export function AskAstaStudent({ studentName }: { studentName: string }) {
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
                body: JSON.stringify({ prompt: `【${studentName}さんについての相談】${prompt.trim()}`, type: 'student_ask' }),
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
        <section className="bg-white border border-[#e4ddf0] rounded-xl p-6 shadow-[0_2px_16px_rgba(107,92,165,0.05)]">
            <div className="flex items-center gap-2 pb-3 border-b border-[#efe9f8] mb-3">
                <MessageCircleQuestion size={18} className="text-[#6b5ca5]" />
                <h2 className="text-[17px] font-bold text-[#3a3350]">ASTAに聞く</h2>
            </div>
            <p className="text-xs text-[#484550] mb-2">{studentName}さんの記録を踏まえて、教え方を答えます。</p>
            <form onSubmit={ask}>
                <textarea
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    rows={3}
                    placeholder={`${studentName}さんの教え方で聞きたいことは？`}
                    className="w-full bg-[#fbfaff] border border-[#e4ddf0] rounded-lg p-3 text-[15px] text-[#3a3350] placeholder:text-[#7d7789] focus:outline-none focus:border-[#6b5ca5] focus:ring-2 focus:ring-[#6b5ca5]/10 resize-none"
                />
                <div className="flex justify-end mt-2">
                    <button type="submit" aria-label="送る" disabled={loading || !prompt.trim()} className="flex items-center justify-center w-9 h-9 rounded-full bg-[#6b5ca5] hover:bg-[#5a4c94] text-white disabled:opacity-50 transition-colors">
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowUp size={16} />}
                    </button>
                </div>
            </form>
            {loading && <p className="text-sm text-[#484550] mt-2">ASTAが考えています…</p>}
            {answer && (
                <div className="relative bg-[#f8f1ff] rounded-lg p-4 pr-10 mt-3">
                    <button type="button" onClick={() => setAnswer('')} aria-label="答えを閉じる" className="absolute top-2 right-2 p-1.5 text-[#484550] hover:text-[#3a3350] rounded-full">
                        <X size={15} />
                    </button>
                    <p className="text-xs font-bold text-[#6b5ca5] mb-1.5">ASTAの答え</p>
                    <p className="text-[15px] leading-[26px] text-[#3a3350] whitespace-pre-wrap">{answer}</p>
                </div>
            )}
        </section>
    );
}
