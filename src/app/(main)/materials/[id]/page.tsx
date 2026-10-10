import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Material } from '@/types/material';
import { formatDate } from '@/lib/utils';
import { ArrowLeft, Zap, FileText, Globe } from 'lucide-react';
import { PublicToggleButton } from './public-toggle';
import { DeleteMaterialButton } from './delete-button';
import { getFeatureDecision } from '@/lib/plan-access-server';
import { PaidLock } from '@/components/paid-lock';
import type { FeatureDecision } from '@/lib/plan-features';

export const revalidate = 0;

/**
 * ほかの先生のテキスト（みんなのテキスト）を開けるか。ライトでは自分のテキストだけ（2026-10-04 かずき決定・lib/plan-features.ts）。
 * 自分のテキストか（isOwner）も返す：公開の切り替えと削除は、作った本人にだけ出す（2026-10-09。前はほかの先生のテキストにも出て、押しても変わらなかった）
 */
async function getViewerDecision(authorId: string | null | undefined): Promise<{ decision: FeatureDecision; isOwner: boolean }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { decision: { allowed: false, reason: 'needs_plan' }, isOwner: false };
    if (authorId && authorId === user.id) return { decision: { allowed: true }, isOwner: true };
    return { decision: await getFeatureDecision(supabase, user.id, 'shared_materials'), isOwner: false };
}

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
    const { decision: viewer, isOwner } = await getViewerDecision((material as { author_id?: string | null }).author_id);
    if (!viewer.allowed) {
        return (
            <div className="max-w-3xl mx-auto space-y-5">
                <Link href="/materials" className="inline-flex items-center gap-1.5 text-sm text-[#484550] hover:text-[#3a3350] transition-colors">
                    <ArrowLeft size={16} />
                    テキスト一覧
                </Link>
                <PaidLock feature="みんなのテキスト" needsRegular={viewer.reason === 'needs_regular'} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href="/materials"
                        className="inline-flex items-center gap-1.5 text-sm text-[#484550] hover:text-[#3a3350] transition-colors"
                    >
                        <ArrowLeft size={16} />
                        テキスト一覧
                    </Link>
                </div>
                {isOwner ? (
                    <div className="flex items-center gap-2">
                        <PublicToggleButton id={material.id} isPublic={material.is_public} />
                        <DeleteMaterialButton id={material.id} />
                    </div>
                ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-[#efe9ff] text-[#6b5ca5] rounded-full">
                        <Globe size={12} /> ほかの先生が公開したテキスト
                    </span>
                )}
            </div>

            {/* Title card */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_0_40px_rgba(107,92,165,0.06)] flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    material.type === 'prompt' ? 'bg-[#efe9ff] text-[#6b5ca5]' : 'bg-[#dff1ea] text-[#2a6f5a]'
                }`}>
                    {material.type === 'prompt' ? <Zap size={22} /> : <FileText size={22} />}
                </div>
                <div>
                    <h1 className="text-lg font-bold text-[#3a3350]">{material.title}</h1>
                    <p className="text-xs text-[#484550] mt-0.5">{formatDate(material.created_at)}</p>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] overflow-hidden">
                {/* Tags row */}
                {(material.tags?.length || 0) > 0 && (
                    <div className="px-5 py-3 bg-[#f0ebf8] flex items-center gap-2 flex-wrap">
                        {material.tags?.map((tag, i) => (
                            <span key={i} className="px-2.5 py-0.5 text-xs font-medium bg-white text-[#484550] rounded-full border border-[#d6cfe2]/30">
                                #{tag}
                            </span>
                        ))}
                        <span className="ml-auto text-[10px] text-[#484550]">{material.type === 'prompt' ? 'プロンプト' : '生成コンテンツ'}</span>
                    </div>
                )}
                <div className="p-6">
                    <pre className="whitespace-pre-wrap font-mono text-sm text-[#3a3350] leading-relaxed bg-[#f0ebf8] p-4 rounded-xl">
                        {material.content}
                    </pre>
                </div>
            </div>
        </div>
    );
}
