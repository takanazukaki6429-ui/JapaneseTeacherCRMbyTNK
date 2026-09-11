'use client';

/**
 * 生徒に渡すロードマップの表示部分。
 * 先生が選んだ言語で開き、生徒が自分で言語を切り替えられる（11言語）。
 */
import { useState } from 'react';
import { type Locale, locales, getTranslations } from '@/app/(main)/roadmap/i18n';
import { RoadmapResult } from '@/components/roadmap/RoadmapResult';
import type { RoadmapInput } from '@/lib/roadmap/from-student';

type Props = {
    studentName: string;
    teacherName: string | null;
    input: RoadmapInput;
    initialLocale: Locale;
};

export function RoadmapView({ studentName, teacherName, input, initialLocale }: Props) {
    const [locale, setLocale] = useState<Locale>(initialLocale);
    const t = getTranslations(locale);

    return (
        <div className="min-h-screen bg-[#faf9fd]">
            <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6 pb-16">
                <div className="flex justify-end">
                    <label htmlFor="roadmap-locale" className="sr-only">Language</label>
                    <select
                        id="roadmap-locale"
                        value={locale}
                        onChange={e => setLocale(e.target.value as Locale)}
                        className="text-sm border border-[#e4e1e8] rounded-full px-3 py-1.5 bg-white shadow-sm"
                    >
                        {(Object.entries(locales) as [Locale, { flag: string; name: string }][]).map(([key, val]) => (
                            <option key={key} value={key}>{val.flag} {val.name}</option>
                        ))}
                    </select>
                </div>

                <div className="text-center space-y-1">
                    <p className="text-2xl font-bold text-[#020817]">{studentName}</p>
                    <h1 className="text-lg font-bold text-[#2563eb]">{t.title}</h1>
                    {teacherName && <p className="text-sm text-[#64748b]">🧑‍🏫 {teacherName}</p>}
                </div>

                <RoadmapResult
                    t={t}
                    currentLevel={input.currentLevel}
                    targetLevel={input.targetLevel}
                    periodMonths={input.periodMonths}
                    selectedPurposes={input.purposeIds}
                />
            </div>
        </div>
    );
}
