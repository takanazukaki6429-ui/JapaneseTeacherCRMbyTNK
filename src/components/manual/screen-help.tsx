'use client';

/**
 * 各画面の右上の「この画面の使い方」（2026-10-09 かずき決定・9-4）。
 * 押すと、その画面の章を横の欄で開く（画面を離れない＝授業中も使える）。
 * 欄の下から「使い方」のページ（/manual）の全部を開ける。
 * 写真は使わず、文字とボタンの印だけ（components/manual/manual-view.tsx）
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, CircleHelp, X } from 'lucide-react';
import { MANUAL_CHAPTERS } from '@/content/manual/chapters';
import { chapterIdForPath, findChapter, showsScreenHelp } from '@/lib/manual';
import { ManualChapterBody } from './manual-view';

type Props = {
    /** 開く章を決めておく（授業中の画面）。省略すると、今の画面の住所から決める */
    chapterId?: string;
    /** 「使い方のページで全部を見る」を別のタブで開く（授業中は画面を離れると授業が止まるため） */
    newTab?: boolean;
    /** 狭い所（授業中の上の帯）では「？」の印だけにする */
    compact?: boolean;
};

export function ScreenHelpButton({ chapterId, newTab = false, compact = false }: Props) {
    const pathname = usePathname();
    // 開いた時の画面を覚えておき、画面が変わったら閉じた扱いにする
    const [openedAt, setOpenedAt] = useState<string | null>(null);
    const open = openedAt !== null && openedAt === pathname;
    const close = () => setOpenedAt(null);

    const chapter = findChapter(MANUAL_CHAPTERS, chapterId ?? chapterIdForPath(pathname));
    const fullHref = chapter ? `/manual#${chapter.id}` : '/manual';

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpenedAt(null); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    return (
        <>
            {compact ? (
                <button
                    type="button"
                    onClick={() => setOpenedAt(pathname)}
                    title="この画面の使い方"
                    aria-label="この画面の使い方"
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e4ddf0] bg-white text-[#6b5ca5] hover:bg-[#f8f1ff] transition-colors shrink-0"
                >
                    <CircleHelp size={18} strokeWidth={1.8} />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => setOpenedAt(pathname)}
                    title="この画面の使い方"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#e4ddf0] bg-white text-[#6b5ca5] text-[13px] font-semibold shadow-sm hover:bg-[#f8f1ff] transition-colors whitespace-nowrap"
                >
                    <CircleHelp size={15} strokeWidth={1.8} />
                    この画面の使い方
                </button>
            )}

            {open && (
                <div className="fixed inset-0 z-[80] flex justify-end" role="dialog" aria-modal="true" aria-label="この画面の使い方">
                    <button type="button" aria-label="閉じる" onClick={close} className="absolute inset-0 bg-[#3a3350]/20 cursor-default" />
                    <aside className="relative h-full w-full sm:w-[460px] bg-white shadow-[0_0_40px_rgba(58,51,80,0.18)] flex flex-col">
                        <header className="px-5 py-4 border-b border-[#efe9f8] flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[12px] text-[#6f6884]">この画面の使い方</p>
                                <h2 className="text-[18px] font-bold text-[#3a3350] leading-snug">{chapter?.title ?? '使い方'}</h2>
                            </div>
                            <button type="button" onClick={close} aria-label="閉じる" className="p-1.5 rounded-lg text-[#484550] hover:bg-[#f2eaff] transition-colors">
                                <X size={18} />
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                            {chapter ? (
                                <ManualChapterBody chapter={chapter} />
                            ) : (
                                <p className="text-[14px] text-[#3a3350]">この画面だけの説明はありません。「使い方」のページで、画面ごとの説明を見られます。</p>
                            )}
                        </div>
                        <footer className="px-5 py-3 border-t border-[#efe9f8] flex items-center justify-between gap-3 text-[13px]">
                            <Link
                                href={fullHref}
                                target={newTab ? '_blank' : undefined}
                                rel={newTab ? 'noopener noreferrer' : undefined}
                                onClick={close}
                                className="inline-flex items-center gap-1.5 font-semibold text-[#6b5ca5] hover:underline"
                            >
                                <BookOpen size={15} /> 使い方のページで全部を見る{newTab ? '（別のタブ）' : ''}
                            </Link>
                            <span className="text-[#6f6884]">分からない時は右下の使い方ヘルプへ</span>
                        </footer>
                    </aside>
                </div>
            )}
        </>
    );
}

/**
 * 画面の右上に「この画面の使い方」を置く（共通の枠 app/(main)/layout.tsx から）。
 * 授業中の画面は画面全体を使うので、その画面の上の帯に自分で置く（ここでは出さない）
 */
export function ScreenHelpBar() {
    const pathname = usePathname();
    if (!showsScreenHelp(pathname) || chapterIdForPath(pathname) === 'live') return null;
    return (
        <div className="fixed top-4 right-4 z-30 md:static md:flex md:justify-end md:mb-2">
            <ScreenHelpButton />
        </div>
    );
}
