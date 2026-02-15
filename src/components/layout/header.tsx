'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { UserNav } from './user-nav';

export function Header() {
    return (
        <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200">
            <div>
                <h2 className="text-lg font-semibold text-slate-800">
                    ASTA Dashboard
                </h2>
                <p className="text-xs text-slate-500">今日のレッスンを始めましょう</p>
            </div>

            <div className="flex items-center gap-4">
                <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors relative">
                    <Bell size={20} />
                    {/* <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span> */}
                </button>
                <UserNav />
            </div>
        </header>
    );
}
