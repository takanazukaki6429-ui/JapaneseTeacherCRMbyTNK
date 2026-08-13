'use client';

/**
 * 機能B: 授業中の即興生成（要件定義書 §3.3.7）
 *
 * 今やっている課を選ぶと、その課の内容と生徒の情報をもとに
 * 追加の練習問題・例文・やさしい説明をその場で作る。
 *
 * ライブ授業画面は既に1,200行あるため、この機能は独立した部品にしている。
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, Sparkles, BookOpen, ExternalLink } from 'lucide-react';
import Link from 'next/link';

type Lesson = {
    id: string;
    jlpt_level: string;
    lesson_number: number;
    lesson_sub: number;
    lesson_label: string | null;
    title: string;
};

type Mode = 'exercises' | 'examples' | 'explain';

const MODES: { key: Mode; label: string; hint: string }[] = [
    { key: 'exercises', label: '練習問題を作る', hint: 'この課の文法で3問' },
    { key: 'examples', label: '例文を作る', hint: '生徒に合う場面で5つ' },
    { key: 'explain', label: 'やさしく言い換え', hint: '別の切り口で説明' },
];

const LEVELS = ['N5', 'N4', 'N3', 'N2'];

type Props = { studentId: string };

export function TextbookPanel({ studentId }: Props) {
    const [level, setLevel] = useState('N5');
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [lessonId, setLessonId] = useState('');
    const [note, setNote] = useState('');
    const [loadingMode, setLoadingMode] = useState<Mode | null>(null);
    const [result, setResult] = useState('');
    const [error, setError] = useState('');

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
                setLessonId('');
            });
    }, [level]);

    const generate = async (mode: Mode) => {
        if (!lessonId) {
            setError('先に課を選んでください。');
            return;
        }
        setLoadingMode(mode);
        setError('');
        setResult('');
        try {
            const res = await fetch('/api/materials/improvise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterMaterialId: lessonId, mode, studentId, note }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error ?? '生成に失敗しました。');
                return;
            }
            setResult(data.text ?? '');
        } catch {
            setError('通信に失敗しました。もう一度お試しください。');
        } finally {
            setLoadingMode(null);
        }
    };

    const selected = lessons.find(l => l.id === lessonId);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-[#f4f3f7] bg-[#faf9fd] shrink-0 space-y-2">
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
                        onChange={e => setLessonId(e.target.value)}
                        className="flex-1 min-w-0 text-xs bg-white border border-[#cdc3ce]/50 rounded-lg px-2 py-1.5 outline-none"
                    >
                        <option value="">今やっている課を選ぶ…</option>
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

                <input
                    type="text"
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="追加の指示（任意）例: 助詞を重点的に"
                    className="w-full text-xs bg-white border border-[#cdc3ce]/50 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#c9a8e0]"
                />

                <div className="flex gap-1.5">
                    {MODES.map(m => (
                        <button
                            key={m.key}
                            onClick={() => generate(m.key)}
                            disabled={loadingMode !== null}
                            title={m.hint}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-2 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white text-[11px] font-bold rounded-lg disabled:opacity-50 transition-opacity"
                        >
                            {loadingMode === m.key
                                ? <Loader2 size={12} className="animate-spin" />
                                : <Sparkles size={12} />}
                            {m.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {error && (
                    <div className="p-3 bg-[#fff0f0] border border-[#f4b8b8] rounded-2xl text-xs text-[#ba1a1a] mb-3">
                        {error}
                    </div>
                )}

                {!result && !error && (
                    <div className="h-full flex flex-col items-center justify-center py-10 text-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-[#f2daff] flex items-center justify-center">
                            <BookOpen size={22} className="text-[#6f5385]" />
                        </div>
                        <p className="text-sm font-bold text-[#1a1c1e]">教科書から その場で作る</p>
                        <p className="text-xs text-[#4b454e] leading-relaxed max-w-xs">
                            今やっている課を選んでボタンを押すと、
                            その課の内容と生徒さんの情報に合わせて
                            練習問題・例文・やさしい説明をその場で作ります。
                        </p>
                    </div>
                )}

                {result && (
                    <div className="bg-white border border-[#c9a8e0]/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(111,83,133,0.06)]">
                        <p className="text-sm text-[#1a1c1e] whitespace-pre-wrap leading-relaxed">{result}</p>
                    </div>
                )}
            </div>
        </div>
    );
}
