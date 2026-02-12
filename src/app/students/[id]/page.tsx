import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Student } from '@/types/student';
import { ArrowLeft, User, BookOpen, GraduationCap, Flag, Target, Calendar, StickyNote } from 'lucide-react';
import { DeleteStudentButton } from './delete-button';

import { LessonList } from './lesson-list';

export const revalidate = 0;

async function getStudent(id: string) {
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }

    return data as Student;
}

// Correctly typing params for Next.js 15+ (async params)
type Props = {
    params: Promise<{ id: string }>;
};

export default async function StudentDetailPage({ params }: Props) {
    const { id } = await params;
    const student = await getStudent(id);

    if (!student) {
        notFound();
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        href="/students"
                        className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-xl font-bold text-teal-700">
                            {student.name.charAt(0)}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{student.name}</h1>
                            <p className="text-sm text-slate-500">生徒ID: {student.id.slice(0, 8)}...</p>
                        </div>
                    </div>
                </div>
                <DeleteStudentButton id={student.id} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column: Basic Info */}
                <div className="md:col-span-2 space-y-6">
                    {/* Profile Card */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <User size={20} className="text-teal-600" />
                            基本情報
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <span className="text-xs font-semibold text-slate-400 block mb-1">国籍</span>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <Flag size={16} />
                                    {student.nationality || '-'}
                                </div>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 block mb-1">JLPTレベル</span>
                                <div className="flex items-center gap-2 text-slate-700">
                                    <GraduationCap size={16} />
                                    {student.jlpt_level || '-'}
                                </div>
                            </div>
                            <div className="sm:col-span-2">
                                <span className="text-xs font-semibold text-slate-400 block mb-1">学習目的</span>
                                <div className="flex items-start gap-2 text-slate-700">
                                    <Target size={16} className="mt-1 flex-shrink-0" />
                                    <p>{student.goal_text || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Learning Info */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <BookOpen size={20} className="text-teal-600" />
                            学習状況
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                            <div>
                                <span className="text-xs font-semibold text-slate-400 block mb-1">使用教材</span>
                                <p className="text-slate-700 font-medium">{student.textbook || '未設定'}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-400 block mb-1">現在の進度</span>
                                <p className="text-slate-700 font-medium">{student.current_phase || '未設定'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Memos */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <StickyNote size={20} className="text-teal-600" />
                            補足メモ
                        </h2>
                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {student.memo || 'メモはありません。'}
                        </p>
                    </div>
                </div>

                {/* Right Column: Schedule & Quick Actions */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Calendar size={20} className="text-teal-600" />
                            スケジュール
                        </h2>
                        <p className="text-sm text-slate-500 mb-4">
                            Googleカレンダー連携はまだ未実装です。
                        </p>
                        <button className="w-full py-2 px-4 bg-slate-50 text-slate-600 text-sm font-medium rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors">
                            カレンダーに追加
                        </button>
                    </div>

                    {/* Lesson History */}
                    <LessonList studentId={student.id} />
                </div>
            </div>
        </div>
    );
}
