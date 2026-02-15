"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, Settings, ChevronDown } from "lucide-react";

export function UserNav() {
    const router = useRouter();
    const supabase = createClient();
    const [user, setUser] = useState<any>(null);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();
    }, [supabase]);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.refresh();
        router.push("/login");
    };

    const getInitials = (email: string) => {
        if (!email) return "U";
        return email.substring(0, 1).toUpperCase();
    };

    if (!user) {
        return (
            <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse"></div>
        );
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-200"
            >
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold border border-amber-200">
                    {getInitials(user.email)}
                </div>
                <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-4 py-2 border-b border-slate-100 mb-1">
                        <p className="text-sm font-bold text-slate-800 truncate">
                            {user.email}
                        </p>
                        <p className="text-xs text-slate-500">講師アカウント</p>
                    </div>

                    <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-amber-600 transition-colors"
                        onClick={() => setIsOpen(false)}
                    >
                        <Settings size={16} />
                        設定・プロフィール
                    </Link>

                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left"
                    >
                        <LogOut size={16} />
                        ログアウト
                    </button>
                </div>
            )}
        </div>
    );
}
