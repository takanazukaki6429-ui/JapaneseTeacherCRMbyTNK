/**
 * ホーム（2026-09-11 かずき決定：配置＝E、色＝D、書体＝E）
 *
 * 役目：開いた瞬間に「生徒の様子」と「やり残し」が分かる（画面の要素一覧_2026-09-10.md 画面1）
 * - 左：生徒カード。授業が空いている生徒を上に（記録がまだ → 最終授業日が古い順）
 * - 右：ASTAからの声かけ（次の授業の準備／宿題を出していない／学習計画がまだ）。0件なら畳む
 * - 下：ASTAに聞く
 * - 出さない：先生の実績数字（コマ数・理解度など。目的とズレるため・かずき決定）
 * - 「記録が下書きのまま」は授業記録の自動下書き（B）ができてから足す
 */
import Link from 'next/link';
import { CalendarDays, ClipboardList, FileCheck2, CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AddStudentInline } from '@/components/home/add-student-inline';
import { AskAsta } from '@/components/home/ask-asta';

export const revalidate = 0;

const DAY = 24 * 60 * 60 * 1000;
const LONG_GAP_DAYS = 14;      // これより空いたら「しばらく授業なし」
const SHOW_STUDENTS = 6;
const SHOW_NOTICES = 5;

type StudentRow = {
    id: string; name: string; nationality: string | null; jlpt_level: string | null;
    textbook: string | null; current_phase: string | null; initial_hearing_done: boolean | null;
};
type LessonRow = {
    id: string; student_id: string; date: string; status: string | null;
    mistakes: string | null; homework: string | null;
};

/** 日本時間で「9月11日（金）」の形にする */
function jpDate(iso: string | number, withTime = false): string {
    const parts = new Intl.DateTimeFormat('ja-JP', {
        timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short',
        ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
    }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return `${get('month')}月${get('day')}日（${get('weekday')}）${withTime ? ` ${get('hour')}:${get('minute')}` : ''}`;
}

async function getHomeData() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const [settingsResult, studentsResult, lessonsResult] = await Promise.all([
        supabase.from('user_settings').select('display_name').eq('user_id', user.id).maybeSingle(),
        supabase.from('students')
            .select('id, name, nationality, jlpt_level, textbook, current_phase, initial_hearing_done')
            .eq('user_id', user.id),
        supabase.from('lessons')
            .select('id, student_id, date, status, mistakes, homework, students!inner(user_id)')
            .eq('students.user_id', user.id)
            .order('date', { ascending: false })
            .limit(2000),
    ]);

    const students = (studentsResult.data ?? []) as unknown as StudentRow[];
    const lessons = (lessonsResult.data ?? []) as unknown as LessonRow[];
    const now = Date.now();

    const cards = students.map(st => {
        const own = lessons.filter(l => l.student_id === st.id);
        const past = own.filter(l => l.status !== 'scheduled' && new Date(l.date).getTime() <= now);
        const last = past[0] ?? null;   // 日付の新しい順に並んでいる
        const next = own
            .filter(l => l.status === 'scheduled' && new Date(l.date).getTime() >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] ?? null;
        const daysSince = last ? Math.floor((now - new Date(last.date).getTime()) / DAY) : null;
        const noPlan = !st.initial_hearing_done && !st.current_phase;
        const marks: string[] = [];
        if (daysSince === null) marks.push('授業の記録がまだ');
        else if (daysSince >= LONG_GAP_DAYS) marks.push('しばらく授業なし');
        if (noPlan) marks.push('学習計画がまだ');
        return { st, last, next, daysSince, noPlan, marks };
    }).sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

    type Notice = { key: string; icon: 'next' | 'homework' | 'plan'; text: string; label: string; href: string; tone: 'rose' | 'lavender' };
    const nextNotices: Notice[] = [], homeworkNotices: Notice[] = [], planNotices: Notice[] = [];
    for (const c of cards) {
        if (c.next && new Date(c.next.date).getTime() - now <= 7 * DAY) {
            nextNotices.push({ key: `next-${c.st.id}`, icon: 'next', tone: 'rose',
                text: `${c.st.name}さんの授業が ${jpDate(c.next.date, true)} にあります`,
                label: '授業前の準備', href: `/students/${c.st.id}/lessons/prepare?scheduledLessonId=${c.next.id}` });
        }
        if (c.last && c.daysSince !== null && c.daysSince < LONG_GAP_DAYS && !c.last.homework?.trim()) {
            homeworkNotices.push({ key: `hw-${c.st.id}`, icon: 'homework', tone: 'lavender',
                text: `${c.st.name}さんに前回の授業で宿題を出していません`,
                label: '次の授業の準備へ', href: `/students/${c.st.id}/lessons/prepare` });
        }
        if (c.noPlan) {
            planNotices.push({ key: `plan-${c.st.id}`, icon: 'plan', tone: 'rose',
                text: `${c.st.name}さんの学習計画がまだありません`,
                label: '体験レッスンから作る', href: `/students/${c.st.id}/initial-hearing` });
        }
    }
    const notices = [...nextNotices, ...homeworkNotices, ...planNotices].slice(0, SHOW_NOTICES);

    const rawName = settingsResult.data?.display_name as string | undefined;
    const teacherName = rawName ? (rawName.endsWith('先生') ? rawName : `${rawName}先生`) : '先生';

    return { cards, notices, teacherName, today: jpDate(now), total: students.length };
}

const NOTICE_ICON = { next: CalendarClock, homework: FileCheck2, plan: ClipboardList };

export default async function Home() {
    const data = await getHomeData();
    if (!data) return null;
    const { cards, notices, teacherName, today, total } = data;
    const shown = cards.slice(0, SHOW_STUDENTS);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-12">
            <div>
                <p className="text-sm text-[#534344]">{today}</p>
                <h1 className="text-2xl font-bold text-[#3b2e2a] mt-1">{teacherName}、お疲れさまです</h1>
            </div>

            <div className={notices.length > 0 ? 'grid grid-cols-1 lg:grid-cols-3 gap-8' : ''}>
                {/* 左：生徒の様子 */}
                <section className={notices.length > 0 ? 'lg:col-span-2 space-y-4' : 'space-y-4'}>
                    <h2 className="text-lg font-bold text-[#3b2e2a] flex items-center gap-2">
                        生徒の様子 <span className="w-1.5 h-1.5 rounded-full bg-[#d9a7ae]" />
                    </h2>

                    {total === 0 && (
                        <div className="bg-white rounded-3xl p-6 shadow-[0_2px_24px_rgba(156,79,90,0.06)]">
                            <p className="text-[15px] font-bold text-[#3b2e2a]">まず生徒を1人登録しましょう</p>
                            <p className="text-sm text-[#534344] mt-1">下の「生徒を追加」から、この画面のまま登録できます。</p>
                        </div>
                    )}

                    {shown.map(({ st, last, daysSince, marks }) => (
                        <div key={st.id} className="bg-white rounded-3xl p-6 shadow-[0_2px_24px_rgba(156,79,90,0.06)]">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Link href={`/students/${st.id}`} className="text-lg font-bold text-[#3b2e2a] hover:text-[#9c4f5a] tracking-wide">
                                            {st.name}さん
                                        </Link>
                                        {st.nationality && <span className="text-xs font-semibold bg-[#f1e7da] text-[#664928] px-2.5 py-0.5 rounded-full">{st.nationality}</span>}
                                        {st.jlpt_level && <span className="text-xs font-semibold bg-[#ece8f3] text-[#6b5b8c] px-2.5 py-0.5 rounded-full">{st.jlpt_level}</span>}
                                        {marks.map(m => (
                                            <span key={m} className="text-xs font-semibold bg-[#f8e8e7] text-[#9c4f5a] px-2.5 py-0.5 rounded-full">{m}</span>
                                        ))}
                                    </div>
                                    <p className="text-[15px] text-[#3b2e2a] mt-2">
                                        <span className="text-[#9c4f5a] font-semibold">今の課：</span>{st.textbook || '未設定'}
                                    </p>
                                </div>
                                <Link
                                    href={`/students/${st.id}/lessons/live`}
                                    className="flex-shrink-0 bg-[#9c4f5a] hover:bg-[#8a434d] text-white text-[15px] font-bold px-5 py-2.5 rounded-full transition-colors"
                                >
                                    授業を始める
                                </Link>
                            </div>
                            {last && (
                                <div className="mt-4 bg-[#f7f3ec] rounded-2xl px-4 py-3 space-y-2">
                                    {last.mistakes?.trim() && (
                                        <p className="text-[15px] text-[#3b2e2a] line-clamp-2">
                                            <span className="text-sm font-semibold text-[#9c4f5a] mr-1">前回のつまずき：</span>{last.mistakes.trim()}
                                        </p>
                                    )}
                                    <p className="text-xs text-[#534344] flex items-center gap-1.5">
                                        <CalendarDays size={13} /> 最終授業日：{jpDate(last.date)}（{daysSince === 0 ? '今日' : `${daysSince}日前`}）
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}

                    {total > SHOW_STUDENTS && (
                        <Link href="/students" className="block text-center text-sm font-bold text-[#9c4f5a] hover:underline">
                            ほかの{total - SHOW_STUDENTS}人の生徒を見る
                        </Link>
                    )}

                    <AddStudentInline openByDefault={total === 0} />
                </section>

                {/* 右：ASTAからの声かけ（0件なら出さない） */}
                {notices.length > 0 && (
                    <section className="space-y-4">
                        <h2 className="text-lg font-bold text-[#3b2e2a] flex items-center gap-2">
                            ASTAからの声かけ <span className="w-1.5 h-1.5 rounded-full bg-[#6b5b8c]" />
                        </h2>
                        {notices.map(n => {
                            const Icon = NOTICE_ICON[n.icon];
                            return (
                                <div key={n.key} className="bg-white rounded-3xl p-5 shadow-[0_2px_24px_rgba(156,79,90,0.06)]">
                                    <p className="text-[15px] text-[#3b2e2a] flex items-start gap-3">
                                        <Icon size={18} className="text-[#534344] flex-shrink-0 mt-0.5" />
                                        {n.text}
                                    </p>
                                    <div className="flex justify-end mt-3">
                                        <Link
                                            href={n.href}
                                            className={n.tone === 'rose'
                                                ? 'text-sm font-bold bg-[#f8e8e7] text-[#9c4f5a] hover:bg-[#f3dcdb] px-4 py-2 rounded-full transition-colors'
                                                : 'text-sm font-bold bg-[#ece8f3] text-[#6b5b8c] hover:bg-[#e0daec] px-4 py-2 rounded-full transition-colors'}
                                        >
                                            {n.label}
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </section>
                )}
            </div>

            {/* 下：ASTAに聞く */}
            <AskAsta />

        </div>
    );
}
