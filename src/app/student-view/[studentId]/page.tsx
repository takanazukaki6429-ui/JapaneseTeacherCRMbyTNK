'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';

type TranslationMsg = {
    text: string;
    original: string;
    timestamp: number;
};

export default function StudentViewPage() {
    const params = useParams();
    const studentId = typeof params.studentId === 'string' ? params.studentId : '';

    const [current, setCurrent] = useState<TranslationMsg | null>(null);
    const [history, setHistory] = useState<TranslationMsg[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    // A案: BroadcastChannel（同デバイス・同ブラウザ）
    useEffect(() => {
        if (!studentId || typeof window === 'undefined') return;

        const channel = new BroadcastChannel(`asta-live-${studentId}`);
        channel.onmessage = (e) => {
            if (e.data.type === 'translation') {
                const msg = e.data as TranslationMsg;
                setCurrent(msg);
                setHistory(prev => [msg, ...prev].slice(0, 8));
                setIsConnected(true);
            }
        };

        // TODO B案: Supabase Realtime Broadcast を追加
        // const supabase = createClient();
        // supabase.channel(`live-${studentId}`)
        //   .on('broadcast', { event: 'translation' }, ({ payload }) => { ... })
        //   .subscribe();

        return () => channel.close();
    }, [studentId]);

    const timeSince = (ts: number) => {
        const sec = Math.floor((Date.now() - ts) / 1000);
        if (sec < 60) return `${sec}s ago`;
        return `${Math.floor(sec / 60)}m ago`;
    };

    return (
        <div className="min-h-screen bg-[#0f0e13] flex flex-col select-none">
            {/* ヘッダー */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`} />
                    <span className="text-white/40 text-xs font-bold tracking-widest uppercase">
                        ASTA Live Translation
                    </span>
                </div>
                {current && (
                    <span className="text-white/20 text-xs">
                        {timeSince(current.timestamp)}
                    </span>
                )}
            </div>

            {/* メイン翻訳エリア */}
            <div className="flex-1 flex flex-col items-center justify-center px-8 py-10">
                {current ? (
                    <div className="max-w-3xl w-full text-center space-y-6">
                        {/* 翻訳テキスト（大） */}
                        <p className="text-white text-4xl md:text-5xl font-bold leading-relaxed tracking-tight">
                            {current.text}
                        </p>

                        {/* 日本語原文（小） */}
                        {current.original && (
                            <p className="text-white/30 text-lg md:text-xl font-medium">
                                {current.original}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="text-center space-y-4">
                        <div className="w-10 h-10 rounded-full border-2 border-[#6f5385]/30 border-t-[#6f5385] animate-spin mx-auto" />
                        <p className="text-white/25 text-lg">Waiting for teacher...</p>
                        <p className="text-white/15 text-sm">先生が話し始めると翻訳が表示されます</p>
                    </div>
                )}
            </div>

            {/* 履歴（下部） */}
            {history.length > 1 && (
                <div className="px-8 pb-6 space-y-1.5 border-t border-white/5 pt-4">
                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-2">
                        History
                    </p>
                    {history.slice(1, 4).map((h, i) => (
                        <p
                            key={i}
                            className="text-white/20 text-sm text-center truncate"
                            style={{ opacity: 0.2 - i * 0.05 }}
                        >
                            {h.text}
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
