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
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, ExternalLink, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import {
    SECTION_LABELS,
    MASTER_MATERIAL_BUCKET,
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
    images: string[] | null;
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

// 生徒向け原文に埋まっているふりがな「漢字（かんじ）」を落とす。
// 直前が漢字＋括弧内ひらがなのみの組だけが対象（選択肢（あ）や英語併記は残る）
function stripFurigana(text: string): string {
    return text
        .replace(/([一-龥々ヶ]+)（[ぁ-んー]+）/g, '$1')
        .replace(/([一-龥々ヶ]+)\([ぁ-んー]+\)/g, '$1');
}

export function GuidePanel({ studentId, prepContent, lessonId, onLessonChange }: Props) {
    const [level, setLevel] = useState('N5');
    // 生徒画面（電子教科書）への同期。ステップを開くと同じ場所が生徒側でもめくれる。
    // 生徒画面はログイン無しで開くため、教科書の中身は認証済みのこちら側から送る
    const channelRef = useRef<BroadcastChannel | null>(null);
    useEffect(() => {
        if (!studentId || typeof window === 'undefined') return;
        const ch = new BroadcastChannel(`asta-live-${studentId}`);
        channelRef.current = ch;
        return () => { ch.close(); channelRef.current = null; };
    }, [studentId]);
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
            .select('section_type, section_order, content_md, images')
            .eq('master_material_id', lessonId)
            .order('section_order')
            .then(({ data }) => {
                const all = (data as Section[]) ?? [];
                setSections(all.filter(s => GUIDE_TYPES.includes(s.section_type)));
                setOpenStep(null);
            });
    }, [lessonId]);

    const selected = lessons.find(l => l.id === lessonId);

    // 本文の見た目を整える：画像参照と記号を落として読める文にする。
    // 教材の原文は生徒向けでふりがな（漢字（かんじ））が埋まっているが、
    // この台本を読むのは日本人の先生なので落とす（2026-08-25 かずき指摘）。
    // 直前が漢字＋括弧内がひらがなのみ、の組だけを消すので、
    // 練習問題の選択肢（あ）（い）や英語の併記（English）は消えない
    const preview = (md: string, len: number) =>
        stripFurigana(
            md.split('\n')
                .filter(l => !l.trim().startsWith('!['))
                .join(' ')
        )
            .replace(/[#*|>-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, len);

    // 台本が長くてもこの枠の中だけがスクロールする（画面全体を縦に伸ばさない）
    return (
        <div className="hidden md:block w-[320px] shrink-0 h-full overflow-y-auto bg-white border-r border-[#f4f3f7] p-4 space-y-4">
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
                            {l.lesson_label ?? `第${l.lesson_number}課`}：{stripFurigana(l.title).slice(0, 30)}
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
                            onClick={() => {
                                const next = openStep === i ? null : i;
                                setOpenStep(next);
                                // 開いたステップを生徒の電子教科書にも表示する
                                if (next !== null) {
                                    const sec = sections[i];
                                    const lesson = lessons.find(l => l.id === lessonId);
                                    const lessonPath = lesson
                                        ? `${lesson.jlpt_level}/${lesson.lesson_number}${lesson.lesson_sub ? `-${lesson.lesson_sub}` : ''}`
                                        : '';
                                    const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MASTER_MATERIAL_BUCKET}/${lessonPath}`;
                                    channelRef.current?.postMessage({
                                        type: 'page',
                                        lessonLabel: lesson ? `${lesson.lesson_label ?? `第${lesson.lesson_number}課`}` : '',
                                        stepTitle: SECTION_LABELS[sec.section_type],
                                        body: sec.content_md,
                                        imageUrls: (sec.images ?? []).slice(0, 4).map(f => `${base}/${f}`),
                                        timestamp: Date.now(),
                                    });
                                }
                            }}
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
