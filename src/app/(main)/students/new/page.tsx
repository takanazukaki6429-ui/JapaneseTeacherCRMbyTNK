'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { showAppError } from '@/lib/error-handler';

export default function NewStudentPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        nationality: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from('students')
                .insert([{
                    name: formData.name,
                    nationality: formData.nationality || null,
                }])
                .select('id')
                .single();

            if (error) throw error;

            toast.success('生徒を登録しました。体験レッスンの内容を入力してください。');
            router.push(`/students/${data.id}/initial-hearing`);
        } catch (error) {
            console.error('Error adding student:', error);
            showAppError(error, '生徒の登録に失敗しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-lg mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/students"
                    className="p-2 text-[#534344] hover:text-[#3b2e2a] hover:bg-[#f1ebe1] rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-[#3b2e2a]">新規生徒登録</h1>
                    <p className="text-xs text-[#534344] mt-0.5">登録後、体験レッスンのメモ入力へ進みます</p>
                </div>
            </div>

            {/* ステップ表示 */}
            <div className="flex items-center gap-2 text-xs text-[#534344]">
                <div className="flex items-center gap-1.5 font-bold text-[#9c4f5a]">
                    <span className="w-5 h-5 rounded-full bg-[#9c4f5a] text-white flex items-center justify-center text-[10px]">1</span>
                    名前・国籍を登録
                </div>
                <div className="text-[#d9a7ae]">→</div>
                <div className="flex items-center gap-1.5 text-[#534344]/50">
                    <span className="w-5 h-5 rounded-full bg-[#f1ebe1] text-[#534344] flex items-center justify-center text-[10px]">2</span>
                    体験レッスンのメモ入力
                </div>
                <div className="text-[#d9a7ae]">→</div>
                <div className="flex items-center gap-1.5 text-[#534344]/50">
                    <span className="w-5 h-5 rounded-full bg-[#f1ebe1] text-[#534344] flex items-center justify-center text-[10px]">3</span>
                    AI判定 → ロードマップ生成
                </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] space-y-5">
                <div>
                    <label htmlFor="name" className="block text-xs font-bold text-[#534344] uppercase tracking-wider mb-1.5">
                        氏名 <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-[#dccfc4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9c4f5a] focus:border-transparent text-sm"
                        placeholder="田中 太郎"
                        autoFocus
                    />
                </div>

                <div>
                    <label htmlFor="nationality" className="block text-xs font-bold text-[#534344] uppercase tracking-wider mb-1.5">
                        国籍
                    </label>
                    <input
                        type="text"
                        id="nationality"
                        name="nationality"
                        value={formData.nationality}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-[#dccfc4] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#9c4f5a] focus:border-transparent text-sm"
                        placeholder="アメリカ"
                    />
                    <p className="text-[11px] text-[#534344]/60 mt-1">レベル・学習目的・教材は次の画面でAIが自動判定します</p>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={loading || !formData.name.trim()}
                        className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#9c4f5a] text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-[0_4px_15px_rgba(156,79,90,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <><Loader2 className="animate-spin" size={18} />登録中...</>
                        ) : (
                            <>登録して体験レッスン入力へ <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
