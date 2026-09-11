import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Material } from '@/types/material';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Zap, FileText } from 'lucide-react';
import { PublicToggleButton } from './public-toggle';
import { DeleteMaterialButton } from './delete-button';

export const revalidate = 0;

async function getMaterial(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('materials').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as Material;
}

type Props = { params: Promise<{ id: string }> };

export default async function MaterialDetailPage({ params }: Props) {
    const { id } = await params;
    const material = await getMaterial(id);
    if (!material) notFound();

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/materials"
                        className="inline-flex items-center gap-1.5 text-sm text-[#534344] hover:text-[#3b2e2a] transition-colors"
                    >
                        <ArrowLeft size={16} />
                        教材一覧
                    </Link>
                </div>
                <div className="flex items-center gap-2">
                    <PublicToggleButton id={material.id} isPublic={material.is_public} />
                    <DeleteMaterialButton id={material.id} />
                </div>
            </div>

            {/* Title card */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_0_40px_rgba(156,79,90,0.06)] flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    material.type === 'prompt' ? 'bg-[#f8e8e7] text-[#9c4f5a]' : 'bg-[#ece8f3] text-[#6b5b8c]'
                }`}>
                    {material.type === 'prompt' ? <Zap size={22} /> : <FileText size={22} />}
                </div>
                <div>
                    <h1 className="text-lg font-bold text-[#3b2e2a]">{material.title}</h1>
                    <p className="text-xs text-[#534344] mt-0.5">{formatDate(material.created_at)}</p>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] overflow-hidden">
                {/* Tags row */}
                {(material.tags?.length || 0) > 0 && (
                    <div className="px-5 py-3 bg-[#f1ebe1] flex items-center gap-2 flex-wrap">
                        {material.tags?.map((tag, i) => (
                            <span key={i} className="px-2.5 py-0.5 text-xs font-medium bg-white text-[#534344] rounded-full border border-[#dccfc4]/30">
                                #{tag}
                            </span>
                        ))}
                        <span className="ml-auto text-[10px] font-mono text-[#534344] uppercase">{material.type}</span>
                    </div>
                )}
                <div className="p-6">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-[#3b2e2a] leading-relaxed bg-[#f1ebe1] p-4 rounded-xl">
                        {material.content}
                    </pre>
                </div>
            </div>
        </div>
    );
}
