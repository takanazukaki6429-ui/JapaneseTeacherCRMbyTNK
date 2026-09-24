import Link from 'next/link';
import { Lock } from 'lucide-react';

/**
 * 有料の機能の「鍵」（2026-09-24 かずき決定・案A）。機能は消さずに見せ、押すと料金の画面へ案内する。
 * compact=true はボタンの代わりに置く小さい形
 */
export function PaidLock({ feature, compact = false, className = '' }: { feature: string; compact?: boolean; className?: string }) {
    if (compact) {
        return (
            <Link
                href="/pricing"
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#ddd4f2] bg-[#f4f1fb] px-3 py-1.5 text-xs font-bold text-[#6f6884] hover:bg-[#efe9ff] hover:text-[#6b5ca5] transition-colors ${className}`}
                title="有料プランで使えます（最初の7日間は無料）"
            >
                <Lock size={12} /> {feature}（有料プラン）
            </Link>
        );
    }
    return (
        <div className={`rounded-xl border border-dashed border-[#d6cfe2] bg-[#faf8fd] p-4 ${className}`}>
            <p className="flex items-center gap-1.5 text-sm font-bold text-[#3a3350]"><Lock size={14} className="text-[#6b5ca5]" />{feature}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#6f6884]">
                有料プランで使えます。<br />
                最初の7日間は無料でお試しいただけます。
            </p>
            <Link href="/pricing" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#6b5ca5] px-3 py-1.5 text-xs font-bold text-white hover:opacity-90">
                料金プランを見る
            </Link>
        </div>
    );
}
