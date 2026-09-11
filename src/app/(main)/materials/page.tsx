
import { createClient } from '@/lib/supabase/server';
import { Material } from '@/types/material';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Search, FileText, Zap, Globe } from 'lucide-react';
import { MaterialsTabBar } from './tab-bar';

export const revalidate = 0;

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

type Props = { searchParams: Promise<{ tab?: string }> };

export default async function MaterialsPage({ searchParams }: Props) {
    const { tab = 'mine' } = await searchParams;
    const isCommunity = tab === 'community';
    const materials = isCommunity ? await getPublicMaterials() : await getMyMaterials();

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[#3b2e2a]">教材</h1>
                <Link
                    href="/materials/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9c4f5a] text-white text-sm font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(156,79,90,0.25)]"
                >
                    <Plus size={16} />
                    新規作成
                </Link>
            </div>

            <MaterialsTabBar currentTab={tab} />

            {/* Search */}
            <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)]">
                <Search size={18} className="text-[#534344] flex-shrink-0" />
                <input
                    type="text"
                    placeholder="タイトルやタグで検索..."
                    className="flex-1 bg-transparent outline-none text-sm text-[#3b2e2a] placeholder:text-[#534344]"
                />
            </div>

            {materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-[#dccfc4]/40 text-center">
                    <div className="text-4xl mb-4">📚</div>
                    <h3 className="text-base font-bold text-[#3b2e2a] mb-1">
                        {isCommunity ? 'まだ公開教材がありません' : '教材がありません'}
                    </h3>
                    <p className="text-sm text-[#534344] mb-4 max-w-xs">
                        {isCommunity
                            ? '教材作成時に「全ユーザーに公開」をオンにすると、ここに表示されます。'
                            : 'プロンプトや教材を保存して資産として蓄積しましょう。'}
                    </p>
                    {!isCommunity && (
                        <Link href="/materials/new" className="inline-flex items-center gap-2 px-4 py-2 bg-[#f8e8e7] text-[#9c4f5a] text-sm font-bold rounded-xl hover:bg-[#f3dcdb] transition-colors">
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
                            className="group flex flex-col p-5 bg-white rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] hover:shadow-[0_8px_40px_rgba(156,79,90,0.12)] hover:-translate-y-0.5 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    item.type === 'prompt' ? 'bg-[#f8e8e7] text-[#9c4f5a]' : 'bg-[#ece8f3] text-[#6b5b8c]'
                                }`}>
                                    {item.type === 'prompt' ? <Zap size={18} /> : <FileText size={18} />}
                                </div>
                                <div className="flex items-center gap-1.5">
                                    {item.is_public && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-[#f8e8e7] text-[#9c4f5a] rounded-full">
                                            <Globe size={10} />公開中
                                        </span>
                                    )}
                                    <span className="text-[11px] text-[#534344]">{formatDate(item.created_at)}</span>
                                </div>
                            </div>

                            <h3 className="font-bold text-[#3b2e2a] group-hover:text-[#9c4f5a] transition-colors mb-2 line-clamp-2 text-sm">
                                {item.title}
                            </h3>

                            <p className="text-xs text-[#534344] line-clamp-3 mb-4 flex-1 leading-relaxed">
                                {item.content || '内容なし'}
                            </p>

                            <div className="flex flex-wrap gap-1.5 mt-auto">
                                {item.tags?.map((tag, i) => (
                                    <span key={i} className="px-2 py-0.5 text-[10px] font-medium bg-[#f1ebe1] text-[#534344] rounded-full">
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
