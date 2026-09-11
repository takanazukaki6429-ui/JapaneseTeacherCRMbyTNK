import Link from 'next/link';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Student } from '@/types/student';
import { ArrowLeft, Target, StickyNote, Sparkles, MessageCircleQuestion, Map, Pencil, CheckCircle } from 'lucide-react';
import { DeleteStudentButton } from './delete-button';
import { LessonList } from './lesson-list';
import { LessonScheduler } from '@/components/lessons/lesson-scheduler';
import { AIProfileAnalyzer } from '@/components/students/ai-profile-analyzer';
import { StudentMaterials } from '@/components/students/student-materials';

export const revalidate = 0;

async function getStudent(id: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from('students').select('*').eq('id', id).single();
    if (error || !data) return null;
    return data as Student;
}

type Props = { params: Promise<{ id: string }> };

export default async function StudentDetailPage({ params }: Props) {
    const { id } = await params;
    const student = await getStudent(id);
    if (!student) notFound();

    return (
        <div className="space-y-5 max-w-4xl mx-auto">
            {/* Back */}
            <Link
                    prefetch
                href="/students"
                className="inline-flex items-center gap-1.5 text-sm text-[#534344] hover:text-[#3b2e2a] transition-colors"
            >
                <ArrowLeft size={16} />
                生徒一覧に戻る
            </Link>

            {/* Hero card */}
            <div className="bg-gradient-to-br from-[#f8e8e7] to-white rounded-2xl p-6 flex items-center gap-5 shadow-[0_0_60px_rgba(156,79,90,0.07)]">
                <div className="w-16 h-16 rounded-full bg-[#9c4f5a] flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
                    {student.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-bold tracking-tight text-[#3b2e2a]">{student.name}</h1>
                    <p className="text-sm text-[#534344] mt-0.5">
                        {[student.nationality, student.jlpt_level].filter(Boolean).join(' · ')}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {student.jlpt_level && (
                            <span className="px-2.5 py-0.5 bg-[#f8e8e7] text-[#9c4f5a] text-xs font-bold rounded-full">
                                {student.jlpt_level}
                            </span>
                        )}
                        {student.goal_text && (
                            <span className="px-2.5 py-0.5 bg-[#f1e7da] text-[#7a5a3a] text-xs font-medium rounded-full truncate max-w-[200px]">
                                {student.goal_text.slice(0, 30)}{student.goal_text.length > 30 ? '...' : ''}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Link
                    prefetch
                        href={`/students/${student.id}/edit`}
                        className="p-2 text-[#534344] hover:text-[#9c4f5a] hover:bg-[#f8e8e7] rounded-full transition-colors"
                        title="生徒情報を編集"
                    >
                        <Pencil size={16} />
                    </Link>
                    <DeleteStudentButton id={student.id} />
                </div>
            </div>

            {/* B案 アクションボタン — フロー順 */}
            <div className="grid grid-cols-4 gap-3">
                <Link
                    prefetch
                    href={`/students/${student.id}/lessons/prepare`}
                    className="group flex flex-col items-center gap-2.5 p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] hover:shadow-[0_8px_40px_rgba(156,79,90,0.12)] hover:-translate-y-1 transition-all text-center"
                >
                    <div className="w-11 h-11 rounded-xl bg-[#f8e8e7] flex items-center justify-center text-xl">
                        📋
                    </div>
                    <span className="text-xs font-bold text-[#3b2e2a]">準備する</span>
                    <span className="text-[10px] text-[#534344] -mt-1">次回の計画</span>
                </Link>

                <Link
                    prefetch
                    href={`/students/${student.id}/lessons/live`}
                    className="group flex flex-col items-center gap-2.5 p-4 bg-[#9c4f5a] rounded-2xl shadow-[0_4px_20px_rgba(156,79,90,0.25)] hover:-translate-y-1 transition-all text-center"
                >
                    <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center text-xl">
                        ▶
                    </div>
                    <span className="text-xs font-bold text-white">ライブ授業</span>
                    <span className="text-[10px] text-white/80 -mt-1">今すぐ開始</span>
                </Link>

                <Link
                    prefetch
                    href={`/students/${student.id}/lessons/new`}
                    className="group flex flex-col items-center gap-2.5 p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] hover:shadow-[0_8px_40px_rgba(156,79,90,0.12)] hover:-translate-y-1 transition-all text-center"
                >
                    <div className="w-11 h-11 rounded-xl bg-[#f1e7da] flex items-center justify-center text-xl">
                        📝
                    </div>
                    <span className="text-xs font-bold text-[#3b2e2a]">レッスン記録</span>
                    <span className="text-[10px] text-[#534344] -mt-1">授業後に記録</span>
                </Link>

                <Link
                    prefetch
                    href={`/students/${student.id}/roadmap`}
                    className="group flex flex-col items-center gap-2.5 p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] hover:shadow-[0_8px_40px_rgba(156,79,90,0.12)] hover:-translate-y-1 transition-all text-center"
                >
                    <div className="w-11 h-11 rounded-xl bg-[#d7f8e4] flex items-center justify-center">
                        <Map size={20} className="text-[#1a7a44]" />
                    </div>
                    <span className="text-xs font-bold text-[#3b2e2a]">ロードマップ</span>
                    <span className="text-[10px] text-[#534344] -mt-1">学習計画</span>
                </Link>
            </div>

            {/* Detail grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Left: profile + AI */}
                <div className="md:col-span-2 space-y-5">
                    {/* Basic info */}
                    <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)]">
                        <h2 className="text-sm font-bold text-[#3b2e2a] mb-4 flex items-center gap-2">
                            <Target size={16} className="text-[#9c4f5a]" />
                            学習情報
                        </h2>
                        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                            <div>
                                <span className="text-[10px] font-bold text-[#534344] uppercase tracking-wider block mb-1">使用教材</span>
                                <p className="text-sm font-medium text-[#3b2e2a]">{student.textbook || '未設定'}</p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-[#534344] uppercase tracking-wider block mb-1">現在の進度</span>
                                <p className="text-sm font-medium text-[#3b2e2a]">{student.current_phase || '未設定'}</p>
                            </div>
                            <div className="col-span-2">
                                <span className="text-[10px] font-bold text-[#534344] uppercase tracking-wider block mb-1">学習目的</span>
                                <p className="text-sm text-[#3b2e2a]">{student.goal_text || '-'}</p>
                            </div>
                        </div>
                    </div>

                    {/* AI Analysis */}
                    <AIProfileAnalyzer student={student} />

                    {/* この生徒の教材 */}
                    <StudentMaterials
                        studentId={student.id}
                        studentName={student.name}
                    />

                    {/* Memo */}
                    {student.memo && (
                        <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)]">
                            <h2 className="text-sm font-bold text-[#3b2e2a] mb-3 flex items-center gap-2">
                                <StickyNote size={16} className="text-[#9c4f5a]" />
                                補足メモ
                            </h2>
                            <p className="text-sm text-[#3b2e2a] whitespace-pre-wrap leading-relaxed">{student.memo}</p>
                        </div>
                    )}
                </div>

                {/* Right: scheduler + AI initial hearing + lesson list */}
                <div className="space-y-5">
                    <div className="bg-white p-5 rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)]">
                        <h2 className="text-sm font-bold text-[#3b2e2a] mb-3 flex items-center gap-2">
                            <Sparkles size={16} className="text-[#9c4f5a]" />
                            AIサポート
                        </h2>
                        <div className="space-y-2">
                            {student.initial_hearing_done ? (
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium px-1">
                                        <CheckCircle size={13} />
                                        初回ヒアリング済み
                                    </div>
                                    <Link
                    prefetch
                                        href={`/students/${student.id}/initial-hearing`}
                                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#f0fdf4] text-emerald-700 text-sm font-bold rounded-xl border border-emerald-200 hover:bg-emerald-50 transition-colors"
                                    >
                                        <Map size={15} />
                                        ロードマップを再確認
                                    </Link>
                                </div>
                            ) : (
                                <Link
                    prefetch
                                    href={`/students/${student.id}/initial-hearing`}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#9c4f5a] text-white text-sm font-bold rounded-xl hover:scale-[1.01] transition-transform"
                                >
                                    <MessageCircleQuestion size={15} />
                                    体験レッスン → ロードマップ
                                </Link>
                            )}
                            <Link
                    prefetch
                                href={`/students/${student.id}/lessons/prepare`}
                                className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-[#f8e8e7] text-[#9c4f5a] text-sm font-bold rounded-xl hover:bg-[#f3dcdb] transition-colors"
                            >
                                <Sparkles size={15} />
                                レッスン準備 (AI)
                            </Link>
                        </div>
                    </div>

                    <LessonScheduler studentId={student.id} studentName={student.name} />

                    <Suspense fallback={
                        <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(156,79,90,0.06)] h-48 flex items-center justify-center text-[#534344] text-sm">
                            読み込み中...
                        </div>
                    }>
                        <LessonList studentId={student.id} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
