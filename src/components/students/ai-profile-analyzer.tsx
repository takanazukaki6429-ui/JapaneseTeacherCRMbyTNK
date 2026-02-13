'use client';

import React, { useState } from 'react';
import { Sparkles, BookOpen, Calendar, Lightbulb, Loader2, X, ChevronRight, Check } from 'lucide-react';
import { Student } from '@/types/student';

interface AIProfileAnalyzerProps {
    student: Student;
}

interface AnalysisResult {
    recommended_textbooks: { title: string; reason: string }[];
    teaching_strategy: string;
    week_schedule: string;
}

export function AIProfileAnalyzer({ student }: AIProfileAnalyzerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setIsOpen(true); // Open modal/drawer immediately
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'profile_analysis',
                    name: student.name,
                    level: student.jlpt_level,
                    objective: student.goal_text,
                    weak_points: student.memo, // Use memo as it contains personality/weaknesses
                    notes: student.memo
                }),
            });

            if (!res.ok) throw new Error('Analysis failed');

            const data = await res.json();
            // Parse JSON from text if needed, handling markdown code blocks
            const cleanText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
            setResult(JSON.parse(cleanText));
        } catch (error) {
            console.error('Analysis error:', error);
            // In a real app, show error toast
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleAnalyze}
                className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all hover:scale-[1.02]"
            >
                <Sparkles size={18} className="text-yellow-200" />
                AIで学習プランを分析・提案
            </button>

            {/* Modal / Overlay */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="text-purple-500" size={20} />
                                AI学習プラン提案
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                            >
                                <X size={20} className="text-slate-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {loading ? (
                                <div className="text-center py-12 space-y-4">
                                    <div className="relative w-16 h-16 mx-auto">
                                        <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                                        <div className="absolute inset-0 rounded-full border-4 border-purple-500 border-t-transparent animate-spin"></div>
                                    </div>
                                    <p className="text-slate-600 font-medium animate-pulse">
                                        {student.name}さんのプロフィールを分析中...
                                    </p>
                                    <p className="text-xs text-slate-400">最適な教材とスケジュールを考えています</p>
                                </div>
                            ) : result ? (
                                <>
                                    {/* Strategy */}
                                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-5">
                                        <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-3">
                                            <Lightbulb size={20} />
                                            指導・接し方の方針
                                        </h4>
                                        <p className="text-indigo-800 text-sm leading-relaxed">
                                            {result.teaching_strategy}
                                        </p>
                                    </div>

                                    {/* Textbooks */}
                                    <div>
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                            <BookOpen size={20} className="text-teal-600" />
                                            おすすめの教材
                                        </h4>
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            {result.recommended_textbooks.map((book, i) => (
                                                <div key={i} className="border border-slate-200 rounded-lg p-4 hover:border-teal-300 transition-colors bg-white shadow-sm">
                                                    <p className="font-bold text-slate-900 mb-2">{book.title}</p>
                                                    <p className="text-xs text-slate-500 leading-relaxed">{book.reason}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Schedule */}
                                    <div>
                                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                                            <Calendar size={20} className="text-blue-600" />
                                            推奨スケジュール
                                        </h4>
                                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                                            <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                                                {result.week_schedule}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="px-6 py-2 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-colors"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-red-500">
                                    データの取得に失敗しました。もう一度お試しください。
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
