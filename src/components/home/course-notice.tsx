'use client';

/**
 * コンサルの受講が終わる前の案内（2026-10-06）。
 * 受講中（コースが終わる日まで無料）の先生に、終わる日の COURSE_NOTICE_DAYS 日前から、ホームの上に出す。
 * 終わった後も使うには申し込みが要る（無料お試しは無い）。受講中に申し込めば、料金は受講期間の後から（create-checkout-session）。
 * 先回りして申し込んだ先生（お試し中・契約中）には出さない
 */
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useCourseStatus } from '@/lib/plan-access';
import { COURSE_NOTICE_DAYS, formatJpDate } from '@/lib/course';

export function CourseNotice() {
    const { loading, inCourse, endDate, daysLeft, subscribed } = useCourseStatus();
    if (loading || !inCourse || !endDate || daysLeft === null || daysLeft > COURSE_NOTICE_DAYS || subscribed) return null;
    return (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#d9cff5] bg-[#f6f2ff] px-5 py-3.5 text-[14px] text-[#4a3f73]">
            <p className="flex items-start gap-2 leading-relaxed">
                <GraduationCap size={16} className="mt-1 flex-shrink-0" />
                <span>
                    受講期間（無料で使える期間）は <b>{formatJpDate(endDate)}</b> まで{daysLeft === 0 ? '（今日まで）' : `（あと${daysLeft}日）`}です。<br />
                    そのあとも使う場合は、プランをお申し込みください。今お申込みいただくと、料金は受講期間が終わった後からかかります。
                </span>
            </p>
            <Link href="/pricing" className="rounded-xl bg-[#6b5ca5] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90">
                プランを選ぶ
            </Link>
        </div>
    );
}
