'use client';

/**
 * コンサルの受講が終わる前の案内（2026-10-06・10-07 案2）。
 * 受講中（コースが終わる日まで無料）の先生に、終わる日の COURSE_NOTICE_DAYS（14）日前から、ホームの上に出す。7日前と前日からは強く出す。
 * 本人が使った量（生徒の数・授業の記録の数）と「記録はそのまま使い続けられる」、受講生価格の期限を見せる。
 * 終わった後も使うには申し込みが要る（無料お試しは無い）。受講中に申し込めば、料金は無料の期間の後から（create-checkout-session）。
 * 先回りして申し込んだ先生（お試し中・契約中）には出さない
 */
import Link from 'next/link';
import { GraduationCap } from 'lucide-react';
import { useCourseStatus, useMyUsage } from '@/lib/plan-access';
import { COURSE_NOTICE_DAYS, formatJpDate } from '@/lib/course';
import { MEMBER_PRICE_GRACE_DAYS } from '@/lib/audience';

export function CourseNotice() {
    const { loading, inCourse, endDate, daysLeft, subscribed } = useCourseStatus();
    const show = !loading && inCourse && !!endDate && daysLeft !== null && daysLeft <= COURSE_NOTICE_DAYS && !subscribed;
    const usage = useMyUsage(show);
    if (!show || !endDate || daysLeft === null) return null;
    const strong = daysLeft <= 7;
    return (
        <div className={`mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-5 py-3.5 text-[14px] ${strong ? 'border-[#c9b8f0] bg-[#efe9ff] text-[#3a2f66]' : 'border-[#d9cff5] bg-[#f6f2ff] text-[#4a3f73]'}`}>
            <p className="flex items-start gap-2 leading-relaxed">
                <GraduationCap size={16} className="mt-1 flex-shrink-0" />
                <span>
                    受講生の無料の期間は <b>{formatJpDate(endDate)}</b> まで{daysLeft === 0 ? '（今日まで）' : `（あと${daysLeft}日）`}です。<br />
                    {usage.students !== null && usage.lessons !== null && (
                        <>これまでに、生徒{usage.students}人・授業の記録{usage.lessons}回を ASTA に残しています。受講後も、記録はそのまま使い続けられます。<br /></>
                    )}
                    無料の期間が終わってから{MEMBER_PRICE_GRACE_DAYS}日以内のお申込みは受講生価格です。今お申込みいただくと、料金は無料の期間が終わった後からかかります。
                </span>
            </p>
            <Link href="/pricing" className="rounded-xl bg-[#6b5ca5] px-4 py-2 text-[13px] font-bold text-white hover:opacity-90">
                プランを選ぶ
            </Link>
        </div>
    );
}
