'use client';

import React, { useState } from 'react';
import { Sparkles, BookOpen, Lightbulb, X, Loader2 } from 'lucide-react';
import { Student } from '@/types/student';

interface AIProfileAnalyzerProps {
    student: Student;
}

interface AnalysisResult {
    recommended_textbooks: { title: string; reason: string }[];
    teaching_strategy: string;
}

export function AIProfileAnalyzer({ student }: AIProfileAnalyzerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);

    const handleAnalyze = async () => {
        setLoading(true);
        setIsOpen(true);
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'profile_analysis',
                    name: student.name,
                    level: student.jlpt_level,
                    objective: student.goal_text,
                    weak_points: student.memo,
                    notes: student.memo
                }),
            });
            if (!res.ok) throw new Error('Analysis failed');
            const data = await res.json();
            const cleanText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
            setResult(JSON.parse(cleanText));
        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={handleAnalyze}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#f8e8e7] text-[#9c4f5a] font-bold text-sm rounded-full hover:bg-[#ece8f3] hover:-translate-y-0.5 transition-all"
            >
                <Sparkles size={15} />
                教材・指導方針を提案
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3b2e2a]/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-[0_24px_80px_rgba(156,79,90,0.2)] w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Header */}
                        <div className="px-5 py-4 bg-[#f1ebe1] flex items-center justify-between">
                            <h3 className="font-bold text-[#3b2e2a] flex items-center gap-2 text-sm">
                                <Sparkles size={15} className="text-[#9c4f5a]" />
                                AI教材・指導方針提案
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-[#f8e8e7] rounded-full transition-colors">
                                <X size={16} className="text-[#534344]" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-14 gap-4">
                                    <Loader2 size={32} className="animate-spin text-[#9c4f5a]" />
                                    <p className="text-sm font-medium text-[#534344] animate-pulse">
                                        {student.name}さんのプロフィールを分析中…
                                    </p>
                                    <p className="text-xs text-[#534344]/60">最適な教材と指導方針を考えています</p>
                                </div>
                            ) : result ? (
                                <>
                                    {/* 指導方針 */}
                                    <div className="bg-[#f8e8e7] rounded-2xl p-5">
                                        <h4 className="font-bold text-[#9c4f5a] flex items-center gap-2 mb-3 text-sm">
                                            <Lightbulb size={15} />
                                            指導・接し方の方針
                                        </h4>
                                        <p className="text-sm text-[#3b2e2a] leading-relaxed">{result.teaching_strategy}</p>
                                    </div>

                                    {/* おすすめ教材 */}
                                    <div>
                                        <h4 className="font-bold text-[#3b2e2a] flex items-center gap-2 mb-3 text-sm">
                                            <BookOpen size={15} className="text-[#9c4f5a]" />
                                            おすすめの教材
                                        </h4>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {result.recommended_textbooks.map((book, i) => (
                                                <div key={i} className="bg-[#f1ebe1] rounded-2xl p-4 hover:bg-[#f8e8e7] transition-colors">
                                                    <p className="font-bold text-[#3b2e2a] text-sm mb-1">{book.title}</p>
                                                    <p className="text-xs text-[#534344] leading-relaxed">{book.reason}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end pt-2 border-t border-[#f1ebe1]">
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="px-5 py-2 bg-[#9c4f5a] text-white font-bold text-sm rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(156,79,90,0.25)]"
                                        >
                                            閉じる
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center text-sm text-[#ba1a1a] py-8">
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
