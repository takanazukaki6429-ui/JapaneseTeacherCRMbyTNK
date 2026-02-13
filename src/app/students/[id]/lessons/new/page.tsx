'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Save, Loader2, Star } from 'lucide-react';
import Link from 'next/link';

export default function NewLessonPage() {
    const router = useRouter();
    const supabase = createClient();
    const params = useParams(); // useParams returns string | string[]
    const studentId = typeof params.id === 'string' ? params.id : '';

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        topics: '',
        vocabulary: '',
        mistakes: '',
        understanding_level: 3,
        homework: '',
        next_goal: '',
        memo: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const setRating = (rating: number) => {
        setFormData((prev) => ({ ...prev, understanding_level: rating }));
    };

    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateFeedback = async () => {
        if (!formData.topics && !formData.mistakes) {
            alert('AI分析を行うには、少なくとも「文法・トピック」か「つまずき・弱点」を入力してください。');
            return;
        }

        setIsGenerating(true);
        try {
            const prompt = `
あなたはプロの日本語教師です。以下のレッスン記録をもとに、生徒への宿題、次回の目標、そして生徒へのフィードバックコメント（励ますようなトーンで）を提案してください。

## レッスン情報
- 学習トピック: ${formData.topics}
- 語彙: ${formData.vocabulary}
- つまずき・弱点: ${formData.mistakes}

出力は以下のJSON形式でお願いします（Markdown記法は含めないでください）:
{
  "homework": "提案する宿題の内容",
  "next_goal": "次回のレッスンの目標",
  "feedback": "生徒へのフィードバックコメント"
}
`;

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) throw new Error('AI generation failed');

            const data = await res.json();
            // Clean up code blocks if present
            const cleanText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanText);

            setFormData(prev => ({
                ...prev,
                homework: result.homework || prev.homework,
                next_goal: result.next_goal || prev.next_goal,
                memo: (prev.memo ? prev.memo + '\n\n' : '') + `【AIフィードバック】\n${result.feedback}`,
            }));

        } catch (error) {
            console.error('AI Error:', error);
            alert('AI提案の生成に失敗しました。');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId) return;

        setLoading(true);

        try {
            const { error } = await supabase.from('lessons').insert([
                {
                    student_id: studentId,
                    date: new Date(formData.date).toISOString(),
                    topics: formData.topics || null,
                    vocabulary: formData.vocabulary || null,
                    mistakes: formData.mistakes || null,
                    understanding_level: formData.understanding_level,
                    homework: formData.homework || null,
                    next_goal: formData.next_goal || null,
                    content: formData.memo || null, // Saving generic memo to 'content'
                },
            ]);

            if (error) throw error;

            router.push(`/students/${studentId}`);
            router.refresh();
        } catch (error) {
            console.error('Error adding lesson:', error);
            alert('レッスン記録の保存に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    if (!studentId) return <div>Invalid Student ID</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
                <Link
                    href={`/students/${studentId}`}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">レッスン記録</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">基本情報</h2>
                    <div>
                        <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1">
                            日時 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="datetime-local"
                            id="date"
                            name="date"
                            required
                            value={formData.date}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>

                <div className="pt-2 flex justify-end">
                    <button
                        type="button"
                        onClick={handleGenerateFeedback}
                        disabled={isGenerating || (!formData.topics && !formData.mistakes)}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-sm font-bold rounded-full hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                AIが考え中...
                            </>
                        ) : (
                            <>
                                <Star size={16} className="fill-white" />
                                AIで宿題・フィードバックを提案
                            </>
                        )}
                    </button>
                </div>


                {/* Learning Content - AI Important */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-teal-200 ring-1 ring-teal-100 space-y-4">
                    <div className="flex items-center justify-between border-b border-teal-100 pb-2">
                        <h2 className="text-lg font-bold text-teal-800">学習内容 (AI分析用)</h2>
                        <span className="text-xs bg-teal-100 text-teal-700 px-2 py-1 rounded-full">重要</span>
                    </div>

                    <div>
                        <label htmlFor="topics" className="block text-sm font-medium text-slate-700 mb-1">
                            文法・トピック
                        </label>
                        <input
                            type="text"
                            id="topics"
                            name="topics"
                            value={formData.topics}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="例: 〜てはいけません, 許可を求める表現"
                        />
                        <p className="text-xs text-slate-400 mt-1">カンマ区切りで入力するとAIが認識しやすくなります。</p>
                    </div>

                    <div>
                        <label htmlFor="vocabulary" className="block text-sm font-medium text-slate-700 mb-1">
                            語彙・表現
                        </label>
                        <textarea
                            id="vocabulary"
                            name="vocabulary"
                            rows={2}
                            value={formData.vocabulary}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="例: 規則、守る、厳しい"
                        />
                    </div>

                    <div>
                        <label htmlFor="mistakes" className="block text-sm font-medium text-slate-700 mb-1">
                            つまずき・弱点
                        </label>
                        <textarea
                            id="mistakes"
                            name="mistakes"
                            rows={3}
                            value={formData.mistakes}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-red-200 bg-red-50/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent placeholder-red-300"
                            placeholder="例: 「〜なくてはいけません」と「〜なくてもいいです」の混同が見られる。"
                        />
                    </div>
                </div>

                {/* Student Performance & Next Steps */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">生徒の様子・ネクストアクション</h2>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            理解度 (自己評価/教師評価)
                        </label>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    onClick={() => setRating(star)}
                                    className={`p-1 rounded-full transition-colors ${star <= formData.understanding_level ? 'text-yellow-400' : 'text-slate-200'
                                        }`}
                                >
                                    <Star size={28} fill={star <= formData.understanding_level ? "currentColor" : "none"} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="homework" className="block text-sm font-medium text-slate-700 mb-1">
                                宿題
                            </label>
                            <textarea
                                id="homework"
                                name="homework"
                                rows={3}
                                value={formData.homework}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="ドリルP20-22"
                            />
                        </div>
                        <div>
                            <label htmlFor="next_goal" className="block text-sm font-medium text-slate-700 mb-1">
                                次回の目標
                            </label>
                            <textarea
                                id="next_goal"
                                name="next_goal"
                                rows={3}
                                value={formData.next_goal}
                                onChange={handleChange}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                                placeholder="会話練習を中心に"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="memo" className="block text-sm font-medium text-slate-700 mb-1">
                            その他メモ
                        </label>
                        <textarea
                            id="memo"
                            name="memo"
                            rows={2}
                            value={formData.memo}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                            placeholder="雑談内容など"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-4 pb-12">
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
