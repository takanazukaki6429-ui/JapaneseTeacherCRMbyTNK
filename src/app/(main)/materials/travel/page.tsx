import Link from 'next/link';
import { Plane } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getFeatureDecision } from '@/lib/plan-access-server';
import { MaterialsTabBar } from '../tab-bar';
import { TRAVEL_LEVELS, travelLevel } from '@/lib/travel';

/**
 * 旅行のテキストの一覧（2026-10-09 かずき決定・9-2）。レベル → 場面のカード。
 * 全員に見せる（ライト・一般の先生も）。中身は content/travel/（保管庫は使わない）
 */

/** みんなのテキストのタブに鍵を付けるか（ライト・2026-10-04 かずき決定）。教科書の画面と同じ */
async function isCommunityLocked(): Promise<boolean> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    return !(await getFeatureDecision(supabase, user.id, 'shared_materials')).allowed;
}

type Props = { searchParams: Promise<{ level?: string }> };

export default async function TravelPage({ searchParams }: Props) {
    const { level: raw } = await searchParams;
    const current = travelLevel(raw);
    const communityLocked = await isCommunityLocked();

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[#3a3350]">テキスト</h1>
            </div>

            <MaterialsTabBar currentTab="travel" communityLocked={communityLocked} />

            <div className="bg-white px-5 py-4 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)]">
                <div className="flex items-center gap-2 mb-1">
                    <Plane size={18} className="text-[#6b5ca5]" />
                    <h2 className="text-sm font-bold text-[#3a3350]">旅行</h2>
                </div>
                <p className="text-xs text-[#484550] leading-relaxed">
                    日本を旅行する生徒のための、場面ごとのフレーズ・会話・練習です。英語の訳つき。授業中の画面の「旅行」からも開けます。
                </p>
            </div>

            {/* レベルの切り替え（中身があるレベルだけ押せる） */}
            <div className="flex flex-wrap gap-2">
                {TRAVEL_LEVELS.map(l => {
                    const active = l.level === current.level;
                    const empty = l.scenes.length === 0;
                    return empty ? (
                        <span key={l.level} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm text-[#a39db0] bg-white/60 cursor-not-allowed">
                            {l.label}<span className="text-[11px]">（準備中）</span>
                        </span>
                    ) : (
                        <Link
                            key={l.level}
                            href={`/materials/travel?level=${l.level}`}
                            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm transition-all ${
                                active ? 'bg-[#6b5ca5] text-white font-bold' : 'bg-white text-[#484550] hover:bg-[#f0ebf8]'
                            }`}
                        >
                            {l.label}<span className={`text-[11px] ${active ? 'text-white/80' : 'text-[#6f6884]'}`}>{l.note}</span>
                        </Link>
                    );
                })}
            </div>

            {current.scenes.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-[#d6cfe2]/40 text-center">
                    <div className="text-4xl mb-4">🧳</div>
                    <h3 className="text-base font-bold text-[#3a3350] mb-1">{current.label} は準備中です</h3>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {current.scenes.map((scene, i) => (
                        <Link
                            key={scene.id}
                            href={`/materials/travel/${scene.id}`}
                            className="group flex flex-col p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] hover:shadow-[0_8px_40px_rgba(107,92,165,0.12)] hover:-translate-y-0.5 transition-all"
                        >
                            <span className="w-fit mb-2 px-2.5 py-0.5 text-[11px] font-bold bg-[#efe9ff] text-[#6b5ca5] rounded-full">
                                場面{i + 1}
                            </span>
                            <h3 className="text-sm font-bold text-[#3a3350] group-hover:text-[#6b5ca5] transition-colors leading-snug">
                                {scene.title}：{scene.subtitle}
                            </h3>
                            <p className="mt-1 text-[12px] text-[#6f6884]">{scene.titleEn}</p>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
