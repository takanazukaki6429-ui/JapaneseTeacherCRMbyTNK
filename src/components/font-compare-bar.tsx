'use client';

/**
 * 書体の見比べ（置き場 try/font-compare だけ・2026-09-22 かずき依頼「案B」）
 *
 * 画面の左下の帯で「今／案1／案2／案3」を切り替える。選んだ書体はこのブラウザに覚えさせるので、
 * 画面を移っても同じ書体のまま見比べられる。URLの最後に ?font=1〜3（?font=0 で今の書体）でも切り替えられる。
 * 本番へ入れる統合版には入れない。決まった書体だけを、あとで統合版に入れる。
 */
import { useState, useSyncExternalStore } from 'react';

const OPTIONS = [
    { id: '0', label: '今', note: 'ヒラギノ丸ゴ（太字は機械的に太らせた偽物）' },
    { id: '1', label: '案1', note: '丸ゴシック（Zen Maru Gothic・本物の太字）' },
    { id: '2', label: '案2', note: '角ゴシック（ヒラギノ角ゴ／Noto Sans JP）' },
    { id: '3', label: '案3', note: '見出しだけ丸ゴシック・本文は角ゴシック' },
] as const;

// 今当たっている書体を <html data-font> から読む（切り替えたら知らせる）
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const readFont = () => document.documentElement.dataset.font ?? '0';

function apply(id: string) {
    const root = document.documentElement;
    if (id === '0') delete root.dataset.font;
    else root.dataset.font = id;
    try {
        if (id === '0') localStorage.removeItem('asta-font');
        else localStorage.setItem('asta-font', id);
    } catch { /* 保存できなくても、この画面の中では切り替わる */ }
    listeners.forEach(fn => fn());
}

export function FontCompareBar() {
    const current = useSyncExternalStore(subscribe, readFont, () => '0');
    const [open, setOpen] = useState(true);

    const choose = (id: string) => apply(id);
    const now = OPTIONS.find(o => o.id === current) ?? OPTIONS[0];

    return (
        <div
            style={{ fontFamily: '-apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif' }}
            className="fixed left-3 bottom-3 z-[9999] rounded-xl border border-[#d9d0f0] bg-white/95 shadow-lg text-[12px] text-[#3a3350] backdrop-blur"
        >
            {open ? (
                <div className="p-2 flex flex-col gap-1.5 max-w-[260px]">
                    <div className="flex items-center justify-between gap-2">
                        <b className="text-[12px]">書体の見比べ</b>
                        <button type="button" onClick={() => setOpen(false)} className="text-[#807a8d] hover:text-[#3a3350] px-1" aria-label="たたむ">×</button>
                    </div>
                    <div className="flex gap-1">
                        {OPTIONS.map(o => (
                            <button
                                key={o.id}
                                type="button"
                                onClick={() => choose(o.id)}
                                aria-pressed={current === o.id}
                                className={`flex-1 rounded-lg px-2 py-1 font-bold border ${current === o.id ? 'bg-[#6b5ca5] text-white border-[#6b5ca5]' : 'bg-[#f7f5fb] border-[#e6e0f2] hover:border-[#6b5ca5]'}`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </div>
                    <div className="text-[#6c6680] leading-snug">{now.note}</div>
                </div>
            ) : (
                <button type="button" onClick={() => setOpen(true)} className="px-3 py-1.5 font-bold">
                    書体：{now.label}
                </button>
            )}
        </div>
    );
}
