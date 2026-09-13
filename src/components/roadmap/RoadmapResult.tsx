'use client';

/**
 * ロードマップの結果表示（まとめ・成長グラフ・レッスン配分・月別の目標）
 *
 * 学習者向けロードマップ画面と、先生が生徒に渡すリンク先の画面で同じ見た目を使うための共通部品。
 * 入力は「今のレベル・目標・期間・目的・表示言語」だけで、中身はすべてここで計算する。
 */

import { useMemo } from 'react';
import { Clock, Target, TrendingUp, BookOpen, CheckCircle2, BookText, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import type { Translations } from '@/app/(main)/roadmap/i18n';
import { PURPOSE_ICONS, LESSON_TYPE_ICONS, JLPT_LEVELS } from '@/lib/roadmap/constants';
import type { PurposeId } from '@/lib/roadmap/types';
import { getLessonDistribution, calculateTotalHours } from '@/lib/roadmap/calculations';
import { generateMilestones, getLevelDescription, getDistributionReason } from '@/lib/roadmap/generators';

const lessonTypeKeys = ['grammar', 'vocabulary', 'conversation', 'reading', 'listening'] as const;

/** 0〜100 の目盛りを N5〜N1 の呼び名にする（グラフの縦軸用） */
function jlptName(level: number): string {
    return (JLPT_LEVELS.find(l => level >= l.minLevel && level < l.maxLevel) ?? JLPT_LEVELS[4]).name;
}

type Props = {
    t: Translations;
    currentLevel: number;
    targetLevel: number;
    periodMonths: number;
    selectedPurposes: PurposeId[];
};

export function RoadmapResult({ t, currentLevel, targetLevel, periodMonths, selectedPurposes }: Props) {
    const primaryPurpose = selectedPurposes.length > 0 ? selectedPurposes[0] : null;
    const purposeIcon = primaryPurpose ? PURPOSE_ICONS[primaryPurpose] : null;
    const purposeLabel = selectedPurposes.length > 0
        ? selectedPurposes.map(pid => t.purposes[pid as keyof typeof t.purposes]?.label || pid).join(' & ')
        : null;

    const totalHours = useMemo(() => calculateTotalHours(currentLevel, targetLevel, selectedPurposes), [currentLevel, targetLevel, selectedPurposes]);
    const hoursPerWeek = useMemo(() => (totalHours / (periodMonths * 4)).toFixed(1), [totalHours, periodMonths]);
    const hoursPerDay = useMemo(() => (totalHours / (periodMonths * 30)).toFixed(1), [totalHours, periodMonths]);
    const lessonDistribution = useMemo(
        () => getLessonDistribution(currentLevel, selectedPurposes),
        [currentLevel, selectedPurposes]
    );
    const milestones = useMemo(
        () => generateMilestones(currentLevel, targetLevel, periodMonths, selectedPurposes, t),
        [currentLevel, targetLevel, periodMonths, selectedPurposes, t]
    );

    const chartData = useMemo(() => {
        const points = [];
        for (let i = 0; i <= periodMonths; i++) {
            const progress = i / periodMonths;
            const projectedLevel = currentLevel + ((targetLevel - currentLevel) * progress);
            points.push({
                month: i === 0 ? t.now : `${i}${t.monthsLater}`,
                level: parseFloat(projectedLevel.toFixed(1)),
            });
        }
        return points;
    }, [currentLevel, targetLevel, periodMonths, t]);

    const pieData = useMemo(() => {
        return LESSON_TYPE_ICONS.map((type, idx) => ({
            name: t.lessonTypes[lessonTypeKeys[idx]],
            value: lessonDistribution[type.id as keyof typeof lessonDistribution],
            color: type.color,
        }));
    }, [lessonDistribution, t]);

    const totalGain = targetLevel - currentLevel;

    return (
        <>
        {/* サマリーカード */}
        <Card className="bg-[#6b5ca5] text-white shadow-xl">
            <CardContent className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-center">{t.planSummary}</h2>

                {purposeIcon && purposeLabel && (
                    <div className="flex items-center justify-center gap-2 bg-white/20 rounded-full px-4 py-1.5 mx-auto w-fit">
                        <purposeIcon.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{purposeLabel}</span>
                    </div>
                )}

                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="bg-white/20 rounded-xl p-3">
                        <Clock className="w-5 h-5 mx-auto mb-1 opacity-90" />
                        <p className="text-2xl font-bold">{totalHours}</p>
                        <p className="text-xs opacity-80">{t.totalHours}</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3">
                        <Target className="w-5 h-5 mx-auto mb-1 opacity-90" />
                        <p className="text-2xl font-bold">{hoursPerWeek}</p>
                        <p className="text-xs opacity-80">{t.hoursPerWeek}</p>
                    </div>
                    <div className="bg-white/20 rounded-xl p-3">
                        <TrendingUp className="w-5 h-5 mx-auto mb-1 opacity-90" />
                        <p className="text-2xl font-bold">+{totalGain}</p>
                        <p className="text-xs opacity-80">{t.levelUp}</p>
                    </div>
                </div>

                <div className="flex justify-center items-center gap-4 pt-2">
                    <div className="text-center">
                        <p className="text-sm opacity-80">{t.current}</p>
                        <p className="font-bold text-lg">{getLevelDescription(currentLevel, t)}</p>
                    </div>
                    <div className="text-2xl">→</div>
                    <div className="text-center">
                        <p className="text-sm opacity-80">{t.goal}</p>
                        <p className="font-bold text-lg">{getLevelDescription(targetLevel, t)}</p>
                    </div>
                </div>

                <p className="text-center text-sm opacity-90">
                    {t.dailyStudy}<span className="font-bold">{hoursPerDay}{t.hoursUnit}</span>{t.achievable}
                </p>
            </CardContent>
        </Card>

        {/* 成長グラフ */}
        <Card className="bg-white shadow-lg">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-[#6b5ca5]" />
                    {t.growthChart}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4ddf0" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9b95a6' }} dy={10} />
                        <YAxis domain={[0, 100]} ticks={[10, 30, 50, 70, 90]} tickFormatter={(v) => jlptName(Number(v))} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9b95a6' }} />
                        <Tooltip
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                            formatter={(value) => [getLevelDescription(Number(value), t), t.level]}
                        />
                        <ReferenceLine y={targetLevel} stroke="#10B981" strokeDasharray="3 3" />
                        <Line type="monotone" dataKey="level" stroke="url(#colorGradient)" strokeWidth={3} dot={{ fill: '#6b5ca5', r: 4, strokeWidth: 2, stroke: '#fff' }} />
                        <defs>
                            <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#6b5ca5" />
                                <stop offset="100%" stopColor="#2a6f5a" />
                            </linearGradient>
                        </defs>
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* レッスン配分 */}
        <Card className="bg-white shadow-lg">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-[#6b5ca5]" />
                    {t.lessonDistribution}
                </CardTitle>
                <p className="text-sm text-[#5d5868]">{t.optimizedForYou}</p>
            </CardHeader>
            <CardContent className="p-4">
                <div className="flex items-center gap-4">
                    <div className="w-32 h-32 flex-shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={25} outerRadius={50} paddingAngle={2} dataKey="value">
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="flex-1 space-y-2">
                        {LESSON_TYPE_ICONS.map((type, idx) => {
                            const Icon = type.icon;
                            const percentage = lessonDistribution[type.id as keyof typeof lessonDistribution];
                            return (
                                <div key={type.id} className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${type.color}20` }}>
                                        <Icon className="w-4 h-4" style={{ color: type.color }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between text-sm">
                                            <span className="font-medium">{t.lessonTypes[lessonTypeKeys[idx]]}</span>
                                            <span className="text-[#5d5868]">{percentage}%</span>
                                        </div>
                                        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1">
                                            <div className="h-1.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%`, backgroundColor: type.color }} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-[#6b5ca5]">
                        💡 <strong>{t.whyThisBalance}</strong><br />
                        {getDistributionReason(selectedPurposes, currentLevel, t)}
                    </p>
                </div>
            </CardContent>
        </Card>

        {/* 月別ロードマップ */}
        <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                <Target className="w-5 h-5 text-[#6b5ca5]" />
                {t.monthlyMilestones}
            </h2>

            {milestones.map((milestone) => (
                <Card key={milestone.month} className="bg-white shadow-lg overflow-hidden">
                    <div className="h-1" style={{ backgroundColor: milestone.jlptColor }} />
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: milestone.jlptColor }}>
                                    {milestone.month}
                                </div>
                                <div>
                                    <p className="font-bold text-[#3a3350]">{milestone.month}{t.monthN || t.monthsLater}</p>
                                </div>
                            </div>
                            <Badge className="text-white bg-slate-400" style={{ backgroundColor: milestone.jlptColor }}>
                                {milestone.jlpt}
                            </Badge>
                        </div>

                        {purposeIcon && (
                            <div className="p-3 rounded-lg flex items-start gap-2" style={{ backgroundColor: `${purposeIcon.color}10` }}>
                                <purposeIcon.icon className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: purposeIcon.color }} />
                                <div>
                                    <p className="text-xs font-semibold mb-0.5" style={{ color: purposeIcon.color }}>
                                        {t.purposeStep}
                                    </p>
                                    <p className="text-sm font-medium text-[#3a3350]">
                                        {milestone.purposeMilestone}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-[#484550]">{t.learningContent}</p>
                            <div className="flex flex-wrap gap-2">
                                {milestone.focus.map((item, i) => (
                                    <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm font-semibold text-[#484550]">{t.achievedSkills}</p>
                            <ul className="space-y-1">
                                {milestone.skills.map((skill, i) => (
                                    <li key={i} className="flex items-center gap-2 text-sm text-[#5d5868]">
                                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                        {skill}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-[#5d5868]">
                                <strong className="text-[#484550]">{t.whyThisOrder}</strong><br />
                                {milestone.reason}
                            </p>
                        </div>

                        <div className="space-y-2 pt-2 border-t border-gray-100">
                            <p className="text-sm font-semibold text-[#484550] flex gap-2 items-center">
                                <BookText className="w-4 h-4 text-[#6b5ca5]" /> {t.textbooksLabel}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {milestone.textbooks && milestone.textbooks.map((item: string, i: number) => (
                                    <Badge key={i} variant="outline" className="text-xs bg-white text-gray-700 border-gray-200">
                                        {item}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        {milestone.aiPrompt && (
                            <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => { navigator.clipboard.writeText(milestone.aiPrompt); alert('Prompt copied!'); }}>
                                <div className="flex justify-between items-start mb-1">
                                    <p className="text-xs font-bold text-purple-700 flex gap-1.5 items-center">
                                        <Sparkles className="w-3.5 h-3.5 fill-purple-700" /> {t.aiPromptLabel}
                                    </p>
                                    <p className="text-[10px] text-purple-500 bg-purple-100/50 px-1.5 py-0.5 rounded">Click to Copy</p>
                                </div>
                                <p className="text-sm text-purple-900 leading-relaxed italic">
                                    &quot;{milestone.aiPrompt}&quot;
                                </p>
                            </div>
                        )}


                        <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-sm text-[#5d5868]">{t.recommendedLessons}</span>
                            <span className="font-bold text-[#6b5ca5]">{milestone.lessonsNeeded}{t.lessonsPerMonth}</span>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
        </>
    );
}
