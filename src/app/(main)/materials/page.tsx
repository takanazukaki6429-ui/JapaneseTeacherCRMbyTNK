
import { createClient } from '@/lib/supabase/server';
import { Material } from '@/types/material';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Search, FileText, Zap, Globe } from 'lucide-react';
import { MaterialsTabBar } from './tab-bar';
import { getFeatureDecision } from '@/lib/plan-access-server';
import { PaidLock } from '@/components/paid-lock';
import type { FeatureDecision } from '@/lib/plan-features';
import { filterMaterials, normalizeQuery } from '@/lib/material-search';

export const revalidate = 0;

/** みんなの教材を見られるか（ライトでは自分の教材だけ・2026-10-04 かずき決定・lib/plan-features.ts） */
async function getCommunityDecision(): Promise<FeatureDecision> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { allowed: false, reason: 'needs_plan' };
    return getFeatureDecision(supabase, user.id, 'shared_materials');
}

async function getMyMaterials() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
    if (error) return [];
    return data as Material[];
}

async function getPublicMaterials() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
    if (error) return [];
    return data as Material[];
}

type Props = { searchParams: Promise<{ tab?: string; q?: string }> };

export default async function MaterialsPage({ searchParams }: Props) {
    const { tab = 'mine', q: rawQuery } = await searchParams;
    const query = normalizeQuery(rawQuery);
    const isCommunity = tab === 'community';
    const community = await getCommunityDecision();
    const communityLocked = !community.allowed;
    const all = isCommunity ? (communityLocked ? [] : await getPublicMaterials()) : await getMyMaterials();
    // 検索（2026-10-09）：タイトル・タグ・内容で絞り込む。前は検索欄に入れても何も起きなかった
    const materials = filterMaterials(all, query);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[#3a3350]">教材</h1>
                <Link
                    href="/materials/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#6b5ca5] text-white text-sm font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(107,92,165,0.25)]"
                >
                    <Plus size={16} />
                    新規作成
                </Link>
            </div>

            <MaterialsTabBar currentTab={tab} communityLocked={communityLocked} />

            {/* 検索：入れて Enter で絞り込む（今のタブのまま） */}
            {!(isCommunity && communityLocked) && (
                <form method="get" action="/materials" className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)]">
                    <Search size={18} className="text-[#484550] flex-shrink-0" />
                    <input type="hidden" name="tab" value={isCommunity ? 'community' : 'mine'} />
                    <input
                        type="search"
                        name="q"
                        defaultValue={query}
                        placeholder="タイトル・タグ・内容で検索（入れて Enter）"
                        aria-label="教材を検索"
                        className="flex-1 bg-transparent outline-none text-sm text-[#3a3350] placeholder:text-[#484550]"
                    />
                    {query && (
                        <Link href={`/materials?tab=${isCommunity ? 'community' : 'mine'}`} className="text-xs text-[#6b5ca5] hover:underline whitespace-nowrap">
                            検索をやめる
                        </Link>
                    )}
                </form>
            )}
            {query && !(isCommunity && communityLocked) && (
                <p className="text-xs text-[#484550]">「{query}」に合う教材：{materials.length}件（全部で{all.length}件）</p>
            )}

            {isCommunity && !community.allowed ? (
                <PaidLock feature="みんなの教材" needsRegular={community.reason === 'needs_regular'} />
            ) : materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-[#d6cfe2]/40 text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="text-base font-bold text-[#3a3350] mb-1">
                        {query ? '合う教材がありません' : isCommunity ? 'まだ公開教材がありません' : '教材がありません'}
                    </h3>
                    <p className="text-sm text-[#484550] mb-4 max-w-xs">
                        {query
                            ? '言葉を変えるか、「検索をやめる」で全部を表示してください。'
                            : isCommunity
                                ? '教材作成時に「全ユーザーに公開」をオンにすると、ここに表示されます。'
                                : 'プロンプトや教材を保存しておくと、授業で何度も使えます。'}
                    </p>
                    {!isCommunity && !query && (
                        <Link href="/materials/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#efe9ff] text-[#6b5ca5] text-sm font-bold rounded-xl hover:bg-[#e7deff] transition-colors">
                            新規作成する
                        </Link>
                    )}
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {materials.map((item) => (
                        <Link
                            key={item.id}
                            href={`/materials/${item.id}`}
                            className="group flex flex-col p-5 bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] hover:shadow-[0_8px_40px_rgba(107,92,165,0.12)] hover:-translate-y-0.5 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    item.type === 'prompt' ? 'bg-[#efe9ff] text-[#6b5ca5]' : 'bg-[#dff1ea] text-[#2a6f5a]'
                                }`}>
                                    {item.type === 'prompt' ? <Zap size={18} /> : <FileText size={18} />}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {item.is_public && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#efe9ff] text-[#6b5ca5] rounded-full">
                                            <Globe size={10} />公開中
                                        </span>
                                    )}
                                    <span className="text-[11px] text-[#484550]">{formatDate(item.created_at)}</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-[#3a3350] group-hover:text-[#6b5ca5] transition-colors mb-2 line-clamp-2 text-sm">
                                {item.title}
                            </h3>

                            <p className="text-xs text-[#484550] line-clamp-3 mb-4 flex-1 leading-relaxed">
                                {item.content || '内容なし'}
                            </p>

                            <div className="flex flex-wrap gap-1.5 mt-auto">
                                {item.tags?.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-[#f0ebf8] text-[#484550] rounded-full">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
