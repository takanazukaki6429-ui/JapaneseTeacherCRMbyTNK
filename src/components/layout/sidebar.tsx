'use client';

/**
 * 左のナビ（画面案 2026-09-11：色＝D・書体＝E、ホーム＝Eの配置）
 * 上：文字の「ASTA」／中：ホーム・生徒・教材・設定の4つ／下：先生の名前とログアウト
 */
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Home, GraduationCap, BookOpen, Settings, LogOut, Menu, KeyRound, LayoutDashboard, CircleUserRound } from 'lucide-react';
import { isAdminEmail } from '@/lib/admin';

const navItems = [
    { name: 'ホーム', href: '/', icon: Home },
    { name: '生徒', href: '/students', icon: GraduationCap },
    { name: '教材', href: '/materials', icon: BookOpen },
    { name: '設定', href: '/settings', icon: Settings },
];

const itemClass = (active: boolean) => cn(
    'flex items-center gap-3 px-4 py-3 rounded-xl text-[15px] leading-[22px] transition-all duration-200',
    active ? 'bg-[#faf3e7] text-[#7f3843] font-semibold' : 'text-[#534344] font-medium hover:bg-[#faf3e7]/60'
);

export function Sidebar() {
    const router = useRouter();
    const pathname = usePathname();
    const supabase = createClient();
    const [isMobileOpen, setIsMobileOpen] = React.useState(false);
    const [userEmail, setUserEmail] = React.useState<string | null>(null);
    const [displayName, setDisplayName] = React.useState<string | null>(null);
    const isAdmin = isAdminEmail(userEmail);

    React.useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserEmail(user.email || null);
            const { data } = await supabase.from('user_settings').select('display_name').eq('user_id', user.id).maybeSingle();
            if (data?.display_name) setDisplayName(data.display_name as string);
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

    const teacherLabel = displayName
        ? (displayName.endsWith('先生') ? displayName : `${displayName}先生`)
        : (userEmail ?? '…');

    return (
        <>
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white/90 backdrop-blur-md rounded-xl shadow-md"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                aria-label="メニュー"
            >
                <Menu size={22} className="text-[#7f3843]" />
            </button>

            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-40 w-64 bg-white shadow-[0_10px_30px_-5px_rgba(156,79,90,0.08)]',
                    'transition-transform duration-300 ease-in-out md:translate-x-0',
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="h-full p-6 flex flex-col justify-between border-r border-[#e9e2d7]/40">
                    <div>
                        <div className="px-3 pt-2 pb-8">
                            <Link href="/" className="text-[20px] leading-[30px] font-bold tracking-wide text-[#7f3843] select-none inline-flex items-center gap-2">
                                ASTA
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#d1bdf5]" />
                            </Link>
                        </div>
                        <nav className="space-y-2">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        prefetch
                                        key={item.href}
                                        href={item.href}
                                        aria-current={active ? 'page' : undefined}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={itemClass(active)}
                                    >
                                        <Icon size={22} strokeWidth={1.6} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>

                        {isAdmin && (
                            <div className="mt-6 space-y-2">
                                <p className="text-xs font-bold text-[#534344] px-4">管理</p>
                                {[
                                    { href: '/admin/dashboard', name: 'ダッシュボード', Icon: LayoutDashboard },
                                    { href: '/admin/invite-codes', name: '招待コード', Icon: KeyRound },
                                ].map(({ href, name, Icon }) => (
                                    <Link
                                        prefetch
                                        key={href}
                                        href={href}
                                        onClick={() => setIsMobileOpen(false)}
                                        className={itemClass(isActive(href))}
                                    >
                                        <Icon size={20} strokeWidth={1.6} />
                                        {name}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-[#e9e2d7]/40 space-y-1">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-xl text-[#1e1b15]">
                            <CircleUserRound size={28} strokeWidth={1.4} className="text-[#7f3843]/80 shrink-0" />
                            <span className="text-[15px] leading-[22px] font-bold truncate">{teacherLabel}</span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2 w-full text-sm text-[#534344] rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                            <LogOut size={16} />
                            ログアウト
                        </button>
                    </div>
                </div>
            </aside>

            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-30 bg-[#3b2e2a]/20 backdrop-blur-sm md:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}
        </>
    );
}
