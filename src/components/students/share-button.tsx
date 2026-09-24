'use client';

import Link from 'next/link';
import { Lock, Send } from 'lucide-react';
import { usePlanAccess } from '@/lib/plan-access';

/** 生徒の1枚の「生徒に渡す」（学習計画のリンク）。有料の機能（2026-09-24 案A）。無料の先生には料金の画面へ案内する */
export function ShareButton({ studentId }: { studentId: string }) {
    const access = usePlanAccess();
    const base = 'mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[15px] font-bold shadow-sm transition-colors';
    if (!access.loading && !access.paid) {
        return (
            <Link href="/pricing" className={`${base} bg-[#f4f1fb] text-[#6f6884] border border-[#ddd4f2] hover:bg-[#efe9ff] hover:text-[#6b5ca5]`} title="有料プランで使えます（最初の7日間は無料）">
                <Lock size={15} /> 生徒に渡す（有料プラン）
            </Link>
        );
    }
    return (
        <Link prefetch href={`/students/${studentId}/roadmap?share=1`} className={`${base} bg-[#6b5ca5] hover:bg-[#5a4c94] text-white`}>
            <Send size={16} /> 生徒に渡す
        </Link>
    );
}
