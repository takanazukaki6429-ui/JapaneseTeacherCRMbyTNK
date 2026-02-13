import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Material } from '@/types/material';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Zap, FileText, Trash2, Edit } from 'lucide-react';
import { RedirectType, redirect } from 'next/navigation';

export const revalidate = 0;

async function getMaterial(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return data as Material;
}

// Client Component for Deletion
import { DeleteMaterialButton } from './delete-button';

type Props = {
    params: Promise<{ id: string }>;
};

export default async function MaterialDetailPage({ params }: Props) {
    const { id } = await params;
    const material = await getMaterial(id);

    if (!material) {
        notFound();
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/materials"
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${material.type === 'prompt' ? 'bg-purple-100 text-purple-600' :
                            material.type === 'content' ? 'bg-blue-100 text-blue-600' :
                                'bg-slate-100 text-slate-600'
                            }`}>
                            {material.type === 'prompt' ? <Zap size={18} /> : <FileText size={18} />}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">{material.title}</h1>
                            <p className="text-xs text-slate-500">{formatDate(material.created_at)}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <DeleteMaterialButton id={material.id} />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex gap-2">
                        {material.tags?.map((tag, i) => (
                            <span key={i} className="px-2 py-1 text-xs font-medium bg-white border border-slate-200 text-slate-600 rounded">
                                #{tag}
                            </span>
                        ))}
                    </div>
                    <span className="text-xs font-mono text-slate-400 uppercase">{material.type}</span>
                </div>
                <div className="p-6">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-200">
                        {material.content}
                    </pre>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button className="text-sm text-teal-600 font-medium hover:underline flex items-center gap-1">
                        <Edit size={16} />
                        編集する (未実装)
                    </button>
                </div>
            </div>
        </div>
    );
}
