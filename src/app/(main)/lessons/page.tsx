import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import { BookOpen, Calendar, Clock, User, ArrowLeft } from 'lucide-react';

export const revalidate = 0;

async function getAllLessons() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('lessons')
        .select(`
            *,
            students (
                name,
                id
            )
        `)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching lessons:', error);
        return [];
    }

    return data || [];
}

export default async function LessonsPage() {
    const lessons = await getAllLessons();

    // Group lessons by month?? Or just simple list.
    // Let's do a simple list first strictly matching the request for "Same as student page" (handling empty state).

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">レッスン記録一覧</h1>
                    <p className="text-sm text-slate-500 mt-1">全生徒のレッスン履歴を確認できます</p>
                </div>
            </div>

            {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <BookOpen className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">レッスン記録がありません</h3>
                    <p className="text-sm text-slate-500 mb-4 max-w-xs">
                        まだレッスンが記録されていません。生徒詳細ページからレッスンを記録・予約できます。
                    </p>
                    <Link
                        href="/students"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <User size={16} />
                        生徒一覧へ戻る
                    </Link>
                </div>
            ) : (
                <div className="grid gap-4">
                    {lessons.map((lesson: any) => {
                        const isScheduled = lesson.status === 'scheduled';
                        const isCompleted = lesson.status === 'completed' || !lesson.status; // legacy null = completed

                        return (
                            <div
                                key={lesson.id}
                                className={`p-4 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:border-teal-200 flex flex-col md:flex-row gap-4 items-start md:items-center`}
                            >
                                {/* Date Badge */}
                                <div className={`flex-shrink-0 w-full md:w-auto flex md:flex-col items-center justify-center gap-2 md:gap-0 p-3 rounded-lg border ${isScheduled ? 'bg-teal-50 border-teal-100 text-teal-700' : 'bg-slate-50 border-slate-200 text-slate-600'} min-w-[80px]`}>
                                    <span className="text-xs font-bold uppercase">{new Date(lesson.date).toLocaleDateString('en-US', { month: 'short' })}</span>
                                    <span className="text-xl font-bold">{new Date(lesson.date).getDate()}</span>
                                    <span className="text-xs opacity-75">{new Date(lesson.date).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Link href={`/students/${lesson.student_id}`} className="font-bold text-slate-800 hover:text-teal-600 truncate flex items-center gap-1">
                                                <User size={14} className="text-slate-400" />
                                                {lesson.students?.name || '不明な生徒'}
                                            </Link>
                                            {isScheduled && <span className="bg-teal-100 text-teal-700 text-[10px] px-2 py-0.5 rounded-full font-bold">予定</span>}
                                        </div>
                                        <Link href={`/students/${lesson.student_id}`} className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1">
                                            詳細 <ArrowLeft size={12} className="rotate-180" />
                                        </Link>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <p className="text-xs font-bold text-slate-500 mb-1">トピック</p>
                                            <p className="text-slate-700 truncate">{lesson.topics || '未入力'}</p>
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <p className="text-xs font-bold text-slate-500 mb-1">宿題</p>
                                            <p className="text-slate-700 truncate">{lesson.homework || 'なし'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}
