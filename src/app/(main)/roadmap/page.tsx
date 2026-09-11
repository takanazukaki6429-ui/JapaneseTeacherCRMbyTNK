"use client"

import { useState, useRef, useEffect } from 'react';
import { domToBlob } from 'modern-screenshot';
import { Share2, Loader2, GraduationCap, ChevronDown } from 'lucide-react';
// import { toast } from 'sonner'; // Using basic alert for now if sonner setup is complex, or standard toast
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { type Locale, locales, getTranslations, detectLocale } from './i18n';

// Shared Library Imports
import { PURPOSE_ICONS } from '@/lib/roadmap/constants';
import { type PurposeId } from '@/lib/roadmap/types';
import { getLevelDescription } from '@/lib/roadmap/generators';
import { RoadmapResult } from '@/components/roadmap/RoadmapResult';

// Simple toast replacement
const toast = {
    success: (msg: string) => alert(msg),
    error: (msg: string) => alert(msg),
};


// ===== コンポーネント =====

export default function JapaneseRoadmapPage() {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isSharing, setIsSharing] = useState(false);
    const [showRoadmap, setShowRoadmap] = useState(false);
    const [locale, setLocale] = useState<Locale>('ja');
    const [langMenuOpen, setLangMenuOpen] = useState(false);

    const [currentLevel, setCurrentLevel] = useState(20);
    const [selectedPurposes, setSelectedPurposes] = useState<PurposeId[]>([]);
    const [targetLevel, setTargetLevel] = useState(70);
    const [periodMonths, setPeriodMonths] = useState(6);

    // Detect browser language on mount
    useEffect(() => { setLocale(detectLocale()); }, []);

    const t = getTranslations(locale);

    // Toggle handler for multi-select
    const togglePurpose = (pid: PurposeId) => {
        setSelectedPurposes(prev => {
            if (prev.includes(pid)) {
                return prev.filter(p => p !== pid);
            } else {
                return [...prev, pid];
            }
        });
    };

    const purposeDesc = selectedPurposes.length > 0
        ? (selectedPurposes.length === 1
            ? t.purposes[selectedPurposes[0] as keyof typeof t.purposes]?.description
            : t.distributionReasons.other.advanced)
        : null;

    const handleShare = async () => {
        if (!contentRef.current) return;
        setIsSharing(true);
        try {
            const blob = await domToBlob(contentRef.current, { scale: 2, backgroundColor: '#ffffff' });
            if (!blob) { toast.error(t.imageError); setIsSharing(false); return; }
            const file = new File([blob], "japanese_roadmap.png", { type: "image/png" });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file], title: t.title, text: `${periodMonths}${t.months}: ${getLevelDescription(currentLevel, t)} → ${getLevelDescription(targetLevel, t)}` });
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
            toast.error(t.errorOccurred);
        } finally { setIsSharing(false); }
    };

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
                    <h1 className="text-2xl font-bold text-slate-800">{t.title}</h1>
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
                            </div>
                            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-lg text-slate-800">{getLevelDescription(currentLevel, t)}</span>
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
                                return (
                                    <button
                                        type="button"
                                        key={pid}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
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
                                <span className="text-slate-600 leading-relaxed flex-1">{purposeDesc}</span>
                            </div>
                        )}
                    </div>

                    {/* 目標レベル */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <label className="text-sm font-bold text-slate-700">{t.targetLevel}</label>
                            </div>
                            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                                <span className="font-bold text-lg text-teal-600">{getLevelDescription(targetLevel, t)}</span>
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
                    <RoadmapResult t={t} currentLevel={currentLevel} targetLevel={targetLevel} periodMonths={periodMonths} selectedPurposes={selectedPurposes} />

                    {/* CTA */}
                    {/* Removed some CTA parts that might be too much for a management tool, keeping Share */}
                    <Card
                        className="text-white border-none"
                        style={{ backgroundColor: '#2563eb', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)' }}
                    >
                        <CardContent className="p-6 text-center space-y-4">
                            <Button
                                onClick={handleShare}
                                disabled={isSharing}
                                className="w-full text-white font-bold"
                                style={{ backgroundColor: '#06C755' }}
                                size="lg"
                            >
                                {isSharing ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        {t.generating}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">
                                        <Share2 className="w-5 h-5" />
                                        {t.shareThisPlan}
                                    </span>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}
