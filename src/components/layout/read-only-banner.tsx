'use client';

/**
 * 解約した先生への「見るだけ」の帯（2026-09-25 かずき決定・案B）。
 * 解約・支払いが止まった先生は、ホーム・生徒情報（過去の記録）・学習計画・設定を見られる。
 * 新しい記録・ライブ授業・準備・AI は使えない（門番＝middleware と各処理が止める）。
 * 帯で理由と戻り方（申込み）を先に伝える。コンサルの受講中（コースが終わる日まで）は出さない（2026-10-06）。
 * 受講が終わって申し込んでいない受講生も見るだけ（2026-10-07 案2）：使った量と、受講生価格の期限を見せる
 */
import Link from 'next/link';
import { Eye } from 'lucide-react';
import { useCourseStatus, useMyUsage, useReadOnly } from '@/lib/plan-access';
import { formatJpDate } from '@/lib/course';

export function ReadOnlyBanner() {
    // 判定は lib/plan-access.ts の useReadOnly
    const { readOnly, reason } = useReadOnly();
    const course = useCourseStatus();
    const usage = useMyUsage(reason === 'course_finished');

    if (!readOnly) return null;
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#ecd9a8] bg-[#fdf6e7] px-5 py-3.5 text-[14px] text-[#8a6d1f]">
            <p className="flex items-start gap-2 leading-relaxed">
                <Eye size={16} className="mt-1 flex-shrink-0" />
                {reason === 'course_finished' ? (
                    <span>
                        特別優待プランの期間が終わったため、今は<b>見るだけ</b>になっています。<br />
                        {usage.students !== null && usage.lessons !== null
                            ? <>これまでの記録（生徒{usage.students}人・授業の記録{usage.lessons}回）は、このまま残っています。<br /></>
                            : <>これまでの記録は、このまま残っています。<br /></>}
                        {course.memberPriceDaysLeft !== null && course.memberPriceLastDay && (
                            <>{formatJpDate(course.memberPriceLastDay)}まで（あと{course.memberPriceDaysLeft}日）のお申込みなら、コンサル受講生限定の特別価格で続けられます。</>
                        )}
                    </span>
                ) : (
                    <span>
                        プランが有効ではないため、今は<b>見るだけ</b>になっています。<br />
                        これまでの記録は、このまま見られます。
                    </span>
                )}
            </p>
            <Link href="/pricing" className="rounded-xl bg-[#6b5ca5] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90">
                続きから使う（料金プラン）
            </Link>
        </div>
    );
}
