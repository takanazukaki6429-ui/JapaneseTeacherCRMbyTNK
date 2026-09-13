/**
 * ホーム（2026-09-11 かずき決定：配置＝E、色＝E、書体＝E）
 * 画面案 strategy/デザイン案_色D書体E_2026-09-11/ホーム_色D書体E.html をそのまま写し、中身を本物のデータにつないだもの。
 *
 * 役目：開いた瞬間に「生徒の様子」と「やり残し」が分かる（画面の要素一覧_2026-09-10.md 画面1）
 * - 左：生徒カード。授業が空いている生徒を上に（記録がまだ → 最終授業日が古い順）
 * - 右：ASTAからの声かけ（次の授業の準備／宿題を出していない／学習計画がまだ）。0件なら出さない
 * - 上：ASTAに聞く（授業の相談）。あいさつのすぐ下。使い方の質問は右下の「使い方ヘルプ」
 * - 出さない：先生の実績数字（コマ数・理解度など。目的とズレるため・かずき決定）
 * - 「記録が下書きのまま」は授業記録の自動下書き（B）ができてから足す
 */
import Link from 'next/link';
import { CalendarDays, ClipboardList, ListChecks, CalendarClock } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { AddStudentInline } from '@/components/home/add-student-inline';
import { AskAsta } from '@/components/home/ask-asta';

export const revalidate = 0;

const DAY = 24 * 60 * 60 * 1000;
const LONG_GAP_DAYS = 14;      // これより空いたら「しばらく授業なし」
const SHOW_STUDENTS = 6;
const SHOW_NOTICES = 5;

// 画面案の「カードの影」「押せるカードの動き」
const CARD = 'bg-white border border-[#e8ddff]/30 shadow-[0_10px_30px_-5px_rgba(107,92,165,0.08)] transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_-4px_rgba(107,92,165,0.12)]';
const CHIP = 'text-[12px] leading-[18px] px-2.5 py-0.5 rounded-full';

type StudentRow = {
    id: string; name: string; nationality: string | null; jlpt_level: string | null;
    textbook: string | null; current_phase: string | null; initial_hearing_done: boolean | null;
};
type LessonRow = {
    id: string; student_id: string; date: string; status: string | null;
    topics: string | null; mistakes: string | null; homework: string | null;
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
            .select('id, student_id, date, status, topics, mistakes, homework, students!inner(user_id)')
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
        const marks: { text: string; tone: 'beige' | 'rose' }[] = [];
        if (daysSince === null) marks.push({ text: '授業の記録がまだ', tone: 'beige' });
        else if (daysSince >= LONG_GAP_DAYS) marks.push({ text: 'しばらく授業なし', tone: 'beige' });
        if (noPlan) marks.push({ text: '学習計画がまだ', tone: 'rose' });
        return { st, last, next, daysSince, noPlan, marks };
    }).sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

    type Notice = { key: string; icon: 'next' | 'homework' | 'plan'; text: string; label: string; href: string; tone: 'beige' | 'lavender' };
    const nextNotices: Notice[] = [], homeworkNotices: Notice[] = [], planNotices: Notice[] = [];
    for (const c of cards) {
        if (c.next && new Date(c.next.date).getTime() - now <= 7 * DAY) {
            nextNotices.push({ key: `next-${c.st.id}`, icon: 'next', tone: 'lavender',
                text: `${c.st.name}さんの授業が ${jpDate(c.next.date, true)} にあります`,
                label: '授業前の準備', href: `/students/${c.st.id}/lessons/prepare?scheduledLessonId=${c.next.id}` });
        }
        if (c.last && c.daysSince !== null && c.daysSince < LONG_GAP_DAYS && !c.last.homework?.trim()) {
            homeworkNotices.push({ key: `hw-${c.st.id}`, icon: 'homework', tone: 'lavender',
                text: `${c.st.name}さんに宿題を出していません`,
                label: '宿題を作る', href: `/students/${c.st.id}/lessons/prepare` });
        }
        if (c.noPlan) {
            planNotices.push({ key: `plan-${c.st.id}`, icon: 'plan', tone: 'beige',
                text: `${c.st.name}さんの学習計画がまだありません`,
                label: '体験レッスンから作る', href: `/students/${c.st.id}/initial-hearing` });
        }
    }
    const notices = [...nextNotices, ...homeworkNotices, ...planNotices].slice(0, SHOW_NOTICES);

    const rawName = settingsResult.data?.display_name as string | undefined;
    const teacherName = rawName ? (rawName.endsWith('先生') ? rawName : `${rawName}先生`) : '先生';

    return { cards, notices, teacherName, today: jpDate(now), total: students.length };
}

const NOTICE_ICON = { next: CalendarClock, homework: ListChecks, plan: ClipboardList };

/** 画面案の余白の飾り（葉と星の線画）。押せない・読み上げない */
function Decorations() {
    return (
        <div aria-hidden className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-30">
            <svg className="absolute -top-12 -right-12 w-96 h-96 text-[#6b5ca5] stroke-current fill-none" strokeWidth="0.75" viewBox="0 0 200 200">
                <path d="M120,20 C140,60 170,80 180,120 C190,160 150,180 110,180 C70,180 30,150 40,100 C50,50 100,-20 120,20 Z" strokeDasharray="3 3" />
                <path d="M140,50 Q160,90 120,130 Q100,100 140,50" />
                <circle cx="165" cy="85" fill="#6b5ca5" opacity="0.4" r="3" />
                <circle cx="95" cy="140" fill="#6b5ca5" opacity="0.3" r="2.5" />
            </svg>
            <svg className="absolute bottom-10 left-72 w-80 h-80 text-[#6b5ca5] stroke-current fill-none" strokeWidth="0.6" viewBox="0 0 200 200">
                <path d="M30,160 Q80,120 70,70 Q100,100 130,90 Q90,140 30,160" />
                <path d="M70,70 Q60,40 40,50 Q50,70 70,70" />
                <circle cx="135" cy="85" fill="#6b5ca5" opacity="0.4" r="2" />
            </svg>
            <svg className="absolute top-1/2 right-1/4 w-32 h-32 text-[#6b5ca5] stroke-current fill-none" strokeWidth="0.8" viewBox="0 0 100 100">
                <path d="M50,15 L53,35 L73,38 L55,48 L60,68 L45,55 L30,68 L35,48 L17,38 L37,35 Z" opacity="0.25" />
            </svg>
        </div>
    );
}

export default async function Home() {
    const data = await getHomeData();
    if (!data) return null;
    const { cards, notices, teacherName, today, total } = data;
    const shown = cards.slice(0, SHOW_STUDENTS);

    return (
        <>
            <Decorations />
            <div className="relative z-10 max-w-[1160px] flex flex-col">
                <header className="mb-8">
                    <p className="text-[12px] leading-[18px] text-[#6b5ca5] font-medium tracking-wide">{today}</p>
                    <h1 className="text-[24px] leading-[36px] font-semibold text-[#3a3350] mt-1">{teacherName}、お疲れさまです</h1>
                </header>
                {/* 上：ASTAに聞く（授業の相談）。2026-09-12 かずき指示で最上段へ */}
                <AskAsta />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-10">
                    {/* 左：生徒の様子 */}
                    <section className={`${notices.length > 0 ? 'lg:col-span-7' : 'lg:col-span-12'} flex flex-col gap-5`}>
                        <h2 className="text-[20px] leading-[30px] font-bold text-[#3a3350] flex items-center gap-2">
                            生徒の様子
                            <span className="inline-block w-2 h-2 rounded-full bg-[#6b5ca5]/40" />
                        </h2>

                        <div className="space-y-4">
                            {total === 0 && (
                                <article className={`${CARD} rounded-3xl p-6`}>
                                    <p className="text-[18px] leading-[28px] font-bold text-[#3a3350]">まず生徒を1人登録しましょう</p>
                                    <p className="text-[15px] leading-[26px] text-[#484550] mt-1">下の「生徒を追加」から、この画面のまま登録できます。</p>
                                </article>
                            )}

                            {shown.map(({ st, last, daysSince, marks }) => (
                                <article key={st.id} className={`${CARD} rounded-3xl p-6 flex flex-col gap-4`}>
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Link href={`/students/${st.id}`} className="text-[18px] leading-[28px] font-bold text-[#3a3350] hover:text-[#6b5ca5]">
                                                    {st.name}さん
                                                </Link>
                                                {st.nationality && <span className={`${CHIP} text-[#484550] bg-[#f2eaff]`}>{st.nationality}</span>}
                                                {st.jlpt_level && <span className={`${CHIP} font-semibold bg-[#dff1ea] text-[#2a6f5a]`}>{st.jlpt_level}</span>}
                                                {marks.map(m => (
                                                    <span key={m.text} className={`${CHIP} font-semibold ${m.tone === 'beige' ? 'bg-[#fbe7ed] text-[#a8475f]' : 'bg-[#ede4ff] text-[#6b5ca5]'}`}>{m.text}</span>
                                                ))}
                                            </div>
                                            <p className="text-[15px] leading-[26px] text-[#484550] mt-2">
                                                <span className="font-medium text-[#6b5ca5]">前回の内容：</span>{last ? (last.topics?.trim() || '記録なし') : 'まだ授業の記録がありません'}
                                            </p>
                                        </div>
                                        <Link
                                            href={`/students/${st.id}/lessons/live`}
                                            className="shrink-0 bg-[#6b5ca5] text-white hover:opacity-95 active:scale-[0.98] transition-all px-5 py-2.5 rounded-2xl text-[15px] leading-[22px] font-semibold shadow-sm"
                                        >
                                            授業を始める
                                        </Link>
                                    </div>
                                    <div className="bg-[#f8f1ff] rounded-2xl p-3.5 space-y-1.5 border border-[#e8ddff]/20">
                                        {last?.mistakes?.trim() ? (
                                            <p className="text-[15px] leading-[26px] text-[#3a3350] line-clamp-2">
                                                <span className="text-[12px] leading-[18px] font-medium text-[#6b5ca5] block sm:inline">前回のつまずき：</span>
                                                {last.mistakes.trim()}
                                            </p>
                                        ) : (
                                            <p className="text-[15px] leading-[26px] text-[#484550]">
                                                {last ? '前回の記録に、つまずきの記入はありません' : '授業の記録はまだありません'}
                                            </p>
                                        )}
                                        {last && (
                                            <div className="text-[12px] leading-[18px] text-[#484550] flex items-center gap-1.5 pt-1 border-t border-[#e8ddff]/30">
                                                <CalendarDays size={15} className="text-[#6b5ca5]/70" />
                                                <span>最終授業日：{jpDate(last.date)}（{daysSince === 0 ? '今日' : `${daysSince}日前`}）</span>
                                            </div>
                                        )}
                                    </div>
                                </article>
                            ))}

                            {total > SHOW_STUDENTS && (
                                <Link href="/students" className="block text-center text-[15px] font-semibold text-[#6b5ca5] hover:underline">
                                    ほかの{total - SHOW_STUDENTS}人の生徒を見る
                                </Link>
                            )}
                        </div>

                        <AddStudentInline openByDefault={total === 0} />
                    </section>

                    {/* 右：ASTAからの声かけ（0件なら出さない） */}
                    {notices.length > 0 && (
                        <section className="lg:col-span-5 flex flex-col gap-5">
                            <h2 className="text-[20px] leading-[30px] font-bold text-[#3a3350] flex items-center gap-2">
                                ASTAからの声かけ
                                <span className="inline-block w-2 h-2 rounded-full bg-[#1b6a55]" />
                            </h2>
                            <div className="space-y-4">
                                {notices.map(n => {
                                    const Icon = NOTICE_ICON[n.icon];
                                    return (
                                        <article key={n.key} className={`${CARD} rounded-3xl p-5 flex flex-col gap-3.5`}>
                                            <div className="flex items-start gap-3">
                                                <Icon size={24} strokeWidth={1.5} className="text-[#6b5ca5] mt-0.5 shrink-0" />
                                                <p className="text-[15px] leading-relaxed text-[#3a3350]">{n.text}</p>
                                            </div>
                                            <div className="flex justify-end">
                                                <Link
                                                    href={n.href}
                                                    className={n.tone === 'lavender'
                                                        ? 'bg-[#dff1ea] text-[#2a6f5a] hover:bg-[#cfebd0] active:scale-[0.98] transition-all px-4 py-2.5 rounded-xl text-[15px] leading-[22px] font-medium'
                                                        : 'bg-[#f2eaff] hover:bg-[#ede4ff] text-[#6b5ca5] active:scale-[0.98] transition-all px-4 py-2.5 rounded-xl text-[15px] leading-[22px] font-medium'}
                                                >
                                                    {n.label}
                                                </Link>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>

            </div>
        </>
    );
}
