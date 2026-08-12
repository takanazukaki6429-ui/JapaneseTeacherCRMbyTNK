import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BookOpen, Image as ImageIcon } from 'lucide-react';
import { MaterialsTabBar } from '../tab-bar';
import { LevelTabs } from './level-tabs';
import type { JlptLevel, MasterMaterialRow } from '@/types/master-material';

export const revalidate = 0;

const LEVELS: JlptLevel[] = ['N5', 'N4', 'N3', 'N2'];

async function getLessons(level: JlptLevel) {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('master_materials')
        .select('id, jlpt_level, lesson_number, lesson_sub, lesson_label, title, image_count')
        .eq('jlpt_level', level)
        .order('lesson_number', { ascending: true })
        .order('lesson_sub', { ascending: true });
    if (error) return [];
    return data as MasterMaterialRow[];
}

async function getCounts() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('master_materials')
        .select('jlpt_level');
    if (error) return {} as Record<string, number>;
    return (data as { jlpt_level: string }[]).reduce<Record<string, number>>((acc, r) => {
        acc[r.jlpt_level] = (acc[r.jlpt_level] ?? 0) + 1;
        return acc;
    }, {});
}

type Props = { searchParams: Promise<{ level?: string }> };

export default async function TextbookPage({ searchParams }: Props) {
    const { level: raw } = await searchParams;
    const level = (LEVELS.includes(raw as JlptLevel) ? raw : 'N5') as JlptLevel;
    const [lessons, counts] = await Promise.all([getLessons(level), getCounts()]);

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">教材</h1>
            </div>

            <MaterialsTabBar currentTab="textbook" />

            <div className="bg-white px-5 py-4 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)]">
                <div className="flex items-center gap-2 mb-1">
                    <BookOpen size={18} className="text-[#6f5385]" />
                    <h2 className="text-sm font-bold text-[#1a1c1e]">教科書</h2>
                </div>
                <p className="text-xs text-[#4b454e] leading-relaxed">
                    あいちゃん監修のマスター教材です。授業中にそのまま開いて使えます。
                </p>
            </div>

            <LevelTabs current={level} counts={counts} />

            {lessons.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-[#cdc3ce]/40 text-center">
                    <div className="text-4xl mb-4">📖</div>
                    <h3 className="text-base font-bold text-[#1a1c1e] mb-1">
                        {level} の教科書がまだありません
                    </h3>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {lessons.map(lesson => (
                        <Link
                            key={lesson.id}
                            href={`/materials/textbook/${lesson.id}`}
                            className="group flex flex-col p-4 bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] hover:shadow-[0_8px_40px_rgba(111,83,133,0.12)] hover:-translate-y-0.5 transition-all"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#f2daff] text-[#6f5385] rounded-full">
                                    {lesson.lesson_label ?? `第${lesson.lesson_number}課`}
                                </span>
                                {lesson.image_count > 0 && (
                                    <span className="inline-flex items-center gap-1 text-[11px] text-[#4b454e]">
                                        <ImageIcon size={11} />
                                        {lesson.image_count}
                                    </span>
                                )}
                            </div>
                            <h3 className="text-sm font-bold text-[#1a1c1e] group-hover:text-[#6f5385] transition-colors line-clamp-2 leading-snug">
                                {lesson.title}
                            </h3>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
