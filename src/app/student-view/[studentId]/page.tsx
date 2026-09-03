'use client';

/**
 * 生徒に見せる画面 ＝ 電子教科書（2026-08-25 かずき決定の形）
 *
 * 授業は「先生が自分の画面を共有する方式」。Zoom等ではこの窓だけを共有する。
 * 生徒が早く目標達成するために、常に見えているべきもの：
 *  1. いま学んでいる教科書のページ（先生が台本のステップを押すと自動でめくれる）
 *  2. 先生の話した日本語の吹き出し＋母語訳
 *     （ネイティブの話し方そのものが教材になる・訳は答え合わせ＝かずき提案）
 *  3. 先生が「生徒に見せる」を押した絵・例文・練習問題（差し込みで大きく）
 *
 * この画面はログイン無しで開くため、教科書の中身は認証済みの先生側から届く。
 * ふりがなは生徒向けなので残す。
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

type Speech = { text: string; original: string; timestamp: number };
type Page = { lessonLabel: string; stepTitle: string; body: string; imageUrls: string[]; timestamp: number };
type Shown =
    | { kind: 'image'; img: string; timestamp: number }
    | { kind: 'text'; title?: string; body: string; timestamp: number };

/** AIや教材の記号（** や # など）を落として素直な文にする */
function readable(md: string): string {
    return md
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/^\s*[*-]\s+/gm, '・')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/`/g, '');
}

/** 教科書本文から画像参照の行を除いた表示用テキスト */
function pageText(md: string): string {
    return readable(
        md.split('\n').filter(l => !l.trim().startsWith('![')).join('\n')
    ).trim();
}

export default function StudentViewPage() {
    const params = useParams();
    const studentId = typeof params.studentId === 'string' ? params.studentId : '';

    const [speeches, setSpeeches] = useState<Speech[]>([]);
    const [page, setPage] = useState<Page | null>(null);
    const [shown, setShown] = useState<Shown | null>(null);
    const [connected, setConnected] = useState(false);
    const speechEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!studentId || typeof window === 'undefined') return;
        const channel = new BroadcastChannel(`asta-live-${studentId}`);
        channel.onmessage = (e) => {
            setConnected(true);
            if (e.data.type === 'translation') {
                setSpeeches(prev => [...prev.slice(-19), e.data as Speech]);
            }
            if (e.data.type === 'page') {
                setPage(e.data as Page);
                setShown(null);   // 新しいページに移ったら差し込みは閉じる
            }
            if (e.data.type === 'show') {
                setShown(e.data as Shown);
            }
        };
        return () => channel.close();
    }, [studentId]);

    useEffect(() => {
        speechEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [speeches]);

    const latest = speeches.slice(-3);

    return (
        <div className="h-screen bg-[#faf9fd] flex flex-col select-none overflow-hidden">

            {/* 上：課名だけの静かなヘッダー */}
            <div className="flex items-center justify-between px-6 py-2.5 bg-white border-b border-[#ece9f1] shrink-0">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-[#cdc3ce]'}`} />
                    <span className="text-[#6f5385] text-xs font-bold">ASTA</span>
                    {page && (
                        <span className="text-[#4b454e] text-sm font-bold ml-2">
                            {page.lessonLabel}　{page.stepTitle}
                        </span>
                    )}
                </div>
                {shown && (
                    <button
                        onClick={() => setShown(null)}
                        className="text-[11px] text-[#6f5385] hover:bg-[#f2daff] px-3 py-1 rounded-full transition-colors"
                    >
                        教科書にもどる
                    </button>
                )}
            </div>

            {/* 中央：主役（差し込み ＞ 教科書ページ ＞ 待機） */}
            <div className="flex-1 overflow-y-auto px-8 py-6">
                {shown?.kind === 'image' && (
                    <div className="h-full flex items-start justify-center">
                        {/* 生成画像は data URL のため next/image ではなく素の img */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={shown.img} alt="先生が見せている教材"
                            className="max-w-full max-h-full rounded-2xl shadow-[0_8px_40px_rgba(111,83,133,0.18)]" />
                    </div>
                )}

                {shown?.kind === 'text' && (
                    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-[0_8px_40px_rgba(111,83,133,0.12)] p-8">
                        {shown.title && <p className="text-[#6f5385] font-bold text-sm mb-4">{shown.title}</p>}
                        <p className="text-[#1a1c1e] text-2xl leading-loose whitespace-pre-wrap">{readable(shown.body)}</p>
                    </div>
                )}

                {!shown && page && (
                    <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-[0_8px_40px_rgba(111,83,133,0.10)] p-8">
                        <p className="text-[#1a1c1e] text-xl leading-loose whitespace-pre-wrap">
                            {pageText(page.body)}
                        </p>
                        {page.imageUrls.length > 0 && (
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                {page.imageUrls.map((u, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={i} src={u} alt="" className="w-full rounded-xl" />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {!shown && !page && (
                    <div className="h-full flex flex-col items-center justify-center text-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-[#c9a8e0]/40 border-t-[#6f5385] animate-spin" />
                        <p className="text-[#4b454e] text-lg">じゅぎょうの じゅんびを しています</p>
                        <p className="text-[#9a93a5] text-sm">Getting ready for the lesson…</p>
                    </div>
                )}
            </div>

            {/* 下：先生の話した日本語の吹き出し＋訳（常時・直近3件） */}
            {latest.length > 0 && (
                <div className="shrink-0 bg-white border-t border-[#ece9f1] px-6 py-3 max-h-[38vh] overflow-y-auto space-y-2">
                    {latest.map((s, i) => {
                        const isLast = i === latest.length - 1;
                        return (
                            <div key={s.timestamp + '-' + i}
                                className={`max-w-3xl mx-auto rounded-2xl px-4 py-2.5 ${isLast
                                    ? 'bg-[#f2daff]/70'
                                    : 'bg-[#faf9fd] opacity-60'
                                    }`}>
                                <p className={`text-[#1a1c1e] font-bold leading-relaxed ${isLast ? 'text-2xl' : 'text-base'}`}>
                                    💬 {s.original}
                                </p>
                                <p className={`text-[#6f5385] mt-0.5 ${isLast ? 'text-base' : 'text-xs'}`}>
                                    {s.text}
                                </p>
                            </div>
                        );
                    })}
                    <div ref={speechEndRef} />
                </div>
            )}
        </div>
    );
}
