'use client';

import React, { useState } from 'react';
import { Calendar, Plus, ExternalLink, Loader2, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { showAppError } from '@/lib/error-handler';
import { toast } from 'sonner';

type Props = {
    studentId: string;
    studentName: string;
    onScheduled?: () => void;
};

export function LessonScheduler({ studentId, studentName, onScheduled }: Props) {
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
            const baseDate = new Date(`${date}T${time}:00`);
            const lessonsToCreate = [];
            const currentDate = new Date(baseDate);
            const count = recurrence === 'none' ? 1 : occurrences;

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

            const { error } = await supabase.from('lessons').insert(lessonsToCreate);
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
        } catch (error) {
            showAppError(error, '予約に失敗しました。もう一度お試しください。');
        } finally {
            setLoading(false);
        }
    };

    if (googleLink) {
        return (
            <div className="bg-[#f2daff] border border-[#c9a8e0]/40 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-[#6f5385] font-bold text-sm">
                    <Check size={18} />
                    {recurrence === 'none' ? '予約が完了しました' : `${occurrences}回分の予約が完了しました`}
                </div>
                <p className="text-xs text-[#4b454e]">Googleカレンダーにこの予定を追加しますか？</p>
                <a
                    href={googleLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 bg-white text-[#6f5385] font-bold text-sm rounded-xl hover:bg-[#f2daff] transition-colors border border-[#c9a8e0]/30"
                >
                    <Calendar size={15} />
                    Googleカレンダーに追加
                    <ExternalLink size={13} />
                </a>
                <button
                    onClick={() => { setGoogleLink(null); setDate(''); setTime(''); setRecurrence('none'); }}
                    className="text-xs text-[#6f5385] hover:text-[#4b454e] w-full text-center underline"
                >
                    続けて予約する
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">日付</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">開始時間</label>
                    <input
                        type="time"
                        value={time}
                        onChange={e => setTime(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors"
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">繰り返し</label>
                <div className="flex gap-2">
                    <select
                        value={recurrence}
                        onChange={e => setRecurrence(e.target.value as 'none' | 'weekly' | 'biweekly')}
                        className="flex-1 px-3 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors"
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
                                className="w-full px-3 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors"
                            />
                            <span className="text-xs text-[#4b454e] whitespace-nowrap">回</span>
                        </div>
                    )}
                </div>
            </div>

            <button
                onClick={handleSchedule}
                disabled={!date || !time || loading}
                className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold text-sm rounded-full hover:scale-[1.01] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {recurrence === 'none' ? 'レッスンを予約する' : '一括予約する'}
            </button>
        </div>
    );
}
