'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { ArrowLeft, Loader2 } from 'lucide-react';

const RoadmapGenerator = dynamic(() => import('@/components/roadmap/RoadmapGenerator'), {
    loading: () => (
        <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-teal-600" />
        </div>
    ),
    ssr: false // Client component heavy on libraries
});
import Link from 'next/link';
import { type Milestone } from '@/lib/roadmap/types';
import { Student } from '@/types/student';

export default function StudentRoadmapPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = typeof params.id === 'string' ? params.id : '';
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<Student | null>(null);

    useEffect(() => {
        const fetchStudent = async () => {
            try {
                const { data, error } = await supabase
                    .from('students')
                    .select('*')
                    .eq('id', studentId)
                    .single();

                if (error) throw error;
                setStudent(data);
            } catch (error) {
                console.error('Error fetching student:', error);
            } finally {
                setLoading(false);
            }
        };

        if (studentId) {
            fetchStudent();
        }
    }, [studentId, supabase]);

    const handleSave = async (data: {
        currentLevel: number;
        targetLevel: number;
        purposeId: string;
        purposeLabel: string;
        periodMonths: number;
        milestones: Milestone[];
    }) => {
        if (!studentId) return;

        try {
            // Construct strings from structured data
            const goalText = `Goal: Lv.${data.targetLevel} (${data.purposeLabel})`;
            const currentPhaseText = `Plan: ${data.periodMonths} Months`;

            // Generate a summary for the memo
            const roadmapSummary = `
【New Roadmap Created: ${new Date().toLocaleDateString()}】
Current: Lv.${data.currentLevel} -> Goal: Lv.${data.targetLevel}
Period: ${data.periodMonths} Months
Purpose: ${data.purposeLabel}
Key Focus: ${data.milestones[0]?.focus.join(', ') || 'General'}
            `.trim();

            const updates = {
                // Approximate mapping from 0-100 scale to JLPT like N5, N4 etc not strictly required but handled if needed in future
                // For now, we update the text fields used in the profile
                goal_text: goalText,
                current_phase: currentPhaseText,
                // Append to memo
                memo: (student?.memo ? student.memo + '\n\n' : '') + roadmapSummary
            };

            const { error } = await supabase
                .from('students')
                .update(updates)
                .eq('id', studentId);

            if (error) throw error;

            alert('ロードマップを生徒プロフィールに保存しました！');
            router.push(`/students/${studentId}`);

        } catch (error) {
            console.error('Error saving roadmap:', error);
            alert('保存に失敗しました。');
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
        );
    }

    if (!student) return <div>Student not found</div>;

    // Try to parse existing data if relevant, or default
    // We prioritize the new 'purposes' column, but fallback to nothing if not present (legacy data difficult to parse back to ID)
    const initialPurpose = undefined;

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/students/${studentId}`}
                            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                        >
                            <ArrowLeft size={20} />
                        </Link>
                        <div>
                            <h1 className="font-bold text-slate-800">{student.name}さんのロードマップ</h1>
                            <p className="text-xs text-slate-500">学習プランを作成・編集</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-8">
                <RoadmapGenerator
                    studentName={student.name}
                    initialLevel={20} // Could be mapped from student data
                    initialPurpose={initialPurpose}
                    onSave={handleSave}
                />
            </div>
        </div>
    );
}
