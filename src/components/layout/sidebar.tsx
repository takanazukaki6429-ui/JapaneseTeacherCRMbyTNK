'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Home, Users, Library, Settings, LogOut, Menu, KeyRound, CreditCard } from 'lucide-react';

const ADMIN_EMAILS = ['pommetann@gmail.com', 'takanazukaki6429@gmail.com'];

const navItems = [
    { name: 'ホーム', href: '/', icon: Home },
    { name: '生徒', href: '/students', icon: Users },
    { name: '教材', href: '/materials', icon: Library },
    { name: '設定', href: '/settings', icon: Settings },
    { name: 'プラン', href: '/settings/billing', icon: CreditCard },
];

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [userEmail, setUserEmail] = React.useState<string | null>(null);
    const isAdmin = userEmail ? ADMIN_EMAILS.includes(userEmail) : false;

    React.useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserEmail(user.email || null);
        };
        fetchUser();
    }, [supabase]);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        router.refresh();
    };

    const isActive = (href: string) =>
        href === '/' ? pathname === '/' : pathname.startsWith(href);

    return (
        <>
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/80 backdrop-blur-md rounded-xl shadow-md"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
            >
                <Menu size={22} className="text-[#6f5385]" />
            </button>

            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-64 flex flex-col",
                    "bg-white/70 backdrop-blur-[24px]",
                    "border-r border-[#cdc3ce]/15",
                    "transition-transform duration-300 ease-in-out md:translate-x-0",
                    isMobileOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Logo */}
                <div className="px-6 pt-7 pb-6">
                    <div className="flex items-center gap-2">
                        <div className="relative w-28 h-8">
                            <Image src="/logo.png" alt="ASTA" fill className="object-contain object-left" priority />
                        </div>
                    </div>
                    <p className="text-[11px] text-[#4b454e] mt-1 font-medium tracking-wide">Japanese Teacher CRM</p>
                </div>

                {/* Nav */}
                <nav className="flex-1 px-3 space-y-0.5">
                    <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#4b454e] px-3 mb-2">メイン</p>
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setIsMobileOpen(false)}
                                className={cn(
                                    "relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
                                    active
                                        ? "bg-[#ffdbd1] text-[#321209] font-semibold"
                                        : "text-[#4b454e] hover:bg-[#f4f3f7] hover:text-[#1a1c1e]"
                                )}
                            >
                                {active && (
                                    <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-[#805347] rounded-r-full" />
                                )}
                                <Icon size={18} className={cn(active ? "text-[#805347]" : "text-[#4b454e]")} />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                {/* Admin */}
                {isAdmin && (
                    <div className="mt-4">
                        <p className="text-[10px] font-bold tracking-[0.08em] uppercase text-[#4b454e] px-3 mb-2">管理</p>
                        <Link
                            href="/admin/invite-codes"
                            onClick={() => setIsMobileOpen(false)}
                            className={cn(
                                "relative flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium transition-all duration-200",
                                isActive('/admin/invite-codes')
                                    ? "bg-[#ffdbd1] text-[#321209] font-semibold"
                                    : "text-[#4b454e] hover:bg-[#f4f3f7] hover:text-[#1a1c1e]"
                            )}
                        >
                            {isActive('/admin/invite-codes') && (
                                <span className="absolute left-0 top-[20%] bottom-[20%] w-[3px] bg-[#805347] rounded-r-full" />
                            )}
                            <KeyRound size={18} className={cn(isActive('/admin/invite-codes') ? "text-[#805347]" : "text-[#4b454e]")} />
                            招待コード
                        </Link>
                    </div>
                )}

                {/* Footer */}
                <div className="p-3 border-t border-[#cdc3ce]/20 mt-auto">
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl mb-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {userEmail ? userEmail.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#1a1c1e] truncate">{userEmail || '...'}</p>
                            <p className="text-[10px] text-[#4b454e]">先生アカウント</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-3 py-2.5 w-full text-sm text-[#4b454e] rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                        <LogOut size={16} />
                        ログアウト
                    </button>
                </div>
            </aside>

            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-[#1a1c1e]/20 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
}
