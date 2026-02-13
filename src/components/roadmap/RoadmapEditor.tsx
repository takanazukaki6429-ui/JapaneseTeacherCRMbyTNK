'use client';

import React, { useState, useMemo, useRef } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
    Label
} from 'recharts';
import { BookOpen, Target, Calendar, Download, Share2, Sparkles, Save, ArrowLeft } from 'lucide-react';
import { domToPng } from 'modern-screenshot';

// --- Types ---
export type RoadmapData = {
    currentLevel: string;
    targetLevel: string;
    purpose: string;
    periodMonths: number;
    generatedAt?: string;
};

// --- Initial Data / Constants ---
const JLPT_LEVELS = ['Zero', 'N5', 'N4', 'N3', 'N2', 'N1'] as const;
type JlptLevel = typeof JLPT_LEVELS[number];

const LEVEL_SCORES: Record<JlptLevel, number> = {
    'Zero': 0,
    'N5': 20,
    'N4': 40,
    'N3': 60,
    'N2': 80,
    'N1': 100
};

const PURPOSES = [
    { id: 'business', label: 'ビジネス就職・昇進', icon: '💼' },
    { id: 'daily', label: '日本での生活・移住', icon: '🏠' },
    { id: 'hobby', label: 'アニメ・漫画・文化', icon: '🎨' },
    { id: 'academic', label: '留学・進学', icon: '🎓' },
    { id: 'other', label: 'その他', icon: '✨' }
] as const;

// --- Helper Functions (Logic) ---
const getEstimatedMonths = (start: JlptLevel, end: JlptLevel): number => {
    const startIndex = JLPT_LEVELS.indexOf(start);
    const endIndex = JLPT_LEVELS.indexOf(end);
    if (startIndex >= endIndex) return 0;

    // Simple logic: 1 level up takes ~6 months (just a placeholder heuristic)
    return (endIndex - startIndex) * 6;
};

const generateMilestones = (start: JlptLevel, end: JlptLevel, months: number, purpose: string) => {
    const startIndex = JLPT_LEVELS.indexOf(start);
    const endIndex = JLPT_LEVELS.indexOf(end);
    if (startIndex >= endIndex || months <= 0) return [];

    const milestones = [];
    const stepScore = (LEVEL_SCORES[end] - LEVEL_SCORES[start]) / months;

    // Cultural/Purpose nuances
    let focusTopic = '';
    switch (purpose) {
        case 'business': focusTopic = '敬語・メール・商習慣'; break;
        case 'daily': focusTopic = '役所・病院・スーパー'; break;
        case 'hobby': focusTopic = '推しの言葉・サブカル'; break;
        case 'academic': focusTopic = '論文・レポート・面接'; break;
        default: focusTopic = '基礎固め';
    }

    for (let i = 0; i <= months; i++) {
        const currentScore = LEVEL_SCORES[start] + (stepScore * i);
        let levelLabel = '';

        // Determine approximate JLPT level label for this month
        if (currentScore < 20) levelLabel = 'Intro';
        else if (currentScore < 40) levelLabel = 'N5';
        else if (currentScore < 60) levelLabel = 'N4';
        else if (currentScore < 80) levelLabel = 'N3';
        else if (currentScore < 100) levelLabel = 'N2';
        else levelLabel = 'N1';

        milestones.push({
            month: i,
            score: Math.min(100, Math.round(currentScore)),
            label: levelLabel,
            focus: i === 0 ? 'Start' : i === months ? 'Goal!' : `Month ${i}`,
            detail: i % 3 === 0 ? `${focusTopic} (Step ${i / 3 + 1})` : '継続学習'
        });
    }
    return milestones;
};

// --- Component Props ---
type RoadmapEditorProps = {
    initialData?: Partial<RoadmapData>;
    onSave?: (data: RoadmapData) => Promise<void>;
    onCancel?: () => void;
    mode?: 'standalone' | 'student';
    studentName?: string;
};

export default function RoadmapEditor({
    initialData,
    onSave,
    onCancel,
    mode = 'standalone',
    studentName
}: RoadmapEditorProps) {
    // --- State ---
    const [currentLevel, setCurrentLevel] = useState<JlptLevel>((initialData?.currentLevel as JlptLevel) || 'Zero');
    const [targetLevel, setTargetLevel] = useState<JlptLevel>((initialData?.targetLevel as JlptLevel) || 'N2');
    const [selectedPurpose, setSelectedPurpose] = useState<string>(initialData?.purpose || 'business');
    const [periodMonths, setPeriodMonths] = useState<number>(initialData?.periodMonths || 12);

    const [isSaving, setIsSaving] = useState(false);
    const captureRef = useRef<HTMLDivElement>(null);

    // --- Derived State ---
    const chartData = useMemo(() =>
        generateMilestones(currentLevel, targetLevel, periodMonths, selectedPurpose),
        [currentLevel, targetLevel, periodMonths, selectedPurpose]
    );

    const recommendedTextbooks = useMemo(() => {
        if (targetLevel === 'N5' || targetLevel === 'N4') return 'GENKI I/II, Minna no Nihongo';
        if (targetLevel === 'N3') return 'Tobira, Soumatome N3';
        if (targetLevel === 'N2' || targetLevel === 'N1') return 'Shin Kanzen Master, News Web Easy';
        return 'Custom Materials';
    }, [targetLevel]);

    const handleAutoPeriod = () => {
        const estimated = getEstimatedMonths(currentLevel, targetLevel);
        if (estimated > 0) setPeriodMonths(estimated);
    };

    const handleDownload = async () => {
        if (captureRef.current) {
            try {
                const dataUrl = await domToPng(captureRef.current, { cacheBust: true });
                const link = document.createElement('a');
                link.download = `roadmap_${new Date().toISOString()}.png`;
                link.href = dataUrl;
                link.click();
            } catch (err) {
                console.error('Failed to capture screenshot', err);
            }
        }
    };

    const handleSave = async () => {
        if (onSave) {
            setIsSaving(true);
            try {
                await onSave({
                    currentLevel,
                    targetLevel,
                    purpose: selectedPurpose,
                    periodMonths
                });
            } catch (error) {
                console.error('Save failed', error);
                alert('保存に失敗しました');
            } finally {
                setIsSaving(false);
            }
        }
    };

    return (
        <div className="space-y-8">
            {/* Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Target className="text-teal-500" />
                        学習プラン設定
                    </h2>
                    {mode === 'student' && onCancel && (
                        <button
                            onClick={onCancel}
                            className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm font-bold"
                        >
                            <ArrowLeft size={16} /> キャンセル
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Current Level */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">現在のレベル (Start)</label>
                        <div className="flex flex-wrap gap-2">
                            {JLPT_LEVELS.map(level => (
                                <button
                                    key={`start-${level}`}
                                    onClick={() => setCurrentLevel(level)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${currentLevel === level
                                        ? 'bg-slate-800 text-white shadow-md scale-105'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Level */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">目標レベル (Goal)</label>
                        <div className="flex flex-wrap gap-2">
                            {JLPT_LEVELS.map(level => (
                                <button
                                    key={`target-${level}`}
                                    onClick={() => setTargetLevel(level)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-bold transition-all ${targetLevel === level
                                        ? 'bg-teal-600 text-white shadow-md scale-105'
                                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                        }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Period */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">期間 (Months)</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                min="1"
                                max="36"
                                value={periodMonths}
                                onChange={(e) => setPeriodMonths(Number(e.target.value))}
                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                            />
                            <span className="font-bold text-slate-700 w-12 text-right">{periodMonths}ヶ月</span>
                        </div>
                        <button
                            onClick={handleAutoPeriod}
                            className="text-xs text-teal-600 font-bold hover:underline mt-1 flex items-center gap-1"
                        >
                            <Sparkles size={12} /> 自動計算
                        </button>
                    </div>

                    {/* Purpose */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">学習目的</label>
                        <select
                            value={selectedPurpose}
                            onChange={(e) => setSelectedPurpose(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                            {PURPOSES.map(p => (
                                <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Actions for Saving/Sharing */}
            {mode === 'student' && onSave && (
                <div className="flex justify-end animate-in fade-in slide-in-from-bottom-4">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <span className="animate-spin">⏳</span> : <Save size={20} />}
                        生徒プロフィールに保存する
                    </button>
                </div>
            )}

            {/* Visual Output (To be captured) */}
            <div ref={captureRef} className="bg-gradient-to-br from-white to-slate-50 p-8 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <Target size={200} />
                </div>

                {/* Header of the Sheet */}
                <div className="flex justify-between items-end mb-8 relative z-10">
                    <div>
                        <p className="text-teal-600 font-bold tracking-widest text-xs mb-1 uppercase">Japanese Learning Roadmap</p>
                        <h1 className="text-3xl font-extrabold text-slate-900 leading-tight">
                            {studentName ? `${studentName}さんの` : ''}学習ロードマップ
                        </h1>
                        <p className="text-slate-500 text-sm mt-2 flex items-center gap-2">
                            From <span className="font-bold text-slate-800 bg-slate-200 px-2 py-0.5 rounded text-xs">{currentLevel}</span>
                            to <span className="font-bold text-white bg-teal-600 px-2 py-0.5 rounded text-xs">{targetLevel}</span>
                            in {periodMonths} Months
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-slate-100 shadow-sm">
                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">Focus</p>
                            <p className="text-slate-800 font-bold flex items-center gap-2">
                                <span>{PURPOSES.find(p => p.id === selectedPurpose)?.icon}</span>
                                {PURPOSES.find(p => p.id === selectedPurpose)?.label}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chart */}
                <div className="h-[300px] w-full mb-8 relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis
                                dataKey="month"
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(val) => `${val}mo`}
                            />
                            <YAxis
                                domain={[0, 100]}
                                stroke="#94a3b8"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                ticks={[0, 20, 40, 60, 80, 100]}
                                tickFormatter={(val) => {
                                    const entry = Object.entries(LEVEL_SCORES).find(([_, result]) => result === val);
                                    return entry ? entry[0] : '';
                                }}
                            />
                            <Tooltip
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <ReferenceLine y={LEVEL_SCORES[targetLevel]} stroke="#0d9488" strokeDasharray="3 3" label={{ position: 'right', value: 'GOAL', fill: '#0d9488', fontSize: 10, fontWeight: 'bold' }} />
                            <Line
                                type="monotone"
                                dataKey="score"
                                stroke="#0d9488"
                                strokeWidth={4}
                                dot={{ fill: '#white', stroke: '#0d9488', strokeWidth: 2, r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Key Milestones & Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    <div className="bg-white/60 backdrop-blur-sm p-4 rounded-xl border border-white shadow-sm">
                        <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                            <Calendar size={16} className="text-teal-500" />
                            Monthly Milestones
                        </h3>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                            {chartData.filter(d => d.month > 0 && d.month % 3 === 0).map((d) => (
                                <div key={d.month} className="flex items-center text-sm">
                                    <span className="w-12 font-bold text-slate-400">{d.month}mo</span>
                                    <div className="flex-1 border-b border-dotted border-slate-300 mx-2"></div>
                                    <span className="font-bold text-slate-700">{d.label} Level</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-indigo-50/60 backdrop-blur-sm p-4 rounded-xl border border-indigo-100 shadow-sm">
                        <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-sm">
                            <BookOpen size={16} className="text-indigo-500" />
                            Recommended Textbooks
                        </h3>
                        <p className="text-indigo-800 font-medium text-sm">
                            {recommendedTextbooks}
                        </p>
                        <div className="mt-4 pt-4 border-t border-indigo-200">
                            <p className="text-xs text-indigo-400 font-bold uppercase mb-1">AI Suggestion</p>
                            <p className="text-xs text-indigo-700">
                                {PURPOSES.find(p => p.id === selectedPurpose)?.label}向けの特別カリキュラムを適用中。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Download Button (Only visible in standalone or implementation allowing download) */}
            <div className="flex justify-center pt-4">
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-medium text-sm transition-colors"
                >
                    <Download size={16} />
                    画像をダウンロード
                </button>
            </div>
        </div>
    );
}
