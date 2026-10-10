import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lightbulb } from 'lucide-react';
import { SectionNav } from '../../textbook/[id]/section-nav';
import { TRAVEL_PARTS, findTravelScene } from '@/lib/travel';

/**
 * 旅行の場面（2026-10-09 かずき決定・9-2／10-10 充実）。目標と5つの部分（フレーズ・使う場面・会話・文化のひとこと・穴埋め）。
 * よみは教科書と同じ「漢字（かんじ）」の形、英語の訳は小さく下に。穴埋めの答えは押すと開く
 */

type Props = { params: Promise<{ id: string }> };

const CARD = 'bg-white px-5 py-4 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] scroll-mt-4';
const HEADING = 'text-sm font-bold text-[#6b5ca5] mb-3 pb-2 border-b border-[#f0ebf8]';

export default async function TravelScenePage({ params }: Props) {
    const { id } = await params;
    const found = findTravelScene(id);
    if (!found) notFound();
    const { level, scene } = found;

    return (
        <div className="space-y-5">
            <Link
                href={`/materials/travel?level=${level.level}`}
                className="inline-flex items-center gap-1.5 text-sm text-[#6b5ca5] hover:underline"
            >
                <ArrowLeft size={15} />
                旅行の一覧に戻る
            </Link>

            <div className={CARD}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#efe9ff] text-[#6b5ca5] rounded-full">旅行 {level.label}</span>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#f0ebf8] text-[#484550] rounded-full">{scene.titleEn}</span>
                </div>
                <h1 className="text-lg font-bold text-[#3a3350] leading-snug">{scene.title}：{scene.subtitle}</h1>
                <p className="mt-2 text-[14px] text-[#3a3350] leading-relaxed">目標：{scene.goal.ja}</p>
                <p className="text-[12px] text-[#6f6884] leading-relaxed">{scene.goal.en}</p>
            </div>

            <SectionNav sections={TRAVEL_PARTS.map(p => ({ id: `part-${p.key}`, label: p.label }))} />

            <section id="part-phrases" className={CARD}>
                <h2 className={HEADING}>フレーズ</h2>
                <ol className="space-y-3">
                    {scene.phrases.map((p, i) => (
                        <li key={i} className="flex gap-3">
                            <span className="text-[13px] font-bold text-[#6b5ca5] w-5 shrink-0 pt-0.5">{i + 1}</span>
                            <div>
                                <p className="text-[16px] text-[#3a3350] leading-relaxed">{p.ja}</p>
                                <p className="text-[13px] text-[#6f6884]">{p.en}</p>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>

            <section id="part-usage" className={CARD}>
                <h2 className={HEADING}>使う場面</h2>
                <ul className="space-y-3">
                    {scene.usage.map((u, i) => (
                        <li key={i}>
                            <p className="text-[15px] text-[#3a3350] leading-relaxed">・{u.ja}</p>
                            <p className="text-[13px] text-[#6f6884] pl-3">{u.en}</p>
                        </li>
                    ))}
                </ul>
            </section>

            <section id="part-dialogues" className={CARD}>
                <h2 className={HEADING}>会話</h2>
                <div className="space-y-6">
                    {scene.dialogues.map((d, di) => (
                        <div key={di}>
                            <p className="text-[14px] font-bold text-[#3a3350]">会話{di + 1}：{d.title.ja}</p>
                            <p className="text-[12px] text-[#6f6884] mb-3">{d.title.en}</p>
                            <div className="space-y-3">
                                {d.lines.map((l, i) => (
                                    <div key={i} className="flex gap-3">
                                        <span className="text-[12px] font-bold text-[#55488a] bg-[#f0ebf8] rounded-lg px-2 py-1 h-fit shrink-0 min-w-[5.5rem] text-center">{l.speaker}</span>
                                        <div>
                                            <p className="text-[16px] text-[#3a3350] leading-relaxed">{l.ja}</p>
                                            <p className="text-[13px] text-[#6f6884]">{l.en}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section id="part-culture" className={CARD}>
                <h2 className={`${HEADING} flex items-center gap-1.5`}><Lightbulb size={14} /> 文化のひとこと</h2>
                <p className="text-[15px] text-[#3a3350] leading-relaxed">{scene.culture.ja}</p>
                <p className="mt-1 text-[13px] text-[#6f6884] leading-relaxed">{scene.culture.en}</p>
            </section>

            <section id="part-blanks" className={CARD}>
                <h2 className={HEADING}>穴埋め</h2>
                <ol className="space-y-3">
                    {scene.blanks.map((b, i) => (
                        <li key={i} className="flex gap-3">
                            <span className="text-[13px] font-bold text-[#6b5ca5] w-5 shrink-0 pt-0.5">{i + 1}</span>
                            <div className="min-w-0">
                                <p className="text-[16px] text-[#3a3350] leading-relaxed">{b.q}</p>
                                <p className="text-[13px] text-[#6f6884]">{b.en}</p>
                                <details className="mt-1">
                                    <summary className="text-[12px] text-[#6b5ca5] cursor-pointer select-none">答えを見る</summary>
                                    <p className="mt-1 text-[15px] font-bold text-[#2a6f5a]">{b.answer}</p>
                                </details>
                            </div>
                        </li>
                    ))}
                </ol>
            </section>
        </div>
    );
}
