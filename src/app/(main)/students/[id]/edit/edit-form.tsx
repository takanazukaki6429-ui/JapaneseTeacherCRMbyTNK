'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Student } from '@/types/student';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { showAppError } from '@/lib/error-handler';

interface EditStudentFormProps {
    student: Student;
}

export function EditStudentForm({ student }: EditStudentFormProps) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: student.name ?? '',
        nationality: student.nationality ?? '',
        // 「なし」（英語の None が保存されていた）は選べなくした（2026-10-09）。前に入った None は「未設定」として出し、保存で空に直す
        jlpt_level: student.jlpt_level && student.jlpt_level !== 'None' ? student.jlpt_level : '',
        goal_text: student.goal_text ?? '',
        textbook: student.textbook ?? '',
        memo: student.memo ?? '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('students')
                .update({
                    name: formData.name,
                    nationality: formData.nationality || null,
                    jlpt_level: formData.jlpt_level || null,
                    goal_text: formData.goal_text || null,
                    textbook: formData.textbook || null,
                    memo: formData.memo || null,
                })
                .eq('id', student.id);

            if (error) throw error;

            toast.success('生徒情報を更新しました');
            router.push(`/students/${student.id}`);
            router.refresh();
        } catch (error) {
            console.error('Error updating student:', error);
            showAppError(error, '生徒情報の更新に失敗しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/students/${student.id}`}
                    className="p-2 text-[#484550] hover:text-[#3a3350] hover:bg-[#f0ebf8] rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#3a3350]">生徒情報を編集</h1>
                    <p className="text-sm text-[#484550]">{student.name}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] space-y-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">
                            氏名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-[#d6cfe2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b5ca5] focus:border-transparent text-sm"
                            placeholder="田中 太郎"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="nationality" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">
                                国籍
                            </label>
                            <input
                                type="text"
                                id="nationality"
                                name="nationality"
                                value={formData.nationality}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-[#d6cfe2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b5ca5] focus:border-transparent text-sm"
                                placeholder="アメリカ"
                            />
                        </div>
                        <div>
                            <label htmlFor="jlpt_level" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">
                                JLPTレベル
                            </label>
                            <select
                                id="jlpt_level"
                                name="jlpt_level"
                                value={formData.jlpt_level}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-[#d6cfe2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b5ca5] focus:border-transparent text-sm bg-white"
                            >
                                <option value="">未設定</option>
                                <option value="N1">N1</option>
                                <option value="N2">N2</option>
                                <option value="N3">N3</option>
                                <option value="N4">N4</option>
                                <option value="N5">N5</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="goal_text" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">
                            学習目的
                        </label>
                        <input
                            type="text"
                            id="goal_text"
                            name="goal_text"
                            value={formData.goal_text}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-[#d6cfe2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b5ca5] focus:border-transparent text-sm"
                            placeholder="ビジネス会話、日本旅行など"
                        />
                    </div>

                    {/* 「現在の進度」の欄は外した（2026-10-09 かずき決定）。学習計画を保存している欄と同じで、
                        「第5課」などと書くと学習計画・ロードマップ・生徒に渡したリンクが消えていたため。
                        学習計画は、学習計画の画面の「目標・期間・目的を直す」で直す */}
                    <div>
                        <label htmlFor="textbook" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">
                            使用テキスト
                        </label>
                        <input
                            type="text"
                            id="textbook"
                            name="textbook"
                            value={formData.textbook}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-[#d6cfe2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b5ca5] focus:border-transparent text-sm"
                            placeholder="みんなの日本語 第5課"
                        />
                        <p className="mt-1 text-[11px] text-[#484550]/70">今の課もここに書けます。学習計画（目標・期間・目的）は、学習計画の画面の「目標・期間・目的を直す」で直します。</p>
                    </div>

                    <div>
                        <label htmlFor="memo" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">
                            補足メモ
                        </label>
                        <textarea
                            id="memo"
                            name="memo"
                            rows={4}
                            value={formData.memo}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-[#d6cfe2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6b5ca5] focus:border-transparent text-sm resize-none"
                            placeholder="性格、得意・苦手分野など"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <Link
                        href={`/students/${student.id}`}
                        className="text-sm text-[#484550] hover:text-[#3a3350] transition-colors"
                    >
                        キャンセル
                    </Link>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6b5ca5] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-[0_4px_15px_rgba(107,92,165,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                保存中...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                変更を保存
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
