'use client';

import { useRouter } from 'next/navigation';
import { User, Globe, BookOpen, Lock, Plane } from 'lucide-react';

/** communityLocked：ライトでは みんなの教材 を見られない（2026-10-04 かずき決定）。タブは出したまま鍵を付ける */
type Props = { currentTab: string; communityLocked?: boolean };

export function MaterialsTabBar({ currentTab, communityLocked = false }: Props) {
    const router = useRouter();
    return (
        <div className="flex flex-wrap gap-1 bg-white p-1 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] w-fit max-w-full">
            <button
                onClick={() => router.push('/materials/textbook')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab === 'textbook'
                        ? 'bg-[#efe9ff] text-[#6b5ca5] font-bold'
                        : 'text-[#484550] hover:text-[#3a3350] hover:bg-[#f0ebf8]'
                }`}
            >
                <BookOpen size={14} />教科書
            </button>
            {/* 旅行（2026-10-09 かずき決定・9-2）：全員に見せる */}
            <button
                onClick={() => router.push('/materials/travel')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab === 'travel'
                        ? 'bg-[#efe9ff] text-[#6b5ca5] font-bold'
                        : 'text-[#484550] hover:text-[#3a3350] hover:bg-[#f0ebf8]'
                }`}
            >
                <Plane size={14} />旅行
            </button>
            <button
                onClick={() => router.push('/materials?tab=mine')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab !== 'community' && currentTab !== 'textbook' && currentTab !== 'travel'
                        ? 'bg-[#efe9ff] text-[#6b5ca5] font-bold'
                        : 'text-[#484550] hover:text-[#3a3350] hover:bg-[#f0ebf8]'
                }`}
            >
                <User size={14} />自分の教材
            </button>
            <button
                onClick={() => router.push('/materials?tab=community')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab === 'community'
                        ? 'bg-[#efe9ff] text-[#6b5ca5] font-bold'
                        : 'text-[#484550] hover:text-[#3a3350] hover:bg-[#f0ebf8]'
                }`}
            >
                {communityLocked ? <Lock size={14} /> : <Globe size={14} />}みんなの教材
            </button>
        </div>
    );
}
