'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import {
    LayoutDashboard,
    Users,
    BookOpen,
    Library,
    Sparkles,
    Settings,
    LogOut,
    Menu,
    Map as MapIcon,
} from 'lucide-react';

const navItems = [
    { name: 'ダッシュボード', href: '/', icon: LayoutDashboard },
    { name: '生徒管理', href: '/students', icon: Users },
    { name: 'レッスン記録', href: '/lessons', icon: BookOpen },
    { name: '教材・資産', href: '/materials', icon: Library },
    { name: 'ロードマップ', href: '/roadmap', icon: MapIcon },
    { name: 'AIツール', href: '/ai-tools', icon: Sparkles },
    { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    return (
        <>
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-md shadow-md"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                <Menu size={24} />
            </button>

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 bg-white/80 backdrop-blur-md border-r border-slate-100 text-slate-600 transition-transform duration-300 ease-in-out md:translate-x-0 shadow-sm",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                <div className="flex h-full flex-col">
                    <div className="flex items-center justify-center h-20 border-b border-dashed border-slate-100">
                        <h1 className="text-xl font-bold bg-gradient-to-r from-teal-400 to-rose-400 bg-clip-text text-transparent">
                            Nihongo CRM
                        </h1>
                    </div>

                    <nav className="flex-1 px-4 py-8 space-y-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-200 group",
                                        isActive
                                            ? "bg-teal-50 text-teal-600 shadow-sm ring-1 ring-teal-100"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <Icon size={20} className={cn("transition-colors", isActive ? "text-teal-500" : "text-slate-400 group-hover:text-slate-600")} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-100">
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 w-full transition-colors group"
                        >
                            <LogOut size={20} className="group-hover:text-rose-400" />
                            ログアウト
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
}
