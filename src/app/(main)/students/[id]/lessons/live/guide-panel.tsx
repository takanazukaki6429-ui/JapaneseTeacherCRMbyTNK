'use client';

/**
 * ライブ授業の左パネル「きょうの進め方」（UI改修 第二段階・2026-08-16）
 *
 * 設計方針「道具箱から助手へ」：初めての先生でも、ここを上から
 * なぞるだけで授業が進む「台本」にする。
 * - 上：準備データ（あれば）＝最初にやること
 * - 中：今日の課を選ぶ → その課の流れがステップとして並ぶ
 * - ステップを押すと中身がその場で開く（別画面に飛ばない）
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, ExternalLink, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import {
    SECTION_LABELS,
    type SectionType,
} from '@/types/master-material';

type Lesson = {
    id: string;
    jlpt_level: string;
    lesson_number: number;
    lesson_sub: number;
    lesson_label: string | null;
    title: string;
};

type Section = {
    section_type: SectionType;
    section_order: number;
    content_md: string;
};

type KeyPoint = { question: string; answer: string };
type PrepContent = { review_quiz: KeyPoint[]; intro_topic: string; advice: string };

const LEVELS = ['N5', 'N4', 'N3', 'N2'];

// 授業の流れとして見せる順。教師用メモや解答例は台本には出さない
const GUIDE_TYPES: SectionType[] = [
    'theme', 'goals', 'expressions', 'vocabulary', 'grammar',
    'conversation', 'speaking', 'exercises', 'reading', 'listening',
    'summary', 'homework',
];

type Props = {
    studentId: string;
    prepContent: PrepContent | null;
    lessonId: string;
    onLessonChange: (id: string) => void;
};

export function GuidePanel({ prepContent, lessonId, onLessonChange }: Props) {
    const [level, setLevel] = useState('N5');
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [sections, setSections] = useState<Section[]>([]);
    const [openStep, setOpenStep] = useState<number | null>(null);

    useEffect(() => {
        const supabase = createClient();
        supabase
            .from('master_materials')
            .select('id, jlpt_level, lesson_number, lesson_sub, lesson_label, title')
            .eq('jlpt_level', level)
            .order('lesson_number')
            .order('lesson_sub')
            .then(({ data }) => {
                setLessons((data as Lesson[]) ?? []);
                onLessonChange('');
            });
    }, [level]);   // onLessonChange は親で useCallback 済み

    useEffect(() => {
        if (!lessonId) { setSections([]); setOpenStep(null); return; }
        const supabase = createClient();
        supabase
            .from('master_material_sections')
            .select('section_type, section_order, content_md')
            .eq('master_material_id', lessonId)
            .order('section_order')
            .then(({ data }) => {
                const all = (data as Section[]) ?? [];
                setSections(all.filter(s => GUIDE_TYPES.includes(s.section_type)));
                setOpenStep(null);
            });
    }, [lessonId]);

    const selected = lessons.find(l => l.id === lessonId);

    // 本文の見た目を整える：画像参照と記号を落として読める文にする
    const preview = (md: string, len: number) =>
        md.split('\n')
            .filter(l => !l.trim().startsWith('!['))
            .join(' ')
            .replace(/[#*|>-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, len);

    return (
        <div className="w-full md:w-[320px] shrink-0 overflow-y-auto bg-white border-r border-[#f4f3f7] p-4 space-y-4">
            <div>
                <h2 className="text-xs font-bold text-[#6f5385] tracking-wide flex items-center gap-1.5">
                    <BookOpen size={14} /> きょうの進め方
                </h2>
                <p className="text-[10px] text-[#9a93a5] mt-0.5">次に何をやるかはここを見る</p>
            </div>

            {/* 準備データ（あれば最初にやること） */}
            {prepContent && (
                <div className="bg-[#f2daff]/50 rounded-2xl p-3 space-y-2">
                    <p className="text-[10px] font-bold text-[#6f5385]">最初にやる（前回のつづき）</p>
                    {prepContent.review_quiz?.slice(0, 2).map((q, i) => (
                        <div key={i} className="text-xs">
                            <p className="font-bold text-[#1a1c1e]">Q. {q.question}</p>
                            <p className="text-[#4b454e] pl-2 border-l-2 border-[#c9a8e0] mt-0.5">A. {q.answer}</p>
                        </div>
                    ))}
                    {prepContent.intro_topic && (
                        <p className="text-[11px] text-[#4b454e] leading-relaxed">
                            <span className="font-bold text-[#6f5385]">導入：</span>
                            {prepContent.intro_topic.slice(0, 80)}
                        </p>
                    )}
                </div>
            )}

            {/* 課の選択 */}
            <div className="flex items-center gap-2">
                <select
                    value={level}
                    onChange={e => setLevel(e.target.value)}
                    className="text-xs bg-white border border-[#cdc3ce]/50 rounded-lg px-2 py-1.5 outline-none"
                >
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select
                    value={lessonId}
                    onChange={e => onLessonChange(e.target.value)}
                    className="flex-1 min-w-0 text-xs bg-white border border-[#cdc3ce]/50 rounded-lg px-2 py-1.5 outline-none"
                >
                    <option value="">今日の課を選ぶ…</option>
                    {lessons.map(l => (
                        <option key={l.id} value={l.id}>
                            {l.lesson_label ?? `第${l.lesson_number}課`}：{l.title.slice(0, 30)}
                        </option>
                    ))}
                </select>
                {selected && (
                    <Link
                        href={`/materials/textbook/${selected.id}`}
                        target="_blank"
                        title="教科書を別画面で開く"
                        className="p-1.5 text-[#6f5385] hover:bg-[#f2daff] rounded-lg transition-colors shrink-0"
                    >
                        <ExternalLink size={14} />
                    </Link>
                )}
            </div>

            {/* 課の流れ（ステップ） */}
            {!lessonId && (
                <p className="text-xs text-[#9a93a5] leading-relaxed py-6 text-center">
                    課を選ぶと、その課の流れが
                    <br />ここにステップで並びます
                </p>
            )}
            {lessonId && sections.length === 0 && (
                <p className="text-xs text-[#9a93a5] py-4 text-center">読み込み中…</p>
            )}
            <ol className="space-y-1.5">
                {sections.map((s, i) => (
                    <li key={i}>
                        <button
                            onClick={() => setOpenStep(openStep === i ? null : i)}
                            className={`w-full text-left rounded-xl px-3 py-2 transition-colors ${openStep === i
                                ? 'bg-[#f2daff] text-[#6f5385]'
                                : 'hover:bg-[#faf9fd] text-[#1a1c1e]'
                                }`}
                        >
                            <span className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold">
                                    {i + 1}. {SECTION_LABELS[s.section_type]}
                                </span>
                                <ChevronDown
                                    size={13}
                                    className={`shrink-0 text-[#9a93a5] transition-transform ${openStep === i ? 'rotate-180' : ''}`}
                                />
                            </span>
                            {openStep !== i && (
                                <span className="block text-[10px] text-[#9a93a5] mt-0.5 leading-relaxed">
                                    {preview(s.content_md, 42)}
                                </span>
                            )}
                        </button>
                        {openStep === i && (
                            <div className="mx-1 mt-1 mb-2 px-3 py-2 bg-white border border-[#c9a8e0]/30 rounded-xl text-xs text-[#1a1c1e] leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                                {preview(s.content_md, 600)}
                            </div>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
}
