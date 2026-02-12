
import { supabase } from '@/lib/supabase';
import { Lesson } from '@/types/lesson';
import { formatDate } from '@/lib/utils'; // You might need to add this utility
import Link from 'next/link';
import { Plus, ChevronRight, Star, AlertCircle } from 'lucide-react';

async function getLessons(studentId: string) {
    const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('student_id', studentId)
        .order('date', { ascending: false });

    if (error) {
        console.error('Error fetching lessons:', error);
        return [];
    }
    return data as Lesson[];
}

export async function LessonList({ studentId }: { studentId: string }) {
    const lessons = await getLessons(studentId);

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-800">レッスン履歴</h2>
                <Link
                    href={`/students/${studentId}/lessons/new`}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-50 text-teal-700 text-sm font-medium rounded-lg hover:bg-teal-100 transition-colors border border-teal-200"
                >
                    <Plus size={16} />
                    記録をつける
                </Link>
            </div>

            {lessons.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500 mb-2">まだ履歴がありません</p>
                    <p className="text-xs text-slate-400">「記録をつける」ボタンから最初のレッスンを記録しましょう。</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {lessons.map((lesson) => (
                        <div key={lesson.id} className="block group">
                            <div className="p-4 rounded-lg border border-slate-200 hover:border-teal-300 hover:shadow-sm transition-all bg-slate-50/50 hover:bg-white">
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-bold text-slate-700 bg-white px-2 py-1 rounded border border-slate-200">
                                            {new Date(lesson.date).toLocaleDateString('ja-JP')}
                                        </span>
                                        <div className="flex text-yellow-400">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={14}
                                                    fill={i < (lesson.understanding_level || 0) ? "currentColor" : "none"}
                                                    className={i < (lesson.understanding_level || 0) ? "" : "text-slate-200"}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-300 group-hover:text-teal-500 transition-colors" />
                                </div>

                                <div className="space-y-2 pl-2 border-l-2 border-slate-200 group-hover:border-teal-200 transition-colors ml-1">
                                    {lesson.topics && (
                                        <div className="text-sm">
                                            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mr-2">Topics</span>
                                            <span className="text-slate-700">{lesson.topics}</span>
                                        </div>
                                    )}
                                    {lesson.mistakes && (
                                        <div className="text-sm flex items-start gap-2">
                                            <span className="text-xs font-bold text-red-500 bg-red-50 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">Weakness</span>
                                            <span className="text-slate-700">{lesson.mistakes}</span>
                                        </div>
                                    )}
                                    {(!lesson.topics && !lesson.mistakes && lesson.content) && (
                                        <p className="text-sm text-slate-600 line-clamp-2">{lesson.content}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
