import Link from 'next/link';
import { CircleHelp, MessageCircleQuestion } from 'lucide-react';
import { MANUAL_CHAPTERS } from '@/content/manual/chapters';
import { ManualChapterBody } from '@/components/manual/manual-view';

/**
 * 「使い方」のページ（2026-10-09 かずき決定・9-4）。
 * 全部の画面の使い方を1か所にまとめる。各画面の右上の「この画面の使い方」は、このページの章を横の欄で開く。
 * 中身は content/manual/chapters.ts（右下の使い方ヘルプ（AI）も同じ文を読む）
 */
export const metadata = { title: '使い方 | ASTA' };

const CARD = 'bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)]';

export default function ManualPage() {
    return (
        <div className="max-w-3xl mx-auto space-y-6 pb-16">
            <header className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-[#3a3350] flex items-center gap-2">
                    <CircleHelp size={24} className="text-[#6b5ca5]" /> 使い方
                </h1>
                <p className="text-sm text-[#484550] leading-relaxed">
                    ASTAの画面ごとの使い方です。各画面の右上の「この画面の使い方」からも、その画面の説明を開けます。
                </p>
                <p className="text-sm text-[#484550] leading-relaxed flex items-start gap-1.5">
                    <MessageCircleQuestion size={16} className="text-[#6b5ca5] mt-0.5 shrink-0" />
                    ここに無いことや困った時は、右下の「使い方ヘルプ」に文章で聞けます。
                </p>
            </header>

            {/* 目次 */}
            <nav className={`${CARD} p-5`} aria-label="目次">
                <h2 className="text-sm font-bold text-[#3a3350] mb-3">目次</h2>
                <ol className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {MANUAL_CHAPTERS.map((c, i) => (
                        <li key={c.id}>
                            <Link href={`#${c.id}`} className="group flex gap-2 text-sm text-[#3a3350] hover:text-[#6b5ca5]">
                                <span className="text-[#6b5ca5] font-bold w-5 shrink-0 text-right">{i + 1}.</span>
                                <span className="group-hover:underline">{c.title}</span>
                            </Link>
                        </li>
                    ))}
                </ol>
            </nav>

            {MANUAL_CHAPTERS.map((c, i) => (
                <section key={c.id} id={c.id} className={`${CARD} p-6 scroll-mt-6`}>
                    <h2 className="text-lg font-bold text-[#3a3350] mb-3 pb-2 border-b border-[#f0ebf8]">
                        <span className="text-[#6b5ca5] mr-2">{i + 1}.</span>{c.title}
                    </h2>
                    <ManualChapterBody chapter={c} />
                    <p className="mt-5 text-right">
                        <Link href="#" className="text-xs text-[#6b5ca5] hover:underline">目次へ戻る</Link>
                    </p>
                </section>
            ))}
        </div>
    );
}
