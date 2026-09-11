import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Student } from '@/types/student';
import { Plus } from 'lucide-react';

export const revalidate = 0;

async function getStudents() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data as Student[];
}

const jlptColors: Record<string, string> = {
    N1: 'bg-[#f8e8e7] text-[#9c4f5a]',
    N2: 'bg-[#ece8f3] text-[#6b5b8c]',
    N3: 'bg-[#d7f8e4] text-[#1a7a44]',
    N4: 'bg-[#f1e7da] text-[#7a5a3a]',
    N5: 'bg-[#f1e7da] text-[#7a5a3a]',
};

export default async function StudentsPage() {
    const students = await getStudents();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[#3b2e2a]">生徒</h1>
                <Link
                    prefetch
                    href="/students/new"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9c4f5a] text-white text-sm font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(156,79,90,0.25)]"
                >
                    <Plus size={16} />
                    新規生徒登録
                </Link>
            </div>

            {students.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-[#dccfc4]/40 text-center">
                    <div className="text-4xl mb-4">👥</div>
                    <h3 className="text-base font-bold text-[#3b2e2a] mb-1">生徒がいません</h3>
                    <p className="text-sm text-[#534344] mb-4 max-w-xs">
                        「新規生徒登録」から最初の生徒を追加しましょう。
                    </p>
                    <Link
                    prefetch
                        href="/students/new"
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#f8e8e7] text-[#9c4f5a] text-sm font-bold rounded-xl hover:bg-[#f3dcdb] transition-colors"
                    >
                        生徒を登録する
                    </Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {students.map((student) => (
                        <Link
                    prefetch
                            key={student.id}
                            href={`/students/${student.id}`}
                            className="group flex items-center gap-4 p-5 bg-white rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] hover:shadow-[0_8px_40px_rgba(156,79,90,0.12)] hover:-translate-y-0.5 transition-all"
                        >
                            <div className="w-11 h-11 rounded-full bg-[#f8e8e7] flex items-center justify-center text-lg font-bold text-[#9c4f5a] flex-shrink-0">
                                {student.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-[#3b2e2a] group-hover:text-[#9c4f5a] transition-colors">
                                    {student.name}
                                </p>
                                <p className="text-xs text-[#534344] mt-0.5 truncate">
                                    {[student.nationality, student.current_phase || '進度未設定'].filter(Boolean).join(' · ')}
                                </p>
                            </div>
                            {student.jlpt_level && (
                                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${jlptColors[student.jlpt_level] || 'bg-[#f1ebe1] text-[#534344]'}`}>
                                    {student.jlpt_level}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
