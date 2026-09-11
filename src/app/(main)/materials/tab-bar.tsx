'use client';

import { useRouter } from 'next/navigation';
import { User, Globe, BookOpen } from 'lucide-react';

type Props = { currentTab: string };

export function MaterialsTabBar({ currentTab }: Props) {
    const router = useRouter();
    return (
        <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] w-fit">
            <button
                onClick={() => router.push('/materials/textbook')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab === 'textbook'
                        ? 'bg-[#f8e8e7] text-[#9c4f5a] font-bold'
                        : 'text-[#534344] hover:text-[#3b2e2a] hover:bg-[#f1ebe1]'
                }`}
            >
                <BookOpen size={14} />教科書
            </button>
            <button
                onClick={() => router.push('/materials?tab=mine')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab !== 'community' && currentTab !== 'textbook'
                        ? 'bg-[#f8e8e7] text-[#9c4f5a] font-bold'
                        : 'text-[#534344] hover:text-[#3b2e2a] hover:bg-[#f1ebe1]'
                }`}
            >
                <User size={14} />自分の教材
            </button>
            <button
                onClick={() => router.push('/materials?tab=community')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab === 'community'
                        ? 'bg-[#f8e8e7] text-[#9c4f5a] font-bold'
                        : 'text-[#534344] hover:text-[#3b2e2a] hover:bg-[#f1ebe1]'
                }`}
            >
                <Globe size={14} />みんなの教材
            </button>
        </div>
    );
}
