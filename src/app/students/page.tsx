import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Student } from '@/types/student';
import { Plus, User, BookOpen, GraduationCap } from 'lucide-react';

export const revalidate = 0; // Disable caching for now to see updates immediately

async function getStudents() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching students:', error);
        return [];
    }

    return data as Student[];
}

export default async function StudentsPage() {
    const students = await getStudents();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">生徒管理</h1>
                <Link
                    href="/students/new"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors shadow-sm"
                >
                    <Plus size={18} />
                    新規生徒登録
                </Link>
            </div>

            {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-dashed border-slate-300 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <User className="text-slate-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">生徒がいません</h3>
                    <p className="text-sm text-slate-500 mb-4 max-w-xs">
                        まだ生徒が登録されていません。「新規生徒登録」ボタンから最初の生徒を追加しましょう。
                    </p>
                    <Link
                        href="/students/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        生徒を登録する
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {students.map((student) => (
                        <Link
                            key={student.id}
                            href={`/students/${student.id}`}
                            className="group block p-6 bg-white rounded-xl shadow-sm border border-slate-100 hover:shadow-md hover:border-teal-200 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors">
                                        {student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                                            {student.name}
                                        </h3>
                                        <p className="text-xs text-slate-500">{student.nationality || '国籍未設定'}</p>
                                    </div>
                                </div>
                                {student.jlpt_level && (
                                    <span className="px-2 py-1 text-xs font-bold text-teal-700 bg-teal-50 rounded-full border border-teal-100">
                                        {student.jlpt_level}
                                    </span>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <BookOpen size={14} className="text-slate-400" />
                                    <span className="truncate">{student.textbook || '教材未設定'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                    <GraduationCap size={14} className="text-slate-400" />
                                    <span className="truncate">{student.current_phase || '進度未設定'}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
