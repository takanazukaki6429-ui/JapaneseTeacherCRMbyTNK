'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Loader2, Map, Target, BookText, CheckCircle2, Sparkles, BookOpen, Clock } from 'lucide-react';
import Link from 'next/link';
import { Student } from '@/types/student';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { generateMilestones } from '@/lib/roadmap/generators';
import { ja } from '@/app/(main)/roadmap/ja';
import { toast } from 'sonner';

const JLPT_TO_SCORE: Record<string, number> = {
    N5: 15, N4: 30, N3: 50, N2: 70, N1: 90,
};

function parseCurrentPhase(phase: string | null | undefined) {
    if (!phase) return {};
    const lvMatch = phase.match(/目標Lv\.(\d+)/);
    const moMatch = phase.match(/(\d+)ヶ月/);
    return {
        targetLevel: lvMatch ? parseInt(lvMatch[1], 10) : undefined,
        periodMonths: moMatch ? parseInt(moMatch[1], 10) : undefined,
    };
}

function extractSection(memo: string, heading: string): string | null {
    const regex = new RegExp(`■ ${heading}\\n([\\s\\S]*?)(?:\\n\\n|■|【|$)`);
    const match = memo.match(regex);
    return match ? match[1].trim() : null;
}

function extractBullets(text: string | null): string[] {
    if (!text) return [];
    return text.split('\n').map(l => l.replace(/^[-・] ?/, '').trim()).filter(Boolean);
}

export default function StudentRoadmapPage() {
    const params = useParams();
    const studentId = typeof params.id === 'string' ? params.id : '';
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<Student | null>(null);

    useEffect(() => {
        if (!studentId) return;
        supabase.from('students').select('*').eq('id', studentId).single()
            .then(({ data, error }) => {
                if (!error && data) setStudent(data as Student);
                setLoading(false);
            });
    }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

    const { targetLevel, periodMonths } = parseCurrentPhase(student?.current_phase);
    const currentScore = student?.jlpt_level ? JLPT_TO_SCORE[student.jlpt_level] : undefined;

    const milestones = useMemo(() => {
        if (!currentScore || !targetLevel || !periodMonths) return [];
        return generateMilestones(currentScore, targetLevel, periodMonths, [], ja);
    }, [currentScore, targetLevel, periodMonths]);

    if (loading) return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="animate-spin text-[#6f5385]" size={32} />
        </div>
    );
    if (!student) return <div>Student not found</div>;

    const hasRoadmap = !!(currentScore && targetLevel && periodMonths && milestones.length > 0);

    // memo からセクション抽出
    const memo = student.memo ?? '';
    const aiSummary    = extractSection(memo, 'AI要約');
    const focusAreas   = extractBullets(extractSection(memo, '重点項目'));
    const convNotes    = extractSection(memo, '会話メモ');

    const progressPct = hasRoadmap
        ? Math.round(((currentScore! - 10) / (targetLevel! - 10)) * 100)
        : 0;

    const targetJlptColor = milestones.length > 0 ? milestones[milestones.length - 1].jlptColor : '#6f5385';

    return (
        <div className="min-h-screen bg-[#faf9fd]">
            {/* ヘッダー */}
            <div className="bg-white border-b border-[#f4f3f7] sticky top-0 z-50">
                <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href={`/students/${studentId}`} className="p-2 text-[#4b454e] hover:text-[#1a1c1e] hover:bg-[#f4f3f7] rounded-full transition-colors">
                            <ArrowLeft size={18} />
                        </Link>
                        <h1 className="font-bold text-[#1a1c1e] flex items-center gap-2 text-sm">
                            <Map size={15} className="text-[#6f5385]" />
                            {student.name}さんのロードマップ
                        </h1>
                    </div>
                    <Link
                        href={`/students/${studentId}/initial-hearing`}
                        className="text-xs font-bold text-[#6f5385] bg-[#f2daff] hover:bg-[#e8c8ff] px-3 py-1.5 rounded-xl transition-colors"
                    >
                        再作成
                    </Link>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">

                {!hasRoadmap ? (
                    <div className="bg-white rounded-2xl p-8 text-center shadow-[0_0_40px_rgba(111,83,133,0.06)]">
                        <Map size={32} className="text-[#c9a8e0] mx-auto mb-3" />
                        <p className="text-sm font-bold text-[#1a1c1e] mb-1">ロードマップがまだ作成されていません</p>
                        <p className="text-xs text-[#4b454e] mb-4">体験レッスンのヒアリングから自動生成できます</p>
                        <Link
                            href={`/students/${studentId}/initial-hearing`}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6f5385] to-[#c9a8e0] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity"
                        >
                            体験レッスン → ロードマップ作成
                        </Link>
                    </div>
                ) : (
                    <>
                        {/* ヒーローカード */}
                        <div className="bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] rounded-2xl p-6 text-white shadow-[0_8px_32px_rgba(111,83,133,0.25)]">
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-lg">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{student.name}さん</p>
                                        {student.goal_text && <p className="text-xs text-white/70">{student.goal_text}</p>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-full">
                                    <Clock size={12} />
                                    <span className="text-xs font-bold">{periodMonths}ヶ月プラン</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-center">
                                    <p className="text-xs text-white/60 mb-1">現在</p>
                                    <span className="text-2xl font-bold">{student.jlpt_level}</span>
                                    <p className="text-xs text-white/60">Lv.{currentScore}</p>
                                </div>
                                <div className="flex-1">
                                    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white rounded-full" style={{ width: `${Math.max(4, progressPct)}%` }} />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-white/60 mt-1">
                                        <span>スタート</span><span>ゴール</span>
                                    </div>
                                </div>
                                <div className="text-center">
                                    <p className="text-xs text-white/60 mb-1">目標</p>
                                    <span className="text-2xl font-bold">{milestones[milestones.length - 1]?.jlpt ?? `Lv.${targetLevel}`}</span>
                                    <p className="text-xs text-white/60">Lv.{targetLevel}</p>
                                </div>
                            </div>
                        </div>

                        {/* 体験レッスンAI分析 */}
                        {(aiSummary || focusAreas.length > 0) && (
                            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] p-5 space-y-4">
                                <h2 className="text-sm font-bold text-[#1a1c1e] flex items-center gap-2">
                                    <BookOpen size={15} className="text-[#6f5385]" />
                                    体験レッスンAI分析
                                </h2>
                                {aiSummary && (
                                    <p className="text-sm text-[#1a1c1e] leading-relaxed bg-[#faf9fd] rounded-xl p-4">{aiSummary}</p>
                                )}
                                {focusAreas.length > 0 && (
                                    <div>
                                        <p className="text-xs font-bold text-[#4b454e] mb-2">重点項目</p>
                                        <div className="flex flex-wrap gap-2">
                                            {focusAreas.map((area, i) => (
                                                <span key={i} className="px-2.5 py-1 bg-[#f2daff] text-[#6f5385] text-xs font-medium rounded-full">{area}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {convNotes && (
                                    <div>
                                        <p className="text-xs font-bold text-[#4b454e] mb-2">会話メモ（原文）</p>
                                        <p className="text-xs text-[#4b454e] leading-relaxed bg-[#faf9fd] rounded-xl p-3 whitespace-pre-wrap">{convNotes}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 月別マイルストーン（全件・フル表示） */}
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-[#1a1c1e] flex items-center gap-2 px-1">
                                <Target size={15} className="text-[#6f5385]" />
                                月別ロードマップ
                            </h2>

                            {milestones.map((milestone) => (
                                <Card key={milestone.month} className="bg-white shadow-sm overflow-hidden border-0 shadow-[0_0_40px_rgba(111,83,133,0.06)]">
                                    <div className="h-1" style={{ backgroundColor: milestone.jlptColor }} />
                                    <CardContent className="p-4 space-y-3">
                                        {/* ヘッダー */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: milestone.jlptColor }}>
                                                    {milestone.month}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-[#1a1c1e]">{milestone.month}ヶ月目</p>
                                                    <p className="text-xs text-[#4b454e]">目標レベル: Lv.{milestone.level}</p>
                                                </div>
                                            </div>
                                            <Badge className="text-white" style={{ backgroundColor: milestone.jlptColor }}>
                                                {milestone.jlpt}
                                            </Badge>
                                        </div>

                                        {/* 目的マイルストーン */}
                                        {milestone.purposeMilestone && (
                                            <div className="p-3 rounded-xl flex items-start gap-2" style={{ backgroundColor: `${milestone.jlptColor}15` }}>
                                                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: milestone.jlptColor }} />
                                                <p className="text-sm text-[#1a1c1e]">{milestone.purposeMilestone}</p>
                                            </div>
                                        )}

                                        {/* 学習内容 */}
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-bold text-[#4b454e]">学習内容</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {milestone.focus.map((item: string, i: number) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                                                ))}
                                            </div>
                                        </div>

                                        {/* 習得スキル */}
                                        <div className="space-y-1.5">
                                            <p className="text-xs font-bold text-[#4b454e]">習得スキル</p>
                                            <ul className="space-y-1">
                                                {milestone.skills.map((skill: string, i: number) => (
                                                    <li key={i} className="flex items-center gap-2 text-sm text-[#4b454e]">
                                                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                        {skill}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* 理由 */}
                                        <div className="p-3 bg-[#faf9fd] rounded-xl">
                                            <p className="text-sm text-[#4b454e]">
                                                <strong className="text-[#1a1c1e]">この順番の理由：</strong><br />
                                                {milestone.reason}
                                            </p>
                                        </div>

                                        {/* 教材 */}
                                        {milestone.textbooks && milestone.textbooks.length > 0 && (
                                            <div className="space-y-1.5 pt-2 border-t border-[#f4f3f7]">
                                                <p className="text-xs font-bold text-[#4b454e] flex items-center gap-1.5">
                                                    <BookText className="w-3.5 h-3.5 text-[#6f5385]" /> おすすめ教材
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {milestone.textbooks.map((item: string, i: number) => (
                                                        <Badge key={i} variant="outline" className="text-xs bg-white text-[#4b454e] border-[#e2e8f0]">{item}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* AIプロンプト */}
                                        {milestone.aiPrompt && (
                                            <div
                                                className="p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 cursor-pointer hover:shadow-md transition-all"
                                                onClick={() => { navigator.clipboard.writeText(milestone.aiPrompt); toast.success('コピーしました'); }}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="text-xs font-bold text-purple-700 flex items-center gap-1.5">
                                                        <Sparkles className="w-3.5 h-3.5 fill-purple-700" /> AIプロンプト
                                                    </p>
                                                    <span className="text-[10px] text-purple-500 bg-purple-100/50 px-1.5 py-0.5 rounded">タップでコピー</span>
                                                </div>
                                                <p className="text-sm text-purple-900 leading-relaxed italic">&quot;{milestone.aiPrompt}&quot;</p>
                                            </div>
                                        )}

                                        {/* 推奨レッスン数 */}
                                        <div className="flex items-center justify-between pt-2 border-t border-[#f4f3f7]">
                                            <span className="text-sm text-[#4b454e]">推奨レッスン数</span>
                                            <span className="font-bold text-[#6f5385]">{milestone.lessonsNeeded}回/月</span>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* フッター */}
                        <div className="h-4" />
                    </>
                )}
            </div>
        </div>
    );
}
