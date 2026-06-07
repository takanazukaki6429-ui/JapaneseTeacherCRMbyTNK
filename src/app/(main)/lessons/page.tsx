import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { BookOpen, User, ArrowRight, Calendar } from 'lucide-react';
import { Database } from '@/types/supabase';
import { formatDate } from '@/lib/utils';

export const revalidate = 0;

type LessonWithStudent = Database['public']['Tables']['lessons']['Row'] & {
    students: Pick<Database['public']['Tables']['students']['Row'], 'name' | 'id' | 'user_id'> | null
};

async function getAllLessons() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    const { data } = await supabase
        .from('lessons')
        .select('*, students!inner(name, id, user_id)')
        .eq('students.user_id', user.id)
        .order('date', { ascending: false });
    return (data as unknown as LessonWithStudent[]) || [];
}

export default async function LessonsPage() {
    const lessons = await getAllLessons();
    const upcoming = lessons.filter(l => l.status === 'scheduled' && new Date(l.date) > new Date());
    const completed = lessons.filter(l => !upcoming.includes(l));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">レッスン一覧</h1>
                <p className="text-sm text-[#4b454e] mt-0.5">全生徒のレッスン予定・履歴</p>
            </div>

            {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] text-center">
                    <div className="w-14 h-14 bg-[#f2daff] rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="text-[#6f5385]" size={26} />
                    </div>
                    <h3 className="font-bold text-[#1a1c1e] mb-1">レッスンがありません</h3>
                    <p className="text-sm text-[#4b454e] mb-4">生徒詳細ページからレッスンを記録・予約できます</p>
                    <Link href="/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6f5385] hover:underline">
                        <User size={14} /> 生徒一覧へ
                    </Link>
                </div>
            ) : (
                <div className="space-y-6">
                    {upcoming.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.06em] uppercase text-[#6f5385] bg-[#f2daff] px-2 py-0.5 rounded-full inline-block mb-3">予定</p>
                            <div className="space-y-2">
                                {upcoming.map(lesson => (
                                    <LessonRow key={lesson.id} lesson={lesson} isUpcoming />
                                ))}
                            </div>
                        </div>
                    )}

                    {completed.length > 0 && (
                        <div>
                            <p className="text-[10px] font-bold tracking-[0.06em] uppercase text-[#4b454e] bg-[#f4f3f7] px-2 py-0.5 rounded-full inline-block mb-3">記録済み</p>
                            <div className="space-y-2">
                                {completed.map(lesson => (
                                    <LessonRow key={lesson.id} lesson={lesson} isUpcoming={false} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function LessonRow({ lesson, isUpcoming }: { lesson: LessonWithStudent; isUpcoming: boolean }) {
    const d = new Date(lesson.date);
    return (
        <Link
            href={`/students/${lesson.student_id}`}
            className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.04)] hover:shadow-[0_0_40px_rgba(111,83,133,0.1)] border border-transparent hover:border-[#c9a8e0]/30 transition-all group"
        >
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex flex-col items-center justify-center text-center ${isUpcoming ? 'bg-[#f2daff]' : 'bg-[#f4f3f7]'}`}>
                <span className={`text-[10px] font-bold uppercase ${isUpcoming ? 'text-[#6f5385]' : 'text-[#4b454e]'}`}>
                    {d.toLocaleDateString('ja-JP', { month: 'short' }).replace('月', '')}月
                </span>
                <span className={`text-lg font-bold leading-tight ${isUpcoming ? 'text-[#6f5385]' : 'text-[#1a1c1e]'}`}>{d.getDate()}</span>
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-bold text-[#1a1c1e] truncate">{lesson.students?.name || '不明'}</p>
                    {isUpcoming && (
                        <span className="text-[10px] font-bold bg-[#f2daff] text-[#6f5385] px-2 py-0.5 rounded-full flex-shrink-0">予定</span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#4b454e]">
                    <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {lesson.topics && <span className="truncate">{lesson.topics}</span>}
                    {!lesson.topics && !isUpcoming && <span className="text-[#4b454e]/50">{formatDate(lesson.date)}</span>}
                </div>
            </div>

            <ArrowRight size={16} className="text-[#cdc3ce] group-hover:text-[#6f5385] transition-colors flex-shrink-0" />
        </Link>
    );
}
