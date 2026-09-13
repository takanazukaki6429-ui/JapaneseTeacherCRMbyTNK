/**
 * 生徒の1枚の「これまでの記録」（2026-09-13：生徒の1枚を案Cで作り直したときに、以前のレッスン履歴の一覧から置き換え）
 * 新しい順。1行を押すと、つまずき・宿題などが開く（いちばん新しい記録は最初から開いておく）。
 */
import Link from 'next/link';
import { Plus, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';

type Row = {
    id: string; date: string; topics: string | null; mistakes: string | null; homework: string | null;
    content: string | null; understanding_level: number | null; status: string | null;
};

/** 理解度（1〜5）の呼び方と色 */
function levelChip(level: number | null) {
    if (!level) return null;
    if (level >= 5) return { label: 'よくできた', cls: 'bg-[#dff1ea] text-[#2a6f5a]' };
    if (level === 4) return { label: 'だいたいできた', cls: 'bg-[#dff1ea] text-[#2a6f5a]' };
    if (level === 3) return { label: 'まあまあ', cls: 'bg-[#efe9ff] text-[#6b5ca5]' };
    return { label: 'もう少し', cls: 'bg-[#fbe7ed] text-[#a8475f]' };
}

/** 日本時間で「9月3日（木）」の形にする */
function jpDate(iso: string): string {
    const parts = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' }).formatToParts(new Date(iso));
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return `${get('month')}月${get('day')}日（${get('weekday')}）`;
}

/** この生徒の、終わった授業の記録（新しい順・予定の分は除く） */
async function getPastLessons(studentId: string): Promise<Row[]> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('lessons')
        .select('id, date, topics, mistakes, homework, content, understanding_level, status')
        .eq('student_id', studentId)
        .order('date', { ascending: false })
        .limit(30);
    const now = Date.now();
    return ((data ?? []) as Row[]).filter(l => l.status !== 'scheduled' && new Date(l.date).getTime() <= now);
}

export async function StudentRecords({ studentId }: { studentId: string }) {
    const lessons = await getPastLessons(studentId);

    return (
        <section className="bg-white border border-[#e4ddf0] rounded-xl p-6 shadow-[0_2px_16px_rgba(107,92,165,0.05)]">
            <div className="flex items-center justify-between pb-4 border-b border-[#efe9f8] mb-2">
                <div className="flex items-baseline gap-3">
                    <h2 className="text-[20px] leading-[30px] font-bold text-[#3a3350]">これまでの記録</h2>
                    <span className="text-xs text-[#484550]">新しい順（行を押すと開きます）</span>
                </div>
                <Link prefetch href={`/students/${studentId}/lessons/new`} className="inline-flex items-center gap-1.5 text-sm font-bold text-[#6b5ca5] bg-[#efe9ff] hover:bg-[#e7deff] px-3 py-1.5 rounded-lg transition-colors">
                    <Plus size={15} /> 記録をつける
                </Link>
            </div>

            {lessons.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-[15px] text-[#3a3350]">まだ記録がありません</p>
                    <p className="text-xs text-[#484550] mt-1">授業のあとに「記録をつける」から最初の記録を残しましょう。</p>
                </div>
            ) : (
                <div className="divide-y divide-[#efe9f8]">
                    {lessons.map((l, i) => {
                        const chip = levelChip(l.understanding_level);
                        return (
                            <details key={l.id} open={i === 0} className="group py-3.5">
                                <summary className="list-none cursor-pointer flex items-center justify-between gap-3">
                                    <span className="flex items-center gap-3 min-w-0">
                                        <span className="text-[15px] font-bold text-[#3a3350] whitespace-nowrap">{jpDate(l.date)}</span>
                                        <span className="text-[15px] text-[#3a3350] truncate">{l.topics?.trim() || '内容の記録なし'}</span>
                                    </span>
                                    <span className="flex items-center gap-2 flex-shrink-0">
                                        {chip && <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${chip.cls}`}>理解度：{chip.label}</span>}
                                        <ChevronDown size={16} className="text-[#484550] transition-transform group-open:rotate-180" />
                                    </span>
                                </summary>
                                <div className="mt-2.5 space-y-2 pl-1 text-[15px] leading-[26px] text-[#3a3350]">
                                    {l.mistakes?.trim() && (
                                        <p className="flex items-start gap-2"><span className="text-xs font-bold bg-[#fbe7ed] text-[#a8475f] px-2 py-0.5 rounded mt-1 flex-shrink-0">つまずき</span><span className="whitespace-pre-wrap">{l.mistakes.trim()}</span></p>
                                    )}
                                    {l.homework?.trim() && (
                                        <p className="flex items-start gap-2"><span className="text-xs font-bold bg-[#efe9ff] text-[#6b5ca5] px-2 py-0.5 rounded mt-1 flex-shrink-0">宿題</span><span className="whitespace-pre-wrap">{l.homework.trim()}</span></p>
                                    )}
                                    {!l.topics?.trim() && !l.mistakes?.trim() && l.content?.trim() && (
                                        <p className="whitespace-pre-wrap line-clamp-3">{l.content.trim()}</p>
                                    )}
                                    {!l.mistakes?.trim() && !l.homework?.trim() && !(l.content?.trim() && !l.topics?.trim()) && (
                                        <p className="text-sm text-[#484550]">つまずき・宿題の記録はありません</p>
                                    )}
                                </div>
                            </details>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
