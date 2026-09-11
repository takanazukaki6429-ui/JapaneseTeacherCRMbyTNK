'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { UserNav } from './user-nav';

export function Header() {
    return (
        <header className="sticky top-0 z-20 flex items-center justify-between pl-16 pr-6 md:px-6 py-3.5 bg-white/70 backdrop-blur-[24px] border-b border-[#dccfc4]/15">
            <div>
                <h2 className="text-sm font-bold text-[#3b2e2a]">ASTA</h2>
            </div>
            <div className="flex items-center gap-3">
                <button className="p-2 text-[#534344] hover:text-[#3b2e2a] hover:bg-[#f1ebe1] rounded-xl transition-colors relative">
                    <Bell size={18} />
                </button>
                <UserNav />
            </div>
        </header>
    );
}
