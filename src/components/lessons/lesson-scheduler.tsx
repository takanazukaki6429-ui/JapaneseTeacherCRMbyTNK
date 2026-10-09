'use client';

/**
 * 生徒の1枚の「授業の予約」。予約を作る欄と、予約した授業の一覧（取り消し付き）。
 * 予約の一覧と取り消しは 2026-10-09 に足した（前は、入口の無い「授業の一覧」の画面にしか出ず、取り消せなかった）
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Calendar, CalendarDays, Plus, ExternalLink, Loader2, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { showAppError } from '@/lib/error-handler';
import { toast } from 'sonner';

type Props = {
    studentId: string;
    studentName: string;
    onScheduled?: () => void;
};

type Upcoming = { id: string; date: string };

/** 予約の日時を「10月12日（日） 19:00」の形にする（日本時間） */
function formatSlot(iso: string): string {
    const d = new Date(iso);
    const day = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'long', day: 'numeric', weekday: 'short' }).format(d);
    const time = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit' }).format(d);
    return `${day.replace(/\((.)\)/, '（$1）')} ${time}`;
}

/** 繰り返しの回数（2〜12回） */
const clampCount = (n: number) => (Number.isFinite(n) ? Math.min(12, Math.max(2, Math.round(n))) : 4);

export function LessonScheduler({ studentId, studentName, onScheduled }: Props) {
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLink, setGoogleLink] = useState<string | null>(null);
    const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly'>('none');
    const [occurrences, setOccurrences] = useState(4);
    const [upcoming, setUpcoming] = useState<Upcoming[] | null>(null);
    const [cancelingId, setCancelingId] = useState<string | null>(null);

    /** これから先の予約（新しい授業の予定）を、近い順に読む */
    const loadUpcoming = useCallback(async () => {
        const { data, error } = await createClient()
            .from('lessons')
            .select('id, date')
            .eq('student_id', studentId)
            .eq('status', 'scheduled')
            .gte('date', new Date().toISOString())
            .order('date', { ascending: true })
            .limit(20);
        setUpcoming(error ? [] : ((data ?? []) as Upcoming[]));
    }, [studentId]);

    useEffect(() => {
        // 画面を開いた時に、予約の一覧を読む（読み終わるまでは何も出さない）
        void loadUpcoming();
    }, [loadUpcoming]);

    const handleSchedule = async () => {
        if (!date || !time) return;
        setLoading(true);
        try {
            const baseDate = new Date(`${date}T${time}:00`);
            const lessonsToCreate = [];
            const currentDate = new Date(baseDate);
            const count = recurrence === 'none' ? 1 : clampCount(occurrences);

            for (let i = 0; i < count; i++) {
                lessonsToCreate.push({
                    student_id: studentId,
                    date: currentDate.toISOString(),
                    status: 'scheduled',
                    understanding_level: null,
                    content: '',
                });
                if (recurrence === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                if (recurrence === 'biweekly') currentDate.setDate(currentDate.getDate() + 14);
            }

            const { error } = await createClient().from('lessons').insert(lessonsToCreate);
            if (error) throw error;

            const startTime = baseDate.toISOString().replace(/-|:|\.\d\d\d/g, '');
            const endTime = new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, '');
            const title = encodeURIComponent(`日本語レッスン: ${studentName}`);
            const details = encodeURIComponent(`ASTAで予約されたレッスンです。\n生徒: ${studentName}`);
            let link = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
            if (recurrence !== 'none') {
                const freq = recurrence === 'weekly' ? 'WEEKLY' : 'WEEKLY;INTERVAL=2';
                link += `&recur=RRULE:FREQ=${freq};COUNT=${count}`;
            }

            setGoogleLink(link);
            toast.success('レッスンの予約が完了しました');
            onScheduled?.();
            void loadUpcoming();
        } catch (error) {
            showAppError(error, '予約に失敗しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    /** 予約を取り消す（予約のままの行だけを消す。記録になった授業は消さない） */
    const handleCancel = async (slot: Upcoming) => {
        if (!confirm(`${formatSlot(slot.date)} の予約を取り消しますか？`)) return;
        setCancelingId(slot.id);
        try {
            const { error } = await createClient().from('lessons').delete().eq('id', slot.id).eq('status', 'scheduled');
            if (error) throw error;
            setUpcoming(prev => (prev ?? []).filter(u => u.id !== slot.id));
            toast.success('予約を取り消しました');
        } catch (error) {
            showAppError(error, '予約を取り消せませんでした。もう一度お試しください。');
        } finally {
            setCancelingId(null);
        }
    };

    const upcomingList = upcoming && upcoming.length > 0 && (
        <div className="pt-4 mt-4 border-t border-[#efe9f8]">
            <p className="text-xs font-bold text-[#484550] mb-2">予約した授業（{upcoming.length}件）</p>
            <ul className="space-y-1.5">
                {upcoming.map(slot => (
                    <li key={slot.id} className="flex items-center justify-between gap-2 px-3 py-2 bg-[#f8f5fd] rounded-lg text-sm text-[#3a3350]">
                        <span className="tabular-nums">{formatSlot(slot.date)}</span>
                        <button
                            type="button"
                            onClick={() => handleCancel(slot)}
                            disabled={cancelingId === slot.id}
                            className="inline-flex items-center gap-1 text-xs text-[#a8475f] hover:underline disabled:opacity-50"
                        >
                            {cancelingId === slot.id ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                            取り消す
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );

    return (
        <section className="bg-white border border-[#e4ddf0] rounded-xl p-6 shadow-[0_2px_16px_rgba(107,92,165,0.05)]">
            <h2 className="flex items-center gap-2 text-[17px] font-bold text-[#3a3350] pb-3 mb-4 border-b border-[#efe9f8]">
                <CalendarDays size={18} className="text-[#6b5ca5]" /> 授業の予約
            </h2>

            {googleLink ? (
                <div className="bg-[#efe9ff] border border-[#ccbeff]/40 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2 text-[#6b5ca5] font-bold text-sm">
                        <Check size={18} />
                        {recurrence === 'none' ? '予約が完了しました' : `${clampCount(occurrences)}回分の予約が完了しました`}
                    </div>
                    <p className="text-xs text-[#484550]">Googleカレンダーにこの予定を追加しますか？</p>
                    <a
                        href={googleLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2 bg-white text-[#6b5ca5] font-bold text-sm rounded-xl hover:bg-[#efe9ff] transition-colors border border-[#ccbeff]/30"
                    >
                        <Calendar size={15} />
                        Googleカレンダーに追加
                        <ExternalLink size={13} />
                    </a>
                    <button
                        onClick={() => { setGoogleLink(null); setDate(''); setTime(''); setRecurrence('none'); }}
                        className="text-xs text-[#6b5ca5] hover:text-[#484550] w-full text-center underline"
                    >
                        続けて予約する
                    </button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">日付</label>
                            <input
                                type="date"
                                value={date}
                                onChange={e => setDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">開始時間</label>
                            <input
                                type="time"
                                value={time}
                                onChange={e => setTime(e.target.value)}
                                className="w-full px-3 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">繰り返し</label>
                        <div className="flex gap-2">
                            <select
                                value={recurrence}
                                onChange={e => setRecurrence(e.target.value as 'none' | 'weekly' | 'biweekly')}
                                className="flex-1 px-3 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors"
                            >
                                <option value="none">繰り返しなし</option>
                                <option value="weekly">毎週</option>
                                <option value="biweekly">隔週</option>
                            </select>
                            {recurrence !== 'none' && (
                                <div className="flex items-center gap-1.5 w-24">
                                    <input
                                        type="number"
                                        min="2"
                                        max="12"
                                        value={occurrences}
                                        onChange={e => setOccurrences(parseInt(e.target.value))}
                                        className="w-full px-3 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors"
                                    />
                                    <span className="text-xs text-[#484550] whitespace-nowrap">回</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleSchedule}
                        disabled={!date || !time || loading}
                        className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-[#6b5ca5] text-white font-bold text-sm rounded-full hover:scale-[1.01] transition-transform shadow-[0_4px_20px_rgba(107,92,165,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {recurrence === 'none' ? 'レッスンを予約する' : '一括予約する'}
                    </button>
                </div>
            )}

            {upcomingList}
        </section>
    );
}
