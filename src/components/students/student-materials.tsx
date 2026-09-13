'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Material } from '@/types/material';
import { BookOpen, Zap, FileText, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';

interface StudentMaterialsProps {
    studentId: string;
    studentName: string;
}

export function StudentMaterials({ studentId, studentName }: StudentMaterialsProps) {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('materials')
            .select('*')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false })
            .limit(5)
            .then(({ data, error }) => {
                if (!error && data) setMaterials(data as Material[]);
                setLoading(false);
            });
    }, [studentId]);

    return (
        <div className="bg-white p-5 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)]">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[#3a3350] flex items-center gap-2">
                    <BookOpen size={16} className="text-[#6b5ca5]" />
                    {studentName}さんの教材
                </h2>
                {materials.length > 0 && (
                    <Link
                        href="/materials"
                        className="text-xs text-[#6b5ca5] hover:text-[#484550] transition-colors flex items-center gap-1"
                    >
                        教材一覧へ
                        <ArrowRight size={12} />
                    </Link>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 size={18} className="animate-spin text-[#6b5ca5]/40" />
                </div>
            ) : materials.length === 0 ? (
                <div className="text-center py-5">
                    <p className="text-xs text-[#484550] mb-3">まだ専用教材がありません</p>
                    <Link
                        href={`/students/${studentId}/lessons/prepare`}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6b5ca5] bg-[#efe9ff] px-3 py-1.5 rounded-full hover:bg-[#dff1ea] transition-colors"
                    >
                        レッスン準備で生成する
                        <ArrowRight size={12} />
                    </Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {materials.map((mat) => (
                        <Link
                            key={mat.id}
                            href={`/materials/${mat.id}`}
                            className="flex items-start gap-3 p-3 bg-[#f0ebf8] hover:bg-[#efe9ff] rounded-xl transition-colors group"
                        >
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                mat.type === 'prompt' ? 'bg-[#efe9ff] text-[#6b5ca5]' : 'bg-[#dff1ea] text-[#2a6f5a]'
                            }`}>
                                {mat.type === 'prompt' ? <Zap size={14} /> : <FileText size={14} />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#3a3350] group-hover:text-[#6b5ca5] transition-colors truncate">
                                    {mat.title}
                                </p>
                                <p className="text-[10px] text-[#484550] mt-0.5">{formatDate(mat.created_at)}</p>
                            </div>
                        </Link>
                    ))}
                    <Link
                        href={`/students/${studentId}/lessons/prepare`}
                        className="flex items-center justify-center gap-1.5 w-full py-2 text-xs text-[#6b5ca5] hover:text-[#484550] transition-colors border border-dashed border-[#d6cfe2]/60 rounded-xl hover:border-[#6b5ca5]/30"
                    >
                        + 新しい教材を生成
                    </Link>
                </div>
            )}
        </div>
    );
}
