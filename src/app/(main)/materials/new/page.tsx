'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Save, Loader2, Zap, FileText, Globe, Lock } from 'lucide-react';
import Link from 'next/link';
import { MaterialType } from '@/types/material';

export default function NewMaterialPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'prompt' as MaterialType,
        content: '',
        tags: '',
        is_public: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const setType = (type: MaterialType) => setFormData((prev) => ({ ...prev, type }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const tagsArray = formData.tags.split(',').map(t => t.trim()).filter(t => t);
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('ログインが必要です');
            const { error } = await supabase.from('materials').insert([{
                title: formData.title,
                type: formData.type,
                content: formData.content,
                tags: tagsArray,
                is_public: formData.is_public,
                author_id: user.id,
            }]);
            if (error) throw error;
            router.push('/materials');
            router.refresh();
        } catch {
            alert('保存に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-5">
            <div className="flex items-center gap-3">
                <Link href="/materials" className="inline-flex items-center gap-1.5 text-sm text-[#4b454e] hover:text-[#1a1c1e] transition-colors">
                    <ArrowLeft size={16} />
                    教材一覧
                </Link>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">新規教材作成</h1>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] space-y-6">

                {/* Type */}
                <div>
                    <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-2">種類</label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={() => setType('prompt')}
                            className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                formData.type === 'prompt'
                                    ? 'border-[#6f5385] bg-[#f2daff] text-[#6f5385]'
                                    : 'border-[#cdc3ce]/30 hover:border-[#cdc3ce] text-[#4b454e]'
                            }`}
                        >
                            <Zap size={18} />
                            <span className="font-bold text-sm">プロンプト</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('content')}
                            className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                                formData.type === 'content'
                                    ? 'border-[#655a6f] bg-[#eddcf4] text-[#655a6f]'
                                    : 'border-[#cdc3ce]/30 hover:border-[#cdc3ce] text-[#4b454e]'
                            }`}
                        >
                            <FileText size={18} />
                            <span className="font-bold text-sm">生成コンテンツ</span>
                        </button>
                    </div>
                </div>

                {/* Title */}
                <div>
                    <label htmlFor="title" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-2">
                        タイトル <span className="text-[#ba1a1a]">*</span>
                    </label>
                    <input
                        type="text" id="title" name="title" required
                        value={formData.title} onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors placeholder:text-[#4b454e]"
                        placeholder={formData.type === 'prompt' ? "例: 敬語ロールプレイ生成プロンプト" : "例: N4動詞活用クイズ (第5課)"}
                    />
                </div>

                {/* Content */}
                <div>
                    <label htmlFor="content" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-2">内容</label>
                    <textarea
                        id="content" name="content" rows={10}
                        value={formData.content} onChange={handleChange}
                        className="w-full px-4 py-3 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] font-mono outline-none focus:bg-[#f2daff] transition-colors placeholder:text-[#4b454e] resize-none"
                        placeholder={formData.type === 'prompt'
                            ? "あなたは日本語教師です。以下の条件でロールプレイを作成してください..."
                            : "問題1: ( ) に助詞を入れてください。\n私は学校 ( ) 行きます。"}
                    />
                </div>

                {/* Tags */}
                <div>
                    <label htmlFor="tags" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-2">タグ</label>
                    <input
                        type="text" id="tags" name="tags"
                        value={formData.tags} onChange={handleChange}
                        className="w-full px-4 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors placeholder:text-[#4b454e]"
                        placeholder="カンマ区切り (例: N4, 文法, ロールプレイ)"
                    />
                </div>

                {/* 公開設定 */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-[#f4f3f7]">
                    <div className="flex items-center gap-3">
                        {formData.is_public
                            ? <Globe size={18} className="text-[#6f5385]" />
                            : <Lock size={18} className="text-[#4b454e]" />
                        }
                        <div>
                            <p className="text-sm font-semibold text-[#1a1c1e]">
                                {formData.is_public ? '全ユーザーに公開' : '自分のみ（非公開）'}
                            </p>
                            <p className="text-xs text-[#4b454e]">
                                {formData.is_public ? 'みんなの教材ライブラリに表示されます' : '公開すると他の先生も閲覧できます'}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, is_public: !prev.is_public }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_public ? 'bg-[#6f5385]' : 'bg-[#cdc3ce]'}`}
                    >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${formData.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <><Loader2 className="animate-spin" size={16} />保存中...</> : <><Save size={16} />保存する</>}
                    </button>
                </div>
            </form>
        </div>
    );
}
