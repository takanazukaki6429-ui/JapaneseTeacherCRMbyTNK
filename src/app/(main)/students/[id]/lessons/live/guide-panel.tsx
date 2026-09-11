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
import { BookOpen, ExternalLink, ChevronDown, StickyNote } from 'lucide-react';
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
    /** 道具をしまった状態：細い帯になり、押すと一時的に開ける */
    collapsed?: boolean;
    prepContent: PrepContent | null;
    lessonId: string;
    onLessonChange: (id: string) => void;
    /** ステップを開いたとき、教科書ページを授業の流れに入れる（共有前提の1画面設計） */
    onStepOpen: (page: { lessonLabel: string; stepTitle: string; body: string; imageUrls: string[] }) => void;
};

// 生徒向け原文に埋まっているふりがな「漢字（かんじ）」を落とす。
// 直前が漢字＋括弧内ひらがなのみの組だけが対象（選択肢（あ）や英語併記は残る）
function stripFurigana(text: string): string {
    return text
        .replace(/([一-龥々ヶ]+)（[ぁ-んー]+）/g, '$1')
        .replace(/([一-龥々ヶ]+)\([ぁ-んー]+\)/g, '$1');
}

export function GuidePanel({ collapsed = false, prepContent, lessonId, onLessonChange, onStepOpen }: Props) {
    const [level, setLevel] = useState('N5');
    const [peek, setPeek] = useState(false);   // しまった状態で一時的に開く
    const isNarrow = collapsed && !peek;
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

    // ステップを開く／閉じる。開いたステップは教科書ページとして授業の流れにも入る
    const toggleStep = (i: number) => {
        const next = openStep === i ? null : i;
        setOpenStep(next);
        if (next === null) return;
        const sec = sections[i];
        const lesson = lessons.find(l => l.id === lessonId);
        const lessonPath = lesson
            ? `${lesson.jlpt_level}/${lesson.lesson_number}${lesson.lesson_sub ? `-${lesson.lesson_sub}` : ''}`
            : '';
        const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MASTER_MATERIAL_BUCKET}/${lessonPath}`;
        onStepOpen({
            lessonLabel: lesson ? `${lesson.lesson_label ?? `第${lesson.lesson_number}課`}` : '',
            stepTitle: SECTION_LABELS[sec.section_type],
            body: sec.content_md,
            imageUrls: (sec.images ?? []).slice(0, 4).map(f => `${base}/${f}`),
        });
    };

    const SELECT = 'w-full appearance-none bg-white border border-[#e2dbcf] text-[#3b2e2a] text-[15px] font-medium rounded-lg pl-3 pr-7 py-1.5 focus:border-[#9c4f5a] focus:outline-none';

    // 見た目は画面案 ライブ授業_色D書体E.html の左の列（2026-09-11）。
    // 台本が長くてもこの枠の中だけがスクロールする（画面全体を縦に伸ばさない）
    if (isNarrow) {
        // 道具をしまった状態（共有モード）：縦書きの細い帯。押すと一時的に開く
        return (
            <button
                onClick={() => setPeek(true)}
                title="台本をひらく"
                className="hidden md:flex flex-col items-center gap-2 w-10 shrink-0 h-full bg-[#fcfbf9] border-r border-[#e2dbcf] pt-4 text-[#9c4f5a] hover:bg-[#f4ede2] transition-colors"
            >
                <BookOpen size={16} />
                <span className="text-[13px] font-bold" style={{ writingMode: 'vertical-rl' }}>きょうの進め方</span>
            </button>
        );
    }
    return (
        <section
            className="hidden md:flex w-[310px] shrink-0 h-full bg-[#fcfbf9] border-r border-[#e2dbcf] flex-col justify-between"
            onMouseLeave={() => { if (collapsed) setPeek(false); }}
        >
            <div className="p-4 overflow-y-auto flex-1">
                <div className="flex items-baseline justify-between mb-1">
                    <h2 className="text-[20px] font-bold text-[#3b2e2a]">きょうの進め方</h2>
                    {lessonId && (
                        <span className="text-[12px] text-[#6b5b8c] bg-[#ece8f3] px-2 py-0.5 rounded border border-[#d8cfe5]">進行中</span>
                    )}
                </div>
                <p className="text-[13px] text-[#534344] mb-3">次に何をやるかはここを見る</p>

                {/* 課の選択 */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                    <div className="col-span-2 relative">
                        <select value={level} onChange={e => setLevel(e.target.value)} className={SELECT}>
                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#534344]" />
                    </div>
                    <div className="col-span-3 relative flex items-center gap-1">
                        <div className="relative flex-1 min-w-0">
                            <select value={lessonId} onChange={e => onLessonChange(e.target.value)} className={SELECT}>
                                <option value="">今日の課を選ぶ…</option>
                                {lessons.map(l => (
                                    <option key={l.id} value={l.id}>
                                        {l.lesson_label ?? `第${l.lesson_number}課`}：{stripFurigana(l.title).slice(0, 30)}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#534344]" />
                        </div>
                        {selected && (
                            <Link
                                href={`/materials/textbook/${selected.id}`}
                                target="_blank"
                                title="教科書を別画面で開く"
                                className="p-1.5 text-[#9c4f5a] hover:bg-[#f9f0f2] rounded-lg transition-colors shrink-0"
                            >
                                <ExternalLink size={14} />
                            </Link>
                        )}
                    </div>
                </div>
                <div className="w-full h-px bg-[#e2dbcf] mb-3" />

                {/* 課の流れ（ステップ） */}
                {!lessonId && (
                    <p className="text-[13px] text-[#534344] leading-relaxed py-6 text-center">
                        課を選ぶと、その課の流れが
                        <br />ここにステップで並びます
                    </p>
                )}
                {lessonId && sections.length === 0 && (
                    <p className="text-[13px] text-[#534344] py-4 text-center">読み込み中…</p>
                )}
                <ol className="space-y-1.5">
                    {sections.map((s, i) => openStep === i ? (
                        <li key={i} className="rounded-lg bg-[#f9f0f2] border border-[#d8c1c2] p-2.5 shadow-sm">
                            <button onClick={() => toggleStep(i)} className="w-full flex items-center justify-between text-left">
                                <span className="flex items-center gap-2 text-[#9c4f5a] font-bold">
                                    <span className="text-[14px]">{i + 1}.</span>
                                    <span className="text-[15px]">{SECTION_LABELS[s.section_type]}</span>
                                </span>
                                <span className="text-[12px] bg-[#9c4f5a] text-white px-2 py-0.5 rounded font-medium">現在</span>
                            </button>
                            <div className="mt-2 text-[15px] leading-relaxed text-[#3b2e2a] bg-white p-2.5 rounded-md border border-[#e2dbcf] whitespace-pre-wrap max-h-56 overflow-y-auto">
                                {preview(s.content_md, 600)}
                            </div>
                        </li>
                    ) : (
                        <li key={i}>
                            <button
                                onClick={() => toggleStep(i)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[#534344] hover:bg-[#f4ede2] transition-colors text-left"
                            >
                                <span className="text-[13px] font-semibold w-5 text-right">{i + 1}.</span>
                                <span className="text-[15px]">{SECTION_LABELS[s.section_type]}</span>
                            </button>
                        </li>
                    ))}
                </ol>
            </div>

            {/* 準備データ：攻略メモなので折りたたみ。開くと画面共有中は生徒にも見える */}
            {prepContent && (
                <div className="p-3 bg-[#f4ede2] border-t border-[#e2dbcf]">
                    <details className="group">
                        <summary className="list-none flex items-center justify-between text-[13px] text-[#534344] font-medium cursor-pointer select-none">
                            <span className="flex items-center gap-1.5">
                                <StickyNote size={14} /> 授業前のメモ（画面共有中は生徒にも見えます）
                            </span>
                            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-2 p-2.5 bg-white rounded border border-[#e2dbcf] text-[13px] leading-relaxed text-[#3b2e2a] space-y-2">
                            {prepContent.review_quiz?.slice(0, 2).map((q, i) => (
                                <div key={i}>
                                    <p className="font-bold">Q. {q.question}</p>
                                    <p className="text-[#534344] pl-2 border-l-2 border-[#d8c1c2] mt-0.5">A. {q.answer}</p>
                                </div>
                            ))}
                            {prepContent.intro_topic && (
                                <p><span className="font-bold text-[#9c4f5a]">導入：</span>{prepContent.intro_topic.slice(0, 80)}</p>
                            )}
                        </div>
                    </details>
                </div>
            )}
        </section>
    );
}
