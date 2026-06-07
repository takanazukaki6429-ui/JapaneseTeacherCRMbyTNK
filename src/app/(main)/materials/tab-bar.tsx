'use client';

import { useRouter } from 'next/navigation';
import { User, Globe } from 'lucide-react';

type Props = { currentTab: string };

export function MaterialsTabBar({ currentTab }: Props) {
    const router = useRouter();
    return (
        <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] w-fit">
            <button
                onClick={() => router.push('/materials?tab=mine')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab !== 'community'
                        ? 'bg-[#f2daff] text-[#6f5385] font-bold'
                        : 'text-[#4b454e] hover:text-[#1a1c1e] hover:bg-[#f4f3f7]'
                }`}
            >
                <User size={14} />自分の教材
            </button>
            <button
                onClick={() => router.push('/materials?tab=community')}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    currentTab === 'community'
                        ? 'bg-[#f2daff] text-[#6f5385] font-bold'
                        : 'text-[#4b454e] hover:text-[#1a1c1e] hover:bg-[#f4f3f7]'
                }`}
            >
                <Globe size={14} />みんなの教材
            </button>
        </div>
    );
}
