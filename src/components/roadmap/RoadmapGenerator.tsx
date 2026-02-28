"use client"

import { useState, useMemo, useRef, useEffect } from 'react';
import { domToBlob } from 'modern-screenshot';
import { Share2, Loader2, BookOpen, Clock, Target, TrendingUp, CheckCircle2, BookText, Sparkles, ChevronDown, Save, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, PieChart, Pie, Cell } from 'recharts';
import { type Locale, locales, getTranslations, detectLocale } from '@/app/(main)/roadmap/i18n';

// Shared Library Imports
import { PURPOSE_ICONS, LESSON_TYPE_ICONS } from '@/lib/roadmap/constants';
import { type PurposeId, type Milestone } from '@/lib/roadmap/types';
import { getLessonDistribution, calculateTotalHours } from '@/lib/roadmap/calculations';
import { generateMilestones, getLevelDescription, getDistributionReason } from '@/lib/roadmap/generators';

import { toast } from 'sonner';
import { showAppError } from '@/lib/error-handler';

// ===== ロジック関数 =====

// ===== ロジック関数 (Extracted to src/lib/roadmap) =====

const lessonTypeKeys = ['grammar', 'vocabulary', 'conversation', 'reading', 'listening'] as const;

// ===== コンポーネント =====

type RoadmapGeneratorProps = {
    initialLevel?: number;
    initialTarget?: number;
    initialPurpose?: string | string[]; // Can be string (legacy) or array
    onSave?: (data: {
        currentLevel: number;
        targetLevel: number;
        purposeId: string; // Comma separated IDs
        purposeLabel: string; // Comma separated Labels
        periodMonths: number;
        milestones: Milestone[];
    }) => Promise<void>;
    studentName?: string;
};

export default function RoadmapGenerator({
    initialLevel = 20,
    initialTarget = 70,
    initialPurpose,
    onSave,
    studentName
}: RoadmapGeneratorProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showRoadmap, setShowRoadmap] = useState(false);
    const [locale, setLocale] = useState<Locale>('ja');
    const [langMenuOpen, setLangMenuOpen] = useState(false);

    // State for multiple purposes
    const [currentLevel, setCurrentLevel] = useState(initialLevel);

    // Parse initial purpose
    const parseInitialPurpose = (init: string | string[] | undefined): PurposeId[] => {
        if (!init) return [];
        if (Array.isArray(init)) return init as PurposeId[];
        // Check if comma separated
        if (init.includes(',')) return init.split(',') as PurposeId[];
        // Legacy single string
        return [init as PurposeId];
    };

    const [selectedPurposes, setSelectedPurposes] = useState<PurposeId[]>(parseInitialPurpose(initialPurpose));

    // Legacy mapping (just take first one for consistent icon color if needed, or mix)
    // We'll use the *last* selected one for the "Main" color focus or just specific logic

    const [targetLevel, setTargetLevel] = useState(initialTarget);
    const [periodMonths, setPeriodMonths] = useState(6);

    // Detect browser language on mount
    useEffect(() => { setLocale(detectLocale()); }, []);

    const t = getTranslations(locale);

    // Helper to get labels
    const getPurposeLabel = (pids: PurposeId[]) => {
        if (pids.length === 0) return "";
        return pids.map(pid => t.purposes[pid as keyof typeof t.purposes]?.label || pid).join(' & ');
    };

    // Toggle handler
    const togglePurpose = (pid: PurposeId) => {
        setSelectedPurposes(prev => {
            if (prev.includes(pid)) {
                return prev.filter(p => p !== pid);
            } else {
                return [...prev, pid];
            }
        });
    };

    const purposeLabel = getPurposeLabel(selectedPurposes);
    const purposeDesc = selectedPurposes.length > 0
        ? (selectedPurposes.length === 1
            ? t.purposes[selectedPurposes[0] as keyof typeof t.purposes]?.description
            : t.distributionReasons.other.advanced) // Generic description for mixed
        : null;

    // Get primary color/icon from the first selected purpose for UI consistency
    const primaryPurpose = selectedPurposes.length > 0 ? selectedPurposes[0] : null;
    const purposeIcon = primaryPurpose ? PURPOSE_ICONS[primaryPurpose] : null;

    const handleShare = async () => {
        if (!contentRef.current) return;
        setIsSharing(true);
        try {
            const blob = await domToBlob(contentRef.current, { scale: 2, backgroundColor: '#ffffff' });
            if (!blob) { showAppError(new Error(t.imageError), t.imageError); setIsSharing(false); return; }
            const file = new File([blob], "japanese_roadmap.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: t.title, text: `${periodMonths}${t.months} +${(targetLevel - currentLevel)}Lv` });
                    toast.success(t.shareOpened);
                } catch (err) { console.error("Share failed", err); }
            } else {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.download = 'japanese_roadmap.png';
                link.href = url;
                link.click();
                URL.revokeObjectURL(url);
                toast.success(t.downloaded);
            }
        } catch (error) {
            console.error("Capture failed", error);
            showAppError(error, t.errorOccurred);
        } finally { setIsSharing(false); }
    };

    const handleSaveProfile = async () => {
        if (onSave && selectedPurposes.length > 0) {
            setIsSaving(true);
            try {
                await onSave({
                    currentLevel,
                    targetLevel,
                    purposeId: selectedPurposes.join(','), // Save as comma separated
                    purposeLabel: purposeLabel || '',
                    periodMonths,
                    milestones
                });
            } finally {
                setIsSaving(false);
            }
        }
    };

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
    const canGenerate = selectedPurposes.length > 0 && totalGain > 0;

    const purposeKeys = Object.keys(PURPOSE_ICONS) as PurposeId[];

    return (
        <div ref={contentRef} className="space-y-6 pb-20">
            <div className="text-center space-y-2 pt-2 relative">
                {/* Language Switcher */}
                <div className="absolute right-0 top-0 z-20">
                    <button
                        onClick={() => setLangMenuOpen(!langMenuOpen)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/80 backdrop-blur border border-slate-200 shadow-sm text-sm hover:bg-slate-50 transition-all text-slate-600"
                    >
                        <span>{locales[locale]?.flag}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    </button>
                    {langMenuOpen && (
                        <div className="absolute right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden min-w-[140px] z-30">
                            {(Object.entries(locales) as [Locale, { flag: string; name: string }][]).map(([key, val]) => (
                                <button
                                    key={key}
                                    onClick={() => { setLocale(key); setLangMenuOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-teal-50 transition-colors text-left ${locale === key ? 'bg-teal-50 font-semibold text-teal-700' : 'text-slate-600'}`}
                                >
                                    <span>{val.flag}</span>
                                    <span>{val.name}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center justify-center gap-2">
                    <div className="p-2 bg-teal-100 text-teal-600 rounded-xl">
                        <GraduationCap className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        {studentName ? `${studentName}さんの` : ''}{t.title}
                    </h1>
                </div>
                <p className="text-sm text-slate-500">{t.subtitle}</p>
            </div>

            {/* 入力フォーム */}
            <Card className="bg-white shadow-sm border border-slate-200 rounded-xl">
                <CardContent className="p-6 space-y-8">
                    {/* 現在のレベル */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <label className="text-sm font-bold text-slate-700">{t.currentLevel}</label>
                                <p className="text-xs text-slate-500 mt-0.5">{getLevelDescription(currentLevel, t)}</p>
                            </div>
                            <div className="flex items-baseline gap-1 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                <Input
                                    type="number"
                                    value={currentLevel}
                                    onChange={(e) => setCurrentLevel(Math.min(100, Math.max(0, Number(e.target.value))))}
                                    className="w-12 text-right font-bold text-lg h-auto p-0 border-none bg-transparent focus-visible:ring-0 text-slate-800"
                                />
                                <span className="text-xs text-slate-400 font-medium">Lv</span>
                            </div>
                        </div>
                        <Slider
                            value={[currentLevel]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(val) => setCurrentLevel(val[0])}
                            className="py-2"
                        />
                        <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                            <span>0 ({t.beginner})</span>
                            <span>50 (N3)</span>
                            <span>100 ({t.native})</span>
                        </div>
                    </div>

                    {/* 日本語を学ぶ目的 */}
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-700">{t.purpose}</label>
                        <div className="grid grid-cols-3 gap-3">
                            {purposeKeys.map((pid) => {
                                const pIcon = PURPOSE_ICONS[pid];
                                const Icon = pIcon.icon;
                                const isSelected = selectedPurposes.includes(pid);
                                const pLabel = t.purposes[pid as keyof typeof t.purposes]?.label || pid;
                                // Use consistent teal for selection, keep icon colors
                                return (
                                    <button
                                        type="button" // Explicitly prevent form submission
                                        key={pid}
                                        onClick={(e) => {
                                            e.preventDefault(); // Prevent default behavior
                                            e.stopPropagation(); // Stop propagation
                                            togglePurpose(pid);
                                        }}
                                        className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 text-center relative overflow-hidden group ${isSelected
                                            ? 'border-teal-500 bg-teal-50/50 shadow-sm'
                                            : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
                                            }`}
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-white' : 'bg-slate-100 group-hover:bg-white'
                                                }`}
                                        >
                                            <Icon className="w-5 h-5" style={{ color: pIcon.color }} />
                                        </div>
                                        <span
                                            className={`text-xs font-bold leading-tight ${isSelected ? 'text-teal-700' : 'text-slate-500'
                                                }`}
                                        >
                                            {pLabel}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-teal-500">
                                                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedPurposes.length > 0 && (
                            <div
                                className="flex items-start gap-3 p-3 rounded-lg text-sm bg-slate-50 border border-slate-100"
                            >
                                <div className="flex -space-x-2 mr-1">
                                    {selectedPurposes.slice(0, 3).map(pid => {
                                        const i = PURPOSE_ICONS[pid];
                                        return (
                                            <div key={pid} className="w-6 h-6 rounded-full border-2 border-white bg-white flex items-center justify-center relative z-10">
                                                <i.icon className="w-3.5 h-3.5" style={{ color: i.color }} />
                                            </div>
                                        )
                                    })}
                                    {selectedPurposes.length > 3 && (
                                        <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] text-slate-500 font-bold relative z-10">
                                            +{selectedPurposes.length - 3}
                                        </div>
                                    )}
                                </div>
                                <span className="text-slate-600 leading-relaxed flex-1">
                                    {purposeDesc || t.whyThisBalance}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 目標レベル */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <label className="text-sm font-bold text-slate-700">{t.targetLevel}</label>
                                <p className="text-xs text-slate-500 mt-0.5">{getLevelDescription(targetLevel, t)}</p>
                            </div>
                            <div className="flex items-baseline gap-1 bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-100">
                                <Input
                                    type="number"
                                    value={targetLevel}
                                    onChange={(e) => setTargetLevel(Math.min(100, Math.max(0, Number(e.target.value))))}
                                    className="w-12 text-right font-bold text-lg h-auto p-0 border-none bg-transparent focus-visible:ring-0 text-teal-700"
                                />
                                <span className="text-xs text-teal-500 font-medium">Lv</span>
                            </div>
                        </div>
                        <Slider
                            value={[targetLevel]}
                            min={0}
                            max={100}
                            step={1}
                            onValueChange={(val) => setTargetLevel(val[0])}
                            className="py-2"
                        />
                        <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                            <span>0 ({t.beginner})</span>
                            <span>50 (N3)</span>
                            <span>100 ({t.native})</span>
                        </div>
                    </div>

                    {/* 学習期間 */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-bold text-slate-700">{t.learningPeriod}</label>
                            <span className="font-bold text-lg text-slate-700">{periodMonths}<span className="text-sm font-normal text-slate-500 ml-0.5">{t.monthUnit}</span></span>
                        </div>
                        <Slider value={[periodMonths]} min={1} max={12} step={1} onValueChange={(val) => setPeriodMonths(val[0])} className="py-2" />
                        <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                            <span>1{t.monthUnit}</span>
                            <span>6{t.monthUnit}</span>
                            <span>12{t.monthUnit}</span>
                        </div>
                    </div>

                    <Button
                        size="lg"
                        className="w-full font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-200 transition-all h-12 text-base rounded-xl"
                        disabled={!canGenerate}
                        onClick={() => setShowRoadmap(true)}
                    >
                        {t.createRoadmap}
                    </Button>
                    {!canGenerate && selectedPurposes.length === 0 && (
                        <p className="text-xs text-center text-rose-500 font-medium bg-rose-50 py-1 rounded">{t.selectPurpose}</p>
                    )}
                </CardContent>
            </Card>


            {showRoadmap && (
                <>
                    {/* サマリーカード */}
                    <Card className="bg-gradient-to-br from-[#2563eb] to-[#7c3aed] text-white shadow-xl">
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
                                <TrendingUp className="w-5 h-5 text-[#2563eb]" />
                                {t.growthChart}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} dy={10} />
                                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                                        formatter={(value) => [`Lv.${value}`, t.level]}
                                    />
                                    <ReferenceLine y={targetLevel} stroke="#10B981" strokeDasharray="3 3" />
                                    <Line type="monotone" dataKey="level" stroke="url(#colorGradient)" strokeWidth={3} dot={{ fill: '#2563eb', r: 4, strokeWidth: 2, stroke: '#fff' }} />
                                    <defs>
                                        <linearGradient id="colorGradient" x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#2563eb" />
                                            <stop offset="100%" stopColor="#7c3aed" />
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
                                <BookOpen className="w-5 h-5 text-[#2563eb]" />
                                {t.lessonDistribution}
                            </CardTitle>
                            <p className="text-sm text-[#64748b]">{t.optimizedForYou}</p>
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
                                                        <span className="text-[#64748b]">{percentage}%</span>
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
                                <p className="text-sm text-[#2563eb]">
                                    💡 <strong>{t.whyThisBalance}</strong><br />
                                    💡 <strong>{t.whyThisBalance}</strong><br />
                                    {getDistributionReason(selectedPurposes, currentLevel, t)}
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 月別ロードマップ */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-bold flex items-center gap-2 px-1">
                            <Target className="w-5 h-5 text-[#2563eb]" />
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
                                                <p className="font-bold text-[#020817]">{milestone.month}{t.monthN}</p>
                                                <p className="text-xs text-[#64748b]">{t.targetLevelLabel}: Lv.{milestone.level}</p>
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
                                                <p className="text-sm font-medium text-[#020817]">
                                                    {milestone.purposeMilestone}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-[#4b5563]">{t.learningContent}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {milestone.focus.map((item: string, i: number) => (
                                                <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <p className="text-sm font-semibold text-[#4b5563]">{t.achievedSkills}</p>
                                        <ul className="space-y-1">
                                            {milestone.skills.map((skill: string, i: number) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-[#64748b]">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                    {skill}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div className="p-3 bg-gray-50 rounded-lg">
                                        <p className="text-sm text-[#64748b]">
                                            <strong className="text-[#4b5563]">{t.whyThisOrder}</strong><br />
                                            {milestone.reason}
                                        </p>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-gray-100">
                                        <p className="text-sm font-semibold text-[#4b5563] flex gap-2 items-center">
                                            <BookText className="w-4 h-4 text-[#2563eb]" /> {t.textbooksLabel}
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
                                        <div className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-100 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => { navigator.clipboard.writeText(milestone.aiPrompt); toast.success('Prompt copied!'); }}>
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
                                        <span className="text-sm text-[#64748b]">{t.recommendedLessons}</span>
                                        <span className="font-bold text-[#2563eb]">{milestone.lessonsNeeded}{t.lessonsPerMonth}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* CTA Actions */}
                    <Card
                        className="text-white border-none sticky bottom-4 z-50 overflow-hidden shadow-2xl"
                        style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0' }}
                    >
                        <CardContent className="p-4 flex gap-3">
                            {onSave && (
                                <Button
                                    onClick={handleSaveProfile}
                                    disabled={isSaving}
                                    className="flex-1 font-bold text-white shadow-lg transition-all hover:scale-[1.02]"
                                    style={{ backgroundColor: '#2563eb' }}
                                    size="lg"
                                >
                                    {isSaving ? (
                                        <span className="flex items-center gap-2">
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            保存中...
                                        </span>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            <Save className="w-5 h-5" />
                                            プロフィールに保存
                                        </span>
                                    )}
                                </Button>
                            )}

                            <Button
                                onClick={handleShare}
                                disabled={isSharing}
                                className={`${onSave ? 'w-16 px-0' : 'w-full'} font-bold text-white shadow-lg transition-all hover:scale-[1.02]`}
                                style={{ backgroundColor: '#06C755' }}
                                size="lg"
                                title={t.shareThisPlan}
                            >
                                {isSharing ? (
                                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                ) : (
                                    <Share2 className="w-5 h-5 mx-auto" />
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
