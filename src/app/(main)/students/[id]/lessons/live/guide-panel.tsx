'use client';

/**
 * ライブ授業の左パネル「きょうの進め方」（UI改修 第二段階・2026-08-16）
 *
 * 設計方針「道具箱から助手へ」：初めての先生でも、ここを上から
 * なぞるだけで授業が進む「台本」にする。
 * - 上：準備データ（あれば）＝最初にやること
 * - 中：今日の課を選ぶ → その課の流れがステップとして並ぶ
 * - ステップを押すと中身がその場で開く（別画面に飛ばない）
 * - 「教科書｜旅行」の切り替え（2026-10-09 かずき決定・9-2）：旅行では場面を選ぶと、
 *   場面の部分（フレーズ・使う場面・会話・文化のひとこと・穴埋め）がステップとして並ぶ。押すと授業の流れに旅行のカードが入る
 * - 「授業前のメモ」にフリートークのネタ（2026-10-09 かずき決定・9-3）：最初の質問と、続けて聞く質問
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { BookOpen, ExternalLink, ChevronDown, StickyNote, Plane } from 'lucide-react';
import { TRAVEL_LEVELS, TRAVEL_PARTS, splitTravelAnswers, travelLevel, travelPartText, type TravelPartKey } from '@/lib/travel';
import type { PrepSheet } from '@/lib/prep-sheet';
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

type PrepContent = PrepSheet;

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
    /** 旅行の場面の部分を開いたとき、授業の流れに旅行のカードを入れる（2026-10-09） */
    onTravelOpen?: (card: { title: string; text: string }) => void;
};

// 生徒向け原文に埋まっているふりがな「漢字（かんじ）」を落とす。
// 直前が漢字＋括弧内ひらがなのみの組だけが対象（選択肢（あ）や英語併記は残る）
function stripFurigana(text: string): string {
    return text
        .replace(/([一-龥々ヶ]+)（[ぁ-んー]+）/g, '$1')
        .replace(/([一-龥々ヶ]+)\([ぁ-んー]+\)/g, '$1');
}

export function GuidePanel({ collapsed = false, prepContent, lessonId, onLessonChange, onStepOpen, onTravelOpen }: Props) {
    const [mode, setMode] = useState<'textbook' | 'travel'>('textbook');
    const [travelLevelNo, setTravelLevelNo] = useState(1);
    const [travelSceneId, setTravelSceneId] = useState('');
    const [openTravelPart, setOpenTravelPart] = useState<TravelPartKey | null>(null);
    const travelLv = travelLevel(travelLevelNo);
    const travelScene = travelLv.scenes.find(sc => sc.id === travelSceneId) ?? null;
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
        // 課の選択を外したときに表示を空へ戻すだけの処理。書き換えるとライブ授業画面
        // （検証済み）の挙動が変わるため、10/1の有料化後に作り直す。
        // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // テキストの原文は生徒向けでふりがな（漢字（かんじ））が埋まっているが、
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

    const SELECT = 'w-full appearance-none bg-white border border-[#e4ddf0] text-[#3a3350] text-[15px] font-medium rounded-lg pl-3 pr-7 py-1.5 focus:border-[#6b5ca5] focus:outline-none';

    const switchMode = (next: 'textbook' | 'travel') => {
        if (next === mode) return;
        setMode(next);
        setOpenStep(null);
        setOpenTravelPart(null);
        // 旅行の時は教科書の課の選択を外す（例文・練習問題は教科書の課が前提＝旅行では使わない・2026-10-09）
        if (next === 'travel' && lessonId) onLessonChange('');
    };

    // 旅行の場面の部分を開く／閉じる。開いた部分は旅行のカードとして授業の流れにも入る
    const toggleTravelPart = (key: TravelPartKey) => {
        const next = openTravelPart === key ? null : key;
        setOpenTravelPart(next);
        if (!next || !travelScene) return;
        const part = TRAVEL_PARTS.find(p => p.key === next);
        onTravelOpen?.({
            title: `旅行 ${travelLv.label}　${travelScene.title}：${part?.label ?? ''}`,
            text: travelPartText(travelScene, next),
        });
    };

    // 見た目は画面案 ライブ授業_色D書体E.html の左の列（2026-09-11）。
    // 台本が長くてもこの枠の中だけがスクロールする（画面全体を縦に伸ばさない）
    if (isNarrow) {
        // 道具をしまった状態（共有モード）：縦書きの細い帯。押すと一時的に開く
        return (
            <button
                onClick={() => setPeek(true)}
                title="台本をひらく"
                className="hidden md:flex flex-col items-center gap-2 w-10 shrink-0 h-full bg-[#fbfaff] border-r border-[#e4ddf0] pt-4 text-[#6b5ca5] hover:bg-[#efe9f8] transition-colors"
            >
                <BookOpen size={16} />
                <span className="text-[13px] font-bold" style={{ writingMode: 'vertical-rl' }}>きょうの進め方</span>
            </button>
        );
    }
    return (
        <section
            className="hidden md:flex w-[310px] shrink-0 h-full bg-[#fbfaff] border-r border-[#e4ddf0] flex-col justify-between"
            onMouseLeave={() => { if (collapsed) setPeek(false); }}
        >
            <div className="p-4 overflow-y-auto flex-1">
                <div className="flex items-baseline justify-between mb-1">
                    <h2 className="text-[20px] font-bold text-[#3a3350]">きょうの進め方</h2>
                    {((mode === 'textbook' && lessonId) || (mode === 'travel' && travelScene)) && (
                        <span className="text-[12px] text-[#2a6f5a] bg-[#dff1ea] px-2 py-0.5 rounded border border-[#bfe3d4]">進行中</span>
                    )}
                </div>
                <p className="text-[13px] text-[#484550] mb-3">次に何をやるかはここを見る</p>

                {/* 教科書｜旅行 の切り替え（2026-10-09） */}
                <div className="flex gap-1 bg-white border border-[#e4ddf0] rounded-lg p-0.5 mb-3">
                    {([['textbook', '教科書', BookOpen], ['travel', '旅行', Plane]] as const).map(([key, label, Icon]) => (
                        <button
                            key={key}
                            onClick={() => switchMode(key)}
                            className={`flex-1 inline-flex items-center justify-center gap-1.5 py-1 rounded-md text-[14px] transition-colors ${
                                mode === key ? 'bg-[#6b5ca5] text-white font-bold' : 'text-[#484550] hover:bg-[#efe9f8]'
                            }`}
                        >
                            <Icon size={14} />{label}
                        </button>
                    ))}
                </div>

                {mode === 'travel' ? (
                    <>
                        {/* 旅行：レベルと場面の選択 */}
                        <div className="grid grid-cols-5 gap-2 mb-4">
                            <div className="col-span-2 relative">
                                <select
                                    value={travelLevelNo}
                                    onChange={e => { setTravelLevelNo(Number(e.target.value)); setTravelSceneId(''); setOpenTravelPart(null); }}
                                    className={SELECT}
                                >
                                    {TRAVEL_LEVELS.map(l => (
                                        <option key={l.level} value={l.level} disabled={l.scenes.length === 0}>
                                            {l.label}{l.scenes.length === 0 ? '（準備中）' : ''}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#484550]" />
                            </div>
                            <div className="col-span-3 relative flex items-center gap-1">
                                <div className="relative flex-1 min-w-0">
                                    <select
                                        value={travelSceneId}
                                        onChange={e => { setTravelSceneId(e.target.value); setOpenTravelPart(null); }}
                                        className={SELECT}
                                    >
                                        <option value="">場面を選ぶ…</option>
                                        {travelLv.scenes.map(sc => (
                                            <option key={sc.id} value={sc.id}>{stripFurigana(`${sc.title}：${sc.subtitle}`)}</option>
                                        ))}
                                    </select>
                                    <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#484550]" />
                                </div>
                                {travelScene && (
                                    <Link
                                        href={`/materials/travel/${travelScene.id}`}
                                        target="_blank"
                                        title="旅行の場面を別画面で開く"
                                        className="p-1.5 text-[#6b5ca5] hover:bg-[#ede8fa] rounded-lg transition-colors shrink-0"
                                    >
                                        <ExternalLink size={14} />
                                    </Link>
                                )}
                            </div>
                        </div>
                        <div className="w-full h-px bg-[#e4ddf0] mb-3" />

                        {!travelScene && (
                            <p className="text-[13px] text-[#484550] leading-relaxed py-6 text-center">
                                場面を選ぶと、フレーズ・使う場面・会話・
                                <br />文化のひとこと・穴埋めがここにステップで並びます
                            </p>
                        )}
                        {travelScene && (
                            <ol className="space-y-1.5">
                                {TRAVEL_PARTS.map((part, i) => openTravelPart === part.key ? (
                                    <li key={part.key} className="rounded-lg bg-[#ede8fa] border border-[#cfc6ea] p-2.5 shadow-sm">
                                        <button onClick={() => toggleTravelPart(part.key)} className="w-full flex items-center justify-between text-left">
                                            <span className="flex items-center gap-2 text-[#6b5ca5] font-bold">
                                                <span className="text-[14px]">{i + 1}.</span>
                                                <span className="text-[15px]">{part.label}</span>
                                            </span>
                                            <span className="text-[12px] bg-[#6b5ca5] text-white px-2 py-0.5 rounded font-medium">現在</span>
                                        </button>
                                        {/* 先生が読むので、ふりがなは落とす。穴埋めの答えは出さない（画面共有中は生徒にも見えるため） */}
                                        <div className="mt-2 text-[15px] leading-relaxed text-[#3a3350] bg-white p-2.5 rounded-md border border-[#e4ddf0] whitespace-pre-wrap max-h-56 overflow-y-auto">
                                            {stripFurigana(splitTravelAnswers(travelPartText(travelScene, part.key)).body).slice(0, 900)}
                                        </div>
                                    </li>
                                ) : (
                                    <li key={part.key}>
                                        <button
                                            onClick={() => toggleTravelPart(part.key)}
                                            className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[#484550] hover:bg-[#efe9f8] transition-colors text-left"
                                        >
                                            <span className="text-[13px] font-semibold w-5 text-right">{i + 1}.</span>
                                            <span className="text-[15px]">{part.label}</span>
                                        </button>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </>
                ) : (
                <>
                {/* 課の選択 */}
                <div className="grid grid-cols-5 gap-2 mb-4">
                    <div className="col-span-2 relative">
                        <select value={level} onChange={e => setLevel(e.target.value)} className={SELECT}>
                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#484550]" />
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
                            <ChevronDown size={14} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#484550]" />
                        </div>
                        {selected && (
                            <Link
                                href={`/materials/textbook/${selected.id}`}
                                target="_blank"
                                title="教科書を別画面で開く"
                                className="p-1.5 text-[#6b5ca5] hover:bg-[#ede8fa] rounded-lg transition-colors shrink-0"
                            >
                                <ExternalLink size={14} />
                            </Link>
                        )}
                    </div>
                </div>
                <div className="w-full h-px bg-[#e4ddf0] mb-3" />

                {/* 課の流れ（ステップ） */}
                {!lessonId && (
                    <p className="text-[13px] text-[#484550] leading-relaxed py-6 text-center">
                        課を選ぶと、その課の流れが
                        <br />ここにステップで並びます
                    </p>
                )}
                {lessonId && sections.length === 0 && (
                    <p className="text-[13px] text-[#484550] py-4 text-center">読み込み中…</p>
                )}
                <ol className="space-y-1.5">
                    {sections.map((s, i) => openStep === i ? (
                        <li key={i} className="rounded-lg bg-[#ede8fa] border border-[#cfc6ea] p-2.5 shadow-sm">
                            <button onClick={() => toggleStep(i)} className="w-full flex items-center justify-between text-left">
                                <span className="flex items-center gap-2 text-[#6b5ca5] font-bold">
                                    <span className="text-[14px]">{i + 1}.</span>
                                    <span className="text-[15px]">{SECTION_LABELS[s.section_type]}</span>
                                </span>
                                <span className="text-[12px] bg-[#6b5ca5] text-white px-2 py-0.5 rounded font-medium">現在</span>
                            </button>
                            <div className="mt-2 text-[15px] leading-relaxed text-[#3a3350] bg-white p-2.5 rounded-md border border-[#e4ddf0] whitespace-pre-wrap max-h-56 overflow-y-auto">
                                {preview(s.content_md, 600)}
                            </div>
                        </li>
                    ) : (
                        <li key={i}>
                            <button
                                onClick={() => toggleStep(i)}
                                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-[#484550] hover:bg-[#efe9f8] transition-colors text-left"
                            >
                                <span className="text-[13px] font-semibold w-5 text-right">{i + 1}.</span>
                                <span className="text-[15px]">{SECTION_LABELS[s.section_type]}</span>
                            </button>
                        </li>
                    ))}
                </ol>
                </>
                )}
            </div>

            {/* 準備データ：攻略メモなので折りたたみ。開くと画面共有中は生徒にも見える */}
            {prepContent && (
                <div className="p-3 bg-[#efe9f8] border-t border-[#e4ddf0]">
                    <details className="group">
                        <summary className="list-none flex items-center justify-between text-[13px] text-[#484550] font-medium cursor-pointer select-none">
                            <span className="flex items-center gap-1.5">
                                <StickyNote size={14} /> 授業前のメモ（画面共有中は生徒にも見えます）
                            </span>
                            <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                        </summary>
                        <div className="mt-2 p-2.5 bg-white rounded border border-[#e4ddf0] text-[13px] leading-relaxed text-[#3a3350] space-y-2">
                            {prepContent.review_quiz?.slice(0, 2).map((q, i) => (
                                <div key={i}>
                                    <p className="font-bold">Q. {q.question}</p>
                                    <p className="text-[#484550] pl-2 border-l-2 border-[#cfc6ea] mt-0.5">A. {q.answer}</p>
                                </div>
                            ))}
                            {prepContent.intro_topic && (
                                <p><span className="font-bold text-[#6b5ca5]">導入：</span>{prepContent.intro_topic.slice(0, 80)}</p>
                            )}
                            {prepContent.free_talk && prepContent.free_talk.length > 0 && (
                                <div>
                                    <p className="font-bold text-[#6b5ca5]">フリートーク：</p>
                                    <ol className="mt-0.5 space-y-1.5">
                                        {prepContent.free_talk.map((t, i) => (
                                            <li key={i}>
                                                <p>{i + 1}. {t.question}</p>
                                                {t.follow_up && <p className="text-[#484550] pl-3">→ {t.follow_up}</p>}
                                                {t.grammar && <p className="text-[12px] text-[#6f6884] pl-3">文法：{t.grammar}</p>}
                                            </li>
                                        ))}
                                    </ol>
                                </div>
                            )}
                        </div>
                    </details>
                </div>
            )}
        </section>
    );
}
