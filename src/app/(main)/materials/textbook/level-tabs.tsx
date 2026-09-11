'use client';

import { useRouter } from 'next/navigation';
import type { JlptLevel } from '@/types/master-material';

const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2'];

type Props = { current: JlptLevel; counts: Record<string, number> };

export function LevelTabs({ current, counts }: Props) {
    const router = useRouter();
    return (
        <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] w-fit">
            {LEVELS.map(level => (
                <button
                    key={level}
                    onClick={() => router.push(`/materials/textbook?level=${level}`)}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        current === level
                            ? 'bg-[#f8e8e7] text-[#9c4f5a] font-bold'
                            : 'text-[#534344] hover:text-[#3b2e2a] hover:bg-[#f1ebe1]'
                    }`}
                >
                    {level}
                    {counts[level] ? (
                        <span className="text-[11px] opacity-70">{counts[level]}課</span>
                    ) : null}
                </button>
            ))}
        </div>
    );
}
