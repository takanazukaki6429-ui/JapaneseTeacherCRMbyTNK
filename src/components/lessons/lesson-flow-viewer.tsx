'use client';

/**
 * 授業の流れを見返す（案3フル版・かずき決定 2026-09-20）
 *
 * ライブ授業で作った物（絵・例文・練習問題・やさしく言い換え・質問と答え・発話・教科書）を
 * 授業のあとから並べて見られるようにする。絵は置き場から期限つきの住所を作って表示する。
 */
import { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { loadLessonFlow, signImagePaths, type LessonFlowRow, type SavedFlowItem } from '@/lib/lesson-flow';

/** 種類ごとの見出しと色。ライブ授業の画面と同じ言葉づかいに合わせる */
const KIND_LABEL: Record<string, { label: string; tone: string }> = {
    said: { label: '先生', tone: 'bg-[#f4f1fb] text-[#3a3350]' },
    'student-said': { label: '生徒', tone: 'bg-[#e8f6ef] text-[#1f5c45]' },
    suggest: { label: 'ASTAの提案', tone: 'bg-[#fdf6e7] text-[#8a6d1f]' },
    'translate-help': { label: 'ことばの補助', tone: 'bg-[#fdf6e7] text-[#8a6d1f]' },
    illust: { label: '絵', tone: 'bg-[#fbeef5] text-[#8a3f68]' },
    material: { label: '作った教材', tone: 'bg-[#efe9ff] text-[#5a4c94]' },
    asked: { label: '先生の質問', tone: 'bg-[#f4f1fb] text-[#3a3350]' },
    answer: { label: '質問への答え', tone: 'bg-[#efe9ff] text-[#5a4c94]' },
    textbook: { label: '教科書', tone: 'bg-[#eef3fb] text-[#2f4a72]' },
};

function timeOf(ts: string): string {
    const d = new Date(ts);
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
}

export function LessonFlowViewer({ studentId, lessonId }: { studentId: string; lessonId: string | null }) {
    const [row, setRow] = useState<LessonFlowRow | null>(null);
    const [signed, setSigned] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        let alive = true;

        (async () => {
            setLoading(true);
            const found = await loadLessonFlow({ studentId, lessonId });
            if (!alive) return;
            setRow(found);

            if (found) {
                const paths = found.items.map(i => i.imgPath).filter((p): p is string => !!p);
                if (paths.length > 0) {
                    const map = await signImagePaths(paths);
                    if (alive) setSigned(map);
                }
            }
            if (alive) setLoading(false);
        })();

        return () => { alive = false; };
    }, [studentId, lessonId]);

    if (loading) {
        return (
            <div className="mt-6 flex items-center gap-2 text-sm text-[#484550]">
                <Loader2 size={14} className="animate-spin" /> 授業の流れを読み込んでいます…
            </div>
        );
    }

    // 保存された流れが無い授業では何も出さない
    if (!row || row.items.length === 0) return null;

    return (
        <div className="mt-6 border border-[#e3ddf2] rounded-xl overflow-hidden bg-white">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-[#f9f7fe] transition-colors"
            >
                <span className="text-[15px] font-bold text-[#3a3350]">
                    この授業でASTAが作った物（{row.items.length}件{row.image_count > 0 ? `・絵${row.image_count}枚` : ''}）
                </span>
                {open ? <ChevronDown size={18} className="text-[#6b5ca5]" /> : <ChevronRight size={18} className="text-[#6b5ca5]" />}
            </button>

            {open && (
                <div className="px-4 pb-4 space-y-3 border-t border-[#efeaf8] pt-3">
                    {row.items.map((item: SavedFlowItem, i: number) => {
                        const meta = KIND_LABEL[item.kind] ?? { label: item.kind, tone: 'bg-[#f2f2f4] text-[#484550]' };
                        const url = item.imgPath ? signed[item.imgPath] : undefined;

                        return (
                            <div key={i} className="rounded-lg border border-[#efeaf8] p-3">
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${meta.tone}`}>
                                        {meta.label}
                                    </span>
                                    {item.title && <span className="text-[13px] font-bold text-[#3a3350]">{item.title}</span>}
                                    <span className="ml-auto text-[12px] text-[#807a8d]">{timeOf(item.ts)}</span>
                                </div>

                                {item.text && (
                                    <p className="text-[14px] leading-relaxed text-[#3a3350] whitespace-pre-wrap">{item.text}</p>
                                )}
                                {item.translation && (
                                    <p className="mt-1 text-[13px] text-[#484550] whitespace-pre-wrap">{item.translation}</p>
                                )}

                                {item.imgPath && (
                                    url
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={url} alt="授業中に作った絵" className="mt-2 w-full max-w-md rounded-lg" />
                                        : <p className="mt-2 text-[13px] text-[#807a8d]">絵を読み込めませんでした</p>
                                )}

                                {item.imgs && item.imgs.length > 0 && (
                                    <div className="mt-2 space-y-2">
                                        {item.imgs.map((src, k) => (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img key={k} src={src} alt="教科書のページ" className="w-full max-w-md rounded-lg" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
