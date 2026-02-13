'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Plus, ExternalLink, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
// import { toast } from 'sonner';

type Props = {
    studentId: string;
    studentName: string;
    onScheduled?: () => void;
};

export function LessonScheduler({ studentId, studentName, onScheduled }: Props) {
    const router = useRouter();
    const supabase = createClient();
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [loading, setLoading] = useState(false);
    const [googleLink, setGoogleLink] = useState<string | null>(null);
    const [recurrence, setRecurrence] = useState<'none' | 'weekly' | 'biweekly'>('none');
    const [occurrences, setOccurrences] = useState(4);

    const handleSchedule = async () => {
        if (!date || !time) return;
        setLoading(true);

        try {
            // Combine date and time to ISO string
            const baseDate = new Date(`${date}T${time}:00`);
            const lessonsToCreate = [];
            let currentDate = new Date(baseDate);

            const count = recurrence === 'none' ? 1 : occurrences;

            for (let i = 0; i < count; i++) {
                lessonsToCreate.push({
                    student_id: studentId,
                    date: currentDate.toISOString(),
                    status: 'scheduled',
                    understanding_level: null,
                    content: '',
                });

                // Increment date
                if (recurrence === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
                if (recurrence === 'biweekly') currentDate.setDate(currentDate.getDate() + 14);
            }

            const { error } = await supabase
                .from('lessons')
                .insert(lessonsToCreate);

            if (error) throw error;

            // Generate Google Calendar Link
            const startTime = baseDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
            const endTime = new Date(baseDate.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d\d\d/g, "");

            const title = encodeURIComponent(`日本語レッスン: ${studentName}`);
            const details = encodeURIComponent(`NihongoTeacherCRMで予約されたレッスンです。\n生徒: ${studentName}`);

            let link = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;

            if (recurrence !== 'none') {
                const freq = recurrence === 'weekly' ? 'WEEKLY' : 'WEEKLY;INTERVAL=2';
                link += `&recur=RRULE:FREQ=${freq};COUNT=${count}`;
            }

            setGoogleLink(link);
            if (onScheduled) onScheduled();
            router.refresh();

        } catch (error) {
            console.error('Error scheduling lesson:', error);
            alert('予約に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    if (googleLink) {
        return (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2 text-teal-800 font-bold">
                    <Check size={20} />
                    {recurrence === 'none' ? '予約が完了しました' : `${occurrences}回分の予約が完了しました`}
                </div>
                <p className="text-sm text-teal-700">
                    Googleカレンダーにこの予定を追加しますか？
                </p>
                <a
                    href={googleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-white border border-teal-200 text-teal-700 font-bold rounded-md hover:bg-teal-100 transition-colors"
                >
                    <Calendar size={16} />
                    Googleカレンダーに追加
                    <ExternalLink size={14} />
                </a>
                <button
                    onClick={() => { setGoogleLink(null); setDate(''); setTime(''); setRecurrence('none'); }}
                    className="text-xs text-teal-600 hover:text-teal-800 underline w-full text-center"
                >
                    続けて予約する
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Calendar size={20} className="text-teal-600" />
                次回レッスンの予約
            </h2>

            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">日付</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">開始時間</label>
                        <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">繰り返し (Recurrence)</label>
                    <div className="flex items-center gap-2">
                        <select
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as any)}
                            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                        >
                            <option value="none">繰り返しなし</option>
                            <option value="weekly">毎週 (Weekly)</option>
                            <option value="biweekly">隔週 (Bi-weekly)</option>
                        </select>
                        {recurrence !== 'none' && (
                            <div className="flex items-center gap-1 w-24">
                                <input
                                    type="number"
                                    min="2"
                                    max="12"
                                    value={occurrences}
                                    onChange={(e) => setOccurrences(parseInt(e.target.value))}
                                    className="w-full px-2 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm"
                                />
                                <span className="text-xs text-slate-500 whitespace-nowrap">回</span>
                            </div>
                        )}
                    </div>
                </div>

                <button
                    onClick={handleSchedule}
                    disabled={!date || !time || loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                    {recurrence === 'none' ? 'レッスンを予約する' : '一括予約する'}
                </button>
            </div>
        </div>
    );
}
