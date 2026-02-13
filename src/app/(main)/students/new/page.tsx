'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewStudentPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nationality: '',
        jlpt_level: '',
        goal_text: '',
        textbook: '',
        current_phase: '',
        memo: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from('students').insert([
                {
                    name: formData.name,
                    nationality: formData.nationality || null,
                    jlpt_level: formData.jlpt_level || null,
                    goal_text: formData.goal_text || null,
                    textbook: formData.textbook || null,
                    current_phase: formData.current_phase || null,
                    memo: formData.memo || null,
                },
            ]);

            if (error) throw error;

            router.push('/students');
            router.refresh();
        } catch (error) {
            console.error('Error adding student:', error);
            alert('生徒の登録に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/students"
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">新規生徒登録</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                            氏名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            name="name"
                            required
                            value={formData.name}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="田中 太郎"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="nationality" className="block text-sm font-medium text-slate-700 mb-1">
                                国籍
                            </label>
                            <input
                                type="text"
                                id="nationality"
                                name="nationality"
                                value={formData.nationality}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="アメリカ"
                            />
                        </div>
                        <div>
                            <label htmlFor="jlpt_level" className="block text-sm font-medium text-slate-700 mb-1">
                                JLPTレベル
                            </label>
                            <select
                                id="jlpt_level"
                                name="jlpt_level"
                                value={formData.jlpt_level}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            >
                                <option value="">未設定</option>
                                <option value="N1">N1</option>
                                <option value="N2">N2</option>
                                <option value="N3">N3</option>
                                <option value="N4">N4</option>
                                <option value="N5">N5</option>
                                <option value="None">なし</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="goal_text" className="block text-sm font-medium text-slate-700 mb-1">
                            学習目的
                        </label>
                        <input
                            type="text"
                            id="goal_text"
                            name="goal_text"
                            value={formData.goal_text}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="ビジネス会話、日本旅行など"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="textbook" className="block text-sm font-medium text-slate-700 mb-1">
                                使用教材
                            </label>
                            <input
                                type="text"
                                id="textbook"
                                name="textbook"
                                value={formData.textbook}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="みんなの日本語"
                            />
                        </div>
                        <div>
                            <label htmlFor="current_phase" className="block text-sm font-medium text-slate-700 mb-1">
                                現在の進度
                            </label>
                            <input
                                type="text"
                                id="current_phase"
                                name="current_phase"
                                value={formData.current_phase}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="第5課"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="memo" className="block text-sm font-medium text-slate-700 mb-1">
                            補足メモ
                        </label>
                        <textarea
                            id="memo"
                            name="memo"
                            rows={4}
                            value={formData.memo}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="性格、得意・苦手分野など"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={18} />
                                保存中...
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                保存する
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
