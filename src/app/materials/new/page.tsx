'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Loader2, Zap, FileText } from 'lucide-react';
import Link from 'next/link';
import { MaterialType } from '@/types/material';

export default function NewMaterialPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'prompt' as MaterialType,
        content: '',
        tags: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const setType = (type: MaterialType) => {
        setFormData((prev) => ({ ...prev, type }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Split tags by comma and trim
            const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);

            const { error } = await supabase.from('materials').insert([
                {
                    title: formData.title,
                    type: formData.type,
                    content: formData.content,
                    tags: tagsArray,
                },
            ]);

            if (error) throw error;

            router.push('/materials');
            router.refresh();
        } catch (error) {
            console.error('Error adding material:', error);
            alert('保存に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href="/materials"
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">新規資産作成</h1>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-6">

                {/* Type Selection */}
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">種類</label>
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setType('prompt')}
                            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.type === 'prompt'
                                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                }`}
                        >
                            <Zap size={20} />
                            <span className="font-bold">プロンプト</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('content')}
                            className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.type === 'content'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                                }`}
                        >
                            <FileText size={20} />
                            <span className="font-bold">生成コンテンツ</span>
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        {formData.type === 'prompt'
                            ? 'AIへの指示（プロンプト）をテンプレートとして保存します。'
                            : 'AIが生成したクイズや解説などを完成品として保存します。'}
                    </p>
                </div>

                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
                        タイトル <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="title"
                        name="title"
                        required
                        value={formData.title}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder={formData.type === 'prompt' ? "例: 敬語ロールプレイ生成プロンプト" : "例: N4動詞活用クイズ (第5課)"}
                    />
                </div>

                <div>
                    <label htmlFor="content" className="block text-sm font-medium text-slate-700 mb-1">
                        内容 (本文)
                    </label>
                    <textarea
                        id="content"
                        name="content"
                        rows={10}
                        value={formData.content}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
                        placeholder={formData.type === 'prompt'
                            ? "あなたは日本語教師です。以下の条件でロールプレイを作成してください..."
                            : "問題1: ( ) に助詞を入れてください。\n私は学校 ( ) 行きます。"}
                    />
                </div>

                <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-slate-700 mb-1">
                        タグ
                    </label>
                    <input
                        type="text"
                        id="tags"
                        name="tags"
                        value={formData.tags}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        placeholder="カンマ区切り (例: N4, 文法, ロールプレイ)"
                    />
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
