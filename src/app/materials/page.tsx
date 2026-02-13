
import { createClient } from '@/lib/supabase/server';
import { Material } from '@/types/material';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Search, FileText, Zap, Book } from 'lucide-react';

export const revalidate = 0;

async function getMaterials() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching materials:', error);
        return [];
    }
    return data as Material[];
}

export default async function MaterialsPage() {
    const materials = await getMaterials();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">教材・資産管理</h1>
                <Link
                    href="/materials/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    新規作成
                </Link>
            </div>

            {/* Filter / Search Placeholder */}
            <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="タイトルやタグで検索..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                </div>
                <div className="hidden sm:flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium bg-teal-50 text-teal-700 rounded-lg border border-teal-200">すべて</button>
                    <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200">プロンプト</button>
                    <button className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200">生成コンテンツ</button>
                </div>
            </div>

            {materials.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Book className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">資産がありません</h3>
                    <p className="text-sm text-slate-500 mb-4 max-w-xs">
                        プロンプトや作成した教材を保存して、資産として蓄積しましょう。
                    </p>
                    <Link
                        href="/materials/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        新規作成する
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {materials.map((item) => (
                        <Link
                            key={item.id}
                            href={`/materials/${item.id}`}
                            className="group flex flex-col p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-teal-200 transition-all h-full"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${item.type === 'prompt' ? 'bg-purple-100 text-purple-600' :
                                    item.type === 'content' ? 'bg-blue-100 text-blue-600' :
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                    {item.type === 'prompt' ? <Zap size={20} /> : <FileText size={20} />}
                                </div>
                                <span className="text-xs text-slate-400">{formatDate(item.created_at)}</span>
                            </div>

                            <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors mb-2 line-clamp-2">
                                {item.title}
                            </h3>

                            <p className="text-sm text-slate-500 line-clamp-3 mb-4 flex-1">
                                {item.content || 'No content...'}
                            </p>

                            <div className="flex flex-wrap gap-2 mt-auto">
                                {item.tags?.map((tag, i) => (
                                    <span key={i} className="px-2 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded">
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
