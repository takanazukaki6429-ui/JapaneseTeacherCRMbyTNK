/**
 * マニュアルの章を画面に出す部品（2026-10-09 かずき決定・9-4）。
 * 「使い方」のページ（/manual）と、各画面の「？」で開く横の欄の両方が使う。
 * 写真は使わず、ボタンはアプリの中と同じ印と名前で示す
 */
import type { LucideIcon } from 'lucide-react';
import {
    Home, GraduationCap, BookOpen, Settings, CircleHelp, MessageCircleQuestion, Play, ClipboardList, NotebookPen,
    Pencil, Trash2, Send, Map, Plus, Save, Copy, ExternalLink, Sparkles, Mic, Languages, PencilLine, Repeat2,
    Plane, StickyNote, Star, Globe, Calendar, ShieldCheck, Download, CreditCard, TriangleAlert, Info,
} from 'lucide-react';
import type { ManualBlock, ManualButton, ManualChapter, ManualIconKey, ManualItem } from '@/lib/manual';

/** 印の名前 → アプリの中で使っている印（全部の名前に絵があることを、型で確かめる） */
export const MANUAL_ICONS: Record<ManualIconKey, LucideIcon> = {
    home: Home,
    students: GraduationCap,
    materials: BookOpen,
    settings: Settings,
    manual: CircleHelp,
    help: MessageCircleQuestion,
    play: Play,
    prepare: ClipboardList,
    record: NotebookPen,
    edit: Pencil,
    trash: Trash2,
    share: Send,
    map: Map,
    hearing: MessageCircleQuestion,
    plus: Plus,
    save: Save,
    copy: Copy,
    external: ExternalLink,
    sparkles: Sparkles,
    send: Send,
    mic: Mic,
    translate: Languages,
    book: BookOpen,
    practice: PencilLine,
    rephrase: Repeat2,
    travel: Plane,
    memo: StickyNote,
    star: Star,
    globe: Globe,
    calendar: Calendar,
    shield: ShieldCheck,
    download: Download,
    card: CreditCard,
};

/** ボタンの印：アプリの中と同じ印と名前を、ボタンの形で出す */
export function ButtonMark({ button }: { button: ManualButton }) {
    const Icon = button.icon ? MANUAL_ICONS[button.icon] : null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 mr-1.5 rounded-md bg-[#f2eaff] border border-[#e4ddf0] text-[#55488a] text-[13px] font-semibold align-middle whitespace-nowrap">
            {Icon && <Icon size={13} strokeWidth={1.8} />}
            {button.label}
        </span>
    );
}

function ItemLine({ item }: { item: ManualItem }) {
    return (
        <>
            {item.button && <ButtonMark button={item.button} />}
            <span>{item.text}</span>
        </>
    );
}

function Block({ block }: { block: ManualBlock }) {
    switch (block.type) {
        case 'text':
            return <p>{block.text}</p>;
        case 'steps':
            return (
                <ol className="space-y-1.5">
                    {block.items.map((it, i) => (
                        <li key={i} className="flex gap-2">
                            <span className="shrink-0 w-5 h-5 mt-0.5 rounded-full bg-[#6b5ca5] text-white text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                            <span className="min-w-0"><ItemLine item={it} /></span>
                        </li>
                    ))}
                </ol>
            );
        case 'items':
            return (
                <ul className="space-y-1.5">
                    {block.items.map((it, i) => (
                        <li key={i} className="pl-3 border-l-2 border-[#e4ddf0]"><ItemLine item={it} /></li>
                    ))}
                </ul>
            );
        case 'note':
            return (
                <p className="flex gap-2 px-3 py-2 rounded-lg bg-[#fff6e5] border border-[#f3dfb5] text-[#5a3d00]">
                    <TriangleAlert size={15} className="shrink-0 mt-0.5" />
                    <span>{block.text}</span>
                </p>
            );
        case 'plan':
            return (
                <p className="flex gap-2 px-3 py-2 rounded-lg bg-[#efe9ff]/60 border border-[#e4ddf0] text-[#3a3350]">
                    <Info size={15} className="shrink-0 mt-0.5 text-[#6b5ca5]" />
                    <span>{block.text}</span>
                </p>
            );
    }
}

/** 1つの章の中身（章の題の下の部分）。ページと横の欄で同じ物を出す */
export function ManualChapterBody({ chapter }: { chapter: ManualChapter }) {
    return (
        <div className="space-y-5 text-[14px] leading-relaxed text-[#3a3350]">
            <div className="space-y-1">
                <p>{chapter.summary}</p>
                {chapter.where && <p className="text-[13px] text-[#6f6884]">開き方：{chapter.where}</p>}
            </div>
            {chapter.sections.map((s, i) => (
                <section key={i} className="space-y-2">
                    <h3 className="text-[14px] font-bold text-[#6b5ca5] border-l-2 border-[#6b5ca5] pl-2">{s.heading}</h3>
                    <div className="space-y-2">
                        {s.blocks.map((b, j) => <Block key={j} block={b} />)}
                    </div>
                </section>
            ))}
        </div>
    );
}
