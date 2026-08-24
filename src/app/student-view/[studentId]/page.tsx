'use client';

/**
 * 生徒に見せる画面（提示ウィンドウ）
 *
 * 授業は「先生が自分の画面を共有する方式」（2026-08-16 かずき決定）。
 * 先生の手元＝ASTA本体には台本やASTAの提案（種明かし）が並んでいるため、
 * それをそのまま共有すると生徒に見えてしまう。
 * そこでZoom等では「この窓だけ」を共有し、先生が押したものだけがここに出る。
 *
 * ここに出るもの：
 *  - 先生の話した内容の翻訳（自動）
 *  - 先生が「生徒に見せる」を押した絵・例文・練習問題（手動）
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

type Subtitle = { text: string; original: string; timestamp: number };

/**
 * AIが返す文には ** や * が混ざる。生徒にそのまま見せると読みにくいので、
 * 記号を落として素直な文章にする（2026-08-20 実機で `**` が露出して発覚）
 */
function readable(md: string): string {
    return md
        .replace(/\*\*(.+?)\*\*/g, '$1')     // **強調** → 強調
        .replace(/^\s*[*-]\s+/gm, '・')        // 箇条書きの記号を「・」に
        .replace(/^#{1,6}\s*/gm, '')           // 見出し記号を落とす
        .replace(/`/g, '');
}
type Shown =
    | { kind: 'image'; img: string; timestamp: number }
    | { kind: 'text'; title?: string; body: string; timestamp: number };

export default function StudentViewPage() {
    const params = useParams();
    const studentId = typeof params.studentId === 'string' ? params.studentId : '';

    const [subtitle, setSubtitle] = useState<Subtitle | null>(null);
    const [history, setHistory] = useState<Subtitle[]>([]);
    const [shown, setShown] = useState<Shown | null>(null);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        if (!studentId || typeof window === 'undefined') return;
        const channel = new BroadcastChannel(`asta-live-${studentId}`);
        channel.onmessage = (e) => {
            setConnected(true);
            if (e.data.type === 'translation') {
                const msg = e.data as Subtitle;
                setSubtitle(msg);
                setHistory(prev => [msg, ...prev].slice(0, 8));
            }
            if (e.data.type === 'show') {
                setShown(e.data as Shown);
            }
        };
        return () => channel.close();
    }, [studentId]);

    // 教材を見せている間は字幕を下の帯に小さく出し、教材を主役にする
    const hasMaterial = shown !== null;

    return (
        <div className="min-h-screen bg-[#faf9fd] flex flex-col select-none">

            {/* 上：状態（生徒に見せるので最小限・日本語） */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-[#ece9f1] shrink-0">
                <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-[#cdc3ce]'}`} />
                    <span className="text-[#6f5385] text-xs font-bold">ASTA</span>
                </div>
                {hasMaterial && (
                    <button
                        onClick={() => setShown(null)}
                        className="text-[11px] text-[#6f5385] hover:bg-[#f2daff] px-3 py-1 rounded-full transition-colors"
                    >
                        閉じる
                    </button>
                )}
            </div>

            {/* 中央：主役（教材があれば教材、なければ字幕を大きく） */}
            <div className={`flex-1 flex flex-col items-center justify-center px-8 ${hasMaterial ? 'py-6' : 'py-10'} overflow-y-auto`}>
                {hasMaterial && shown.kind === 'image' && (
                    // 生成画像は data URL のため next/image ではなく素の img で表示する
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={shown.img}
                        alt="先生が見せている教材"
                        className="max-w-full max-h-[calc(100vh-220px)] rounded-2xl shadow-[0_8px_40px_rgba(111,83,133,0.18)]"
                    />
                )}

                {hasMaterial && shown.kind === 'text' && (
                    <div className="max-w-3xl w-full bg-white rounded-3xl shadow-[0_8px_40px_rgba(111,83,133,0.12)] p-8">
                        {shown.title && (
                            <p className="text-[#6f5385] font-bold text-sm mb-4">{shown.title}</p>
                        )}
                        <p className="text-[#1a1c1e] text-2xl leading-loose whitespace-pre-wrap">{readable(shown.body)}</p>
                    </div>
                )}

                {!hasMaterial && subtitle && (
                    <div className="max-w-4xl w-full text-center space-y-6">
                        <p className="text-[#1a1c1e] text-4xl md:text-5xl font-bold leading-relaxed">
                            {subtitle.text}
                        </p>
                        {subtitle.original && (
                            <p className="text-[#9a93a5] text-lg md:text-xl">{subtitle.original}</p>
                        )}
                    </div>
                )}

                {!hasMaterial && !subtitle && (
                    <div className="text-center space-y-4">
                        <div className="w-10 h-10 rounded-full border-2 border-[#c9a8e0]/40 border-t-[#6f5385] animate-spin mx-auto" />
                        <p className="text-[#4b454e] text-lg">授業の準備をしています</p>
                        <p className="text-[#9a93a5] text-sm">先生が話し始めると、ここに翻訳が出ます</p>
                    </div>
                )}
            </div>

            {/* 下：教材を見せている間も、字幕は小さく出し続ける */}
            {hasMaterial && subtitle && (
                <div className="px-8 py-4 bg-white border-t border-[#ece9f1] shrink-0">
                    <p className="text-center text-[#1a1c1e] text-xl font-bold leading-relaxed">
                        {subtitle.text}
                    </p>
                    {subtitle.original && (
                        <p className="text-center text-[#9a93a5] text-sm mt-1">{subtitle.original}</p>
                    )}
                </div>
            )}

            {/* 字幕だけの時は直前の履歴を薄く出す */}
            {!hasMaterial && history.length > 1 && (
                <div className="px-8 pb-6 pt-4 border-t border-[#ece9f1] space-y-1 shrink-0">
                    {history.slice(1, 4).map((h, i) => (
                        <p key={i} className="text-center text-sm truncate text-[#9a93a5]"
                            style={{ opacity: 0.7 - i * 0.2 }}>
                            {h.text}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
