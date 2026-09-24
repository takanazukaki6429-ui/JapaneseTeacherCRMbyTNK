/**
 * 生徒の1枚（2026-09-13 かずき決定：案C＝Dの配置を土台に、Eの良い所を足す）
 *
 * - 配置：画面案 生徒の1枚_Dの配置_色E書体E（左に学習の現在地・これまでの記録、右に学習計画・ASTAに聞く・授業の予定・使った教材）
 * - Eの良い所：前回のつまずきをピンクで目立たせる／学習計画の「生徒に渡す」を大きいボタンに
 * - 今あった機能は全部残す（編集・削除・授業前の準備・ライブ授業・記録・ロードマップ・体験レッスン・AIの分析・メモ・授業の予定・この生徒の教材）
 * - データの事実（2026-09-13 本番で確認）：「今の課」を入れる欄は無い。
 *   使用教材＝textbook（105人中17人）／学習計画＝current_phase（「目標Lv.65 / 3ヶ月」の形）／目的＝goal_text／
 *   前回の内容とつまずき＝直近の授業記録の topics（165件中160件）と mistakes（131件）
 * - 「本日の授業指針」は、授業前の1枚の自動作成ができるまでは、前回のつまずきから決まった形の文で出す（つまずきが無ければ出さない）
 */
import Link from 'next/link';
import { PrepGuideBand } from '@/components/students/prep-guide-band';
import { notFound } from 'next/navigation';
import { ArrowLeft, Pencil, Play, ClipboardList, NotebookPen, Send, AlertCircle, Map, MessageCircleQuestion } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Student } from '@/types/student';
import { DeleteStudentButton } from './delete-button';
import { StudentRecords } from '@/components/students/student-records';
import { StudentLessonFlows } from '@/components/lessons/lesson-flow-viewer';
import { LessonScheduler } from '@/components/lessons/lesson-scheduler';
import { AIProfileAnalyzer } from '@/components/students/ai-profile-analyzer';
import { StudentMaterials } from '@/components/students/student-materials';
import { AskAstaStudent } from '@/components/students/ask-asta-student';
import { ShareButton } from '@/components/students/share-button';
import { getLevelDescription } from '@/lib/roadmap/generators';
import { ja } from '@/app/(main)/roadmap/ja';

export const revalidate = 0;

type LessonRow = { date: string; topics: string | null; mistakes: string | null; status: string | null; homework: string | null; next_goal: string | null };

async function getData(id: string) {
    const supabase = await createClient();
    const [{ data: student }, { data: lessons }] = await Promise.all([
        supabase.from('students').select('*').eq('id', id).single(),
        supabase.from('lessons').select('date, topics, mistakes, status, homework, next_goal').eq('student_id', id).order('date', { ascending: false }).limit(20),
    ]);
    if (!student) return null;
    const now = Date.now();
    const last = ((lessons ?? []) as LessonRow[]).find(l => l.status !== 'scheduled' && new Date(l.date).getTime() <= now) ?? null;
    return { student: student as Student, last };
}

/** current_phase（「目標Lv.65 / 3ヶ月」の形）から、学習計画の目標と期間を読む。読めなければ null */
function planOf(phase: string | null) {
    if (!phase) return null;
    const lv = phase.match(/目標Lv\.(\d+)/);
    const mo = phase.match(/(\d+)\s*ヶ月/);
    if (!lv || !mo) return null;
    return { target: getLevelDescription(parseInt(lv[1], 10), ja), months: parseInt(mo[1], 10) };
}

const card = 'bg-white border border-[#e4ddf0] rounded-xl p-6 shadow-[0_2px_16px_rgba(107,92,165,0.05)]';

function Field({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
    return (
        <div className={wide ? 'col-span-2' : ''}>
            <p className="text-xs font-bold text-[#484550] mb-1.5">{label}</p>
            <div className="text-[15px] leading-[26px] text-[#3a3350] border-b border-dashed border-[#d6cfe2] pb-2">{children}</div>
        </div>
    );
}

type Props = { params: Promise<{ id: string }> };

export default async function StudentDetailPage({ params }: Props) {
    const { id } = await params;
    const data = await getData(id);
    if (!data) notFound();
    const { student, last } = data;
    const plan = planOf(student.current_phase);
    const goal = student.goal_text?.replace(/（AI判定）\s*$/, '').trim() || null;
    const mistakes = last?.mistakes?.trim() || null;
    const subButton = 'flex items-center gap-2 px-4 py-2.5 rounded-[10px] bg-[#fbfaff] hover:bg-[#f2eaff] border border-[#e4ddf0] text-[#3a3350] text-[15px] font-semibold transition-colors';

    return (
        <div className="max-w-[1240px] mx-auto pb-12">
            <Link prefetch href="/students" className="inline-flex items-center gap-1.5 text-sm text-[#484550] hover:text-[#3a3350] transition-colors mb-4">
                <ArrowLeft size={16} /> 生徒一覧に戻る
            </Link>

            {/* 上：名前と、今押すボタン */}
            <header className="flex flex-wrap items-center justify-between gap-6 pb-6">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-[28px] leading-[40px] font-bold text-[#3a3350] tracking-wide">{student.name}さん</h1>
                    {student.nationality && <span className="text-xs font-semibold border border-[#d6cfe2] text-[#484550] px-2.5 py-0.5 rounded-full">{student.nationality}</span>}
                    {student.jlpt_level && <span className="text-xs font-semibold bg-[#dff1ea] text-[#2a6f5a] px-2.5 py-0.5 rounded-full">{student.jlpt_level}</span>}
                    <Link prefetch href={`/students/${student.id}/edit`} title="生徒の情報を直す" className="p-2 text-[#484550] hover:text-[#6b5ca5] hover:bg-[#efe9ff] rounded-full transition-colors">
                        <Pencil size={16} />
                    </Link>
                    <DeleteStudentButton id={student.id} />
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <Link prefetch href={`/students/${student.id}/lessons/live`} className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-[#6b5ca5] hover:bg-[#5a4c94] text-white text-[15px] font-bold shadow-sm transition-colors">
                        <Play size={16} fill="currentColor" /> 授業を始める
                    </Link>
                    <Link prefetch href={`/students/${student.id}/lessons/prepare`} className={subButton}>
                        <ClipboardList size={16} /> 授業前の準備
                    </Link>
                    <Link prefetch href={`/students/${student.id}/lessons/new`} className={subButton}>
                        <NotebookPen size={16} /> 記録する
                    </Link>
                </div>
            </header>

            {/* 本日の授業指針：ASTAが作った授業前の1枚の指針を出す（無ければ作る／作れなければ前回のつまずきからの決まった文） */}
            <PrepGuideBand
                studentId={student.id}
                fallbackMistakes={mistakes}
                source={{
                    studentName: student.name,
                    jlptLevel: student.jlpt_level,
                    textbook: student.textbook,
                    lastDate: last?.date ?? null,
                    topics: last?.topics ?? null,
                    mistakes: last?.mistakes ?? null,
                    homework: last?.homework ?? null,
                    nextGoal: last?.next_goal ?? null,
                }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* 左：学習の現在地・これまでの記録・AIの分析 */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <section className={card}>
                        <div className="flex items-center justify-between pb-4 border-b border-[#efe9f8] mb-5">
                            <h2 className="text-[20px] leading-[30px] font-bold text-[#3a3350]">学習の現在地</h2>
                            <Link prefetch href={`/students/${student.id}/edit`} className="text-xs text-[#484550] hover:text-[#6b5ca5] flex items-center gap-1 transition-colors">
                                <Pencil size={12} /> 項目を直す
                            </Link>
                        </div>
                        <div className="grid grid-cols-2 gap-y-5 gap-x-6">
                            <Field label="使用教材">{student.textbook || '未設定'}</Field>
                            <Field label="前回の内容">{last ? (last.topics?.trim() || '記録なし') : 'まだ授業の記録がありません'}</Field>
                            <Field label="学習の目的" wide>
                                {goal ? <span className="inline-block text-sm font-semibold bg-[#dff1ea] text-[#2a6f5a] px-2.5 py-0.5 rounded-full">{goal}</span> : '未設定'}
                            </Field>
                            <div className="col-span-2">
                                <p className="text-xs font-bold text-[#484550] mb-1.5">前回のつまずき</p>
                                {mistakes ? (
                                    <div className="bg-[#fbe7ed] border border-[#f3c9d5] rounded-lg px-4 py-3 flex items-start gap-2 text-[15px] leading-[26px] font-semibold text-[#a8475f]">
                                        <AlertCircle size={16} className="mt-1 flex-shrink-0" /> <span className="whitespace-pre-wrap">{mistakes}</span>
                                    </div>
                                ) : (
                                    <p className="text-[15px] text-[#3a3350] border-b border-dashed border-[#d6cfe2] pb-2">記録なし</p>
                                )}
                            </div>
                            <Field label="メモ" wide><span className="whitespace-pre-wrap">{student.memo || 'なし'}</span></Field>
                        </div>
                    </section>

                    <StudentRecords studentId={student.id} />

                    {/* 過去の授業でASTAが作った物（絵・例文・練習問題・言い換え・会話）2026-09-20 かずき指示 */}
                    <StudentLessonFlows studentId={student.id} />

                    <AIProfileAnalyzer student={student} />
                </div>

                {/* 右：学習計画・ASTAに聞く・授業の予定・使った教材 */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                    <section className={card}>
                        <div className="flex items-center justify-between pb-3 border-b border-[#efe9f8] mb-4">
                            <h2 className="text-[17px] font-bold text-[#3a3350]">学習計画</h2>
                            {student.initial_hearing_done && <span className="text-xs font-semibold bg-[#efe9ff] text-[#6b5ca5] px-2 py-0.5 rounded-full">体験レッスン済み</span>}
                        </div>
                        {plan ? (
                            <>
                                <p className="text-xs font-bold text-[#484550]">目標</p>
                                <p className="text-[20px] leading-[30px] font-bold text-[#6b5ca5] mt-0.5">{plan.months}か月で{plan.target}へ</p>
                                {/* Eの良い所：生徒に渡すを大きいボタンに */}
                                <ShareButton studentId={student.id} />
                                <div className="mt-3 flex items-center justify-between text-sm">
                                    <Link prefetch href={`/students/${student.id}/roadmap`} className="text-[#6b5ca5] font-semibold hover:underline flex items-center gap-1"><Map size={14} /> ロードマップを見る</Link>
                                    <Link prefetch href={`/students/${student.id}/initial-hearing`} className="text-[#484550] hover:text-[#6b5ca5] hover:underline">体験レッスンを見る</Link>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-[15px] text-[#3a3350]">学習計画がまだありません。体験レッスンの聞き取りから作れます。</p>
                                <Link prefetch href={`/students/${student.id}/initial-hearing`} className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#6b5ca5] hover:bg-[#5a4c94] text-white text-[15px] font-bold shadow-sm transition-colors">
                                    <MessageCircleQuestion size={16} /> 体験レッスンから作る
                                </Link>
                            </>
                        )}
                    </section>

                    <AskAstaStudent studentName={student.name} />

                    <LessonScheduler studentId={student.id} studentName={student.name} />

                    <StudentMaterials studentId={student.id} studentName={student.name} />
                </div>
            </div>
        </div>
    );
}
