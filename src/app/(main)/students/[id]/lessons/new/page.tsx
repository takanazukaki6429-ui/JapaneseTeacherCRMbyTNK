'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Save, Loader2, Star, Globe, Copy, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { LessonChatLogsViewer } from '@/components/lessons/lesson-chat-logs-viewer';
import { nationalityToLangCode } from '@/lib/nationality';

/**
 * 日時を、日本時間の「YYYY-MM-DDTHH:mm」（日時の入力欄の形）にする。
 * 以前は世界標準時の時刻を初期値にしていたため、日本より9時間前の時刻が入り、そのまま保存すると記録の日時がずれていた（2026-09-14 修正）
 */
function jstForInput(d: Date): string {
    return new Intl.DateTimeFormat('sv-SE', {
        timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
    }).format(d).replace(' ', 'T');
}

export default function NewLessonPage() {
    const router = useRouter();
    const supabase = createClient();
    const params = useParams(); // useParams returns string | string[]
    const studentId = typeof params.id === 'string' ? params.id : '';
    const searchParams = useSearchParams();
    const scheduledLessonId = searchParams.get('scheduledLessonId');
    const editLessonId = searchParams.get('lessonId');   // 保存した記録を直すとき（2026-09-14 かずき決定）

    const [loading, setLoading] = useState(false);
    const [fetchingScheduled, setFetchingScheduled] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [autoFilled, setAutoFilled] = useState(false);
    const [fetchingEdit, setFetchingEdit] = useState(!!editLessonId);
    const [formData, setFormData] = useState({
        date: jstForInput(new Date()), // 日本時間の今（日時の入力欄の形 YYYY-MM-DDTHH:mm）
        topics: '',
        vocabulary: '',
        mistakes: '',
        understanding_level: 3,
        homework: '',
        next_goal: '',
        memo: '',
    });

    useEffect(() => {
        const fetchScheduledLesson = async (id: string) => {
            setFetchingScheduled(true);
            try {
                const { data, error } = await supabase
                    .from('lessons')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) {
                    console.error('Error fetching lesson:', error);
                }

                if (data) {
                    // 予定の日時を、日本時間で入力欄に出す
                    const localIso = jstForInput(new Date(data.date));

                    setFormData(prev => ({
                        ...prev,
                        date: localIso,
                    }));
                }
            } catch (e) {
                console.error('Error fetching scheduled lesson', e);
            } finally {
                setFetchingScheduled(false);
            }
        };

        if (scheduledLessonId) {
            fetchScheduledLesson(scheduledLessonId);
        }
    }, [scheduledLessonId, supabase]);

    // 保存した記録を直す（?lessonId=…）：記録の中身を入力欄に読み込む（2026-09-14 かずき決定）
    useEffect(() => {
        if (!editLessonId) return;
        supabase
            .from('lessons')
            .select('date, topics, vocabulary, mistakes, understanding_level, homework, next_goal, content')
            .eq('id', editLessonId)
            .single()
            .then(({ data }) => {
                if (data) {
                    setFormData({
                        date: jstForInput(new Date(data.date)),
                        topics: data.topics ?? '',
                        vocabulary: data.vocabulary ?? '',
                        mistakes: data.mistakes ?? '',
                        understanding_level: data.understanding_level ?? 3,
                        homework: data.homework ?? '',
                        next_goal: data.next_goal ?? '',
                        memo: data.content ?? '',
                    });
                }
                setFetchingEdit(false);
            });
    }, [editLessonId, supabase]);

    // 記録の自動下書き（2026-09-14 かずき決定：9/28までに入れる）
    // ライブ授業で「授業を終える」を押すと、授業全体の会話（先生と生徒の両方）が渡ってくる。
    // ASTAがそこから、学習トピック・語彙・つまずき・宿題・次回の目標の下書きを作る。
    // （以前は先生のマイクの文字起こしの先頭1500字だけから、トピック・語彙・つまずきの3欄を作っていた）
    useEffect(() => {
        if (!studentId || editLessonId) return;
        const sessionKey = `live_session_${studentId}`;
        const saved = localStorage.getItem(sessionKey);
        if (!saved) return;
        try {
            const { transcript, conversation, courseSuggestions: suggestions } = JSON.parse(saved);
            localStorage.removeItem(sessionKey);
            const talk: string = String(conversation || transcript || '').trim();
            if (!talk) return;
            setIsAutoFilling(true);
            // 長い授業は、始めの部分と終わりの大部分を渡す（一度に渡せる量に収めるため）
            const clipped = talk.length > 24000 ? `${talk.slice(0, 6000)}\n…（途中を省略）…\n${talk.slice(-18000)}` : talk;
            const hints = suggestions?.length
                ? `\n\n# 授業中にASTAが出したヒント\n${suggestions.map((x: { text: string }) => x.text).join('\n')}`
                : '';
            fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'record_draft',   // 記録の自動下書き（利用実態を画面ごとに数えるため）
                    prompt: `あなたは日本語教師の記録係です。下は日本語レッスン1回分の会話の文字起こしです（行の頭の「先生：」「生徒：」で話し手を示す。音声認識なので聞き間違いを含む）。
これをもとに、先生が授業のあとに残すレッスン記録の下書きを作ってください。

# 決まり
- 会話に出てこないことは書かない（推測で足さない）
- topics：この授業で扱った文法・話題（カンマ区切り・短く）
- vocabulary：出てきた語彙・表現（カンマ区切り・10個まで）
- mistakes：生徒がつまずいた点・言い間違い（具体的に。無ければ空）
- homework：次回までの宿題の案（1〜2個）
- next_goal：次回の授業の目標の案（1文）
- 出力は次の形のJSONだけ（Markdownなし）：{"topics":"","vocabulary":"","mistakes":"","homework":"","next_goal":""}${hints}

# 会話
${clipped}`,
                }),
            })
                .then(r => r.json())
                .then(data => {
                    try {
                        const text = String(data.text ?? '').replace(/```json/g, '').replace(/```/g, '').trim();
                        const result = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
                        setFormData(prev => ({
                            ...prev,
                            topics: result.topics || prev.topics,
                            vocabulary: result.vocabulary || prev.vocabulary,
                            mistakes: result.mistakes || prev.mistakes,
                            homework: result.homework || prev.homework,
                            next_goal: result.next_goal || prev.next_goal,
                        }));
                        setAutoFilled(true);
                    } catch { /* 読めない答えは使わない */ }
                })
                .catch(err => console.error('Record draft error:', err))
                .finally(() => setIsAutoFilling(false));
        } catch { /* ignore */ }
    }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const setRating = (rating: number) => {
        setFormData((prev) => ({ ...prev, understanding_level: rating }));
    };

    const [isGenerating, setIsGenerating] = useState(false);

    // ── Phase 2：多言語フィードバック ──
    const FEEDBACK_LANGUAGES = [
        { code: 'en', label: '🇺🇸 英語' },
        { code: 'es', label: '🇪🇸 スペイン語' },
        { code: 'pt', label: '🇧🇷 ポルトガル語' },
        { code: 'ko', label: '🇰🇷 韓国語' },
        { code: 'zh', label: '🇨🇳 中国語' },
        { code: 'fr', label: '🇫🇷 フランス語' },
        { code: 'ja', label: '🇯🇵 日本語' },
    ] as const;
    const [selectedLang, setSelectedLang] = useState<string>('en');

    useEffect(() => {
        if (!studentId) return;
        supabase
            .from('students')
            .select('nationality')
            .eq('id', studentId)
            .single()
            .then(({ data }) => {
                if (data?.nationality) {
                    setSelectedLang(nationalityToLangCode(data.nationality));
                }
            });
    }, [studentId, supabase]);
    const [multilingualFeedback, setMultilingualFeedback] = useState('');
    const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false);
    const [feedbackCopied, setFeedbackCopied] = useState(false);

    const handleGenerateMultilingualFeedback = async () => {
        setIsGeneratingFeedback(true);
        setMultilingualFeedback('');
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'multilingual_feedback',
                    topics: formData.topics,
                    vocabulary: formData.vocabulary,
                    mistakes: formData.mistakes,
                    homework: formData.homework,
                    next_goal: formData.next_goal,
                    understanding_level: formData.understanding_level,
                    language: selectedLang,
                }),
            });
            if (!res.ok) throw new Error('Feedback generation failed');
            const data = await res.json();
            setMultilingualFeedback(data.text || '');
        } catch (err) {
            console.error('Multilingual feedback error:', err);
            alert('フィードバックの生成に失敗しました。');
        } finally {
            setIsGeneratingFeedback(false);
        }
    };

    const handleCopyFeedback = async () => {
        if (!multilingualFeedback) return;
        await navigator.clipboard.writeText(multilingualFeedback);
        setFeedbackCopied(true);
        setTimeout(() => setFeedbackCopied(false), 2000);
    };

    const handleGenerateFeedback = async () => {
        if (!formData.topics && !formData.mistakes) {
            alert('AI分析を行うには、少なくとも「文法・トピック」か「つまずき・弱点」を入力してください。');
            return;
        }

        setIsGenerating(true);
        try {
            const prompt = `
あなたはプロの日本語教師です。以下のレッスン記録をもとに、生徒への宿題、次回の目標、そして生徒へのフィードバックコメント（励ますようなトーンで）を提案してください。

## レッスン情報
- 学習トピック: ${formData.topics}
- 語彙: ${formData.vocabulary}
- つまずき・弱点: ${formData.mistakes}

出力は以下のJSON形式でお願いします（Markdown記法は含めないでください）:
{
  "homework": "提案する宿題の内容",
  "next_goal": "次回のレッスンの目標",
  "feedback": "生徒へのフィードバックコメント"
}
`;

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, type: 'record_assist' }),   // 記録：宿題・フィードバックの提案（利用実態を画面ごとに数えるため）
            });

            if (!res.ok) throw new Error('AI generation failed');

            const data = await res.json();
            // Clean up code blocks if present
            const cleanText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanText);

            setFormData(prev => ({
                ...prev,
                homework: result.homework || prev.homework,
                next_goal: result.next_goal || prev.next_goal,
                memo: (prev.memo ? prev.memo + '\n\n' : '') + `【AIフィードバック】\n${result.feedback}`,
            }));

        } catch (error) {
            console.error('AI Error:', error);
            alert('AI提案の生成に失敗しました。');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentId) return;

        setLoading(true);

        try {
            const payload = {
                student_id: studentId,
                date: new Date(`${formData.date}:00+09:00`).toISOString(),   // 入力欄の時刻は日本時間として保存する
                topics: formData.topics || null,
                vocabulary: formData.vocabulary || null,
                mistakes: formData.mistakes || null,
                understanding_level: formData.understanding_level,
                homework: formData.homework || null,
                next_goal: formData.next_goal || null,
                content: formData.memo || null,
                status: 'completed', // Mark as completed
            };

            let error;
            const targetLessonId = editLessonId ?? scheduledLessonId;   // 直すとき・予定を記録にするときは、その記録を上書き
            let savedLessonId: string | null = targetLessonId;

            if (targetLessonId) {
                // Update existing
                const result = await supabase
                    .from('lessons')
                    .update(payload)
                    .eq('id', targetLessonId);
                error = result.error;
            } else {
                // Insert new → IDを取得
                const result = await supabase
                    .from('lessons')
                    .insert([payload])
                    .select('id')
                    .single();
                error = result.error;
                savedLessonId = result.data?.id ?? null;
            }

            if (error) throw error;

            // Phase 3：ナレッジ蓄積ループ（非同期・ノンブロッキング）
            // 直したときは数え直さない（同じ授業を二重に数えないため）
            if (savedLessonId && !editLessonId) {
                fetch('/api/lessons/knowledge', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lesson_id: savedLessonId }),
                }).catch(err => console.error('Knowledge update failed (non-blocking):', err));
            }

            router.push(`/students/${studentId}`);
            router.refresh();
        } catch (error) {
            console.error('Error saving lesson:', error);
            alert('レッスン記録の保存に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    if (!studentId) return <div>Invalid Student ID</div>;

    if (fetchingScheduled || isAutoFilling || fetchingEdit) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-[#6b5ca5]" size={32} />
                {isAutoFilling && <p className="text-sm text-[#484550]">ASTAが授業の会話から記録を下書きしています…</p>}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {autoFilled && (
                <div className="flex items-center gap-2 px-4 py-3 bg-[#efe9ff] border border-[#ccbeff]/40 rounded-2xl text-sm text-[#6b5ca5] font-medium">
                    <Sparkles size={15} className="flex-shrink-0" />
                    ASTAが授業の会話（先生と生徒）から記録を下書きしました。内容を確かめて、直してから保存してください。
                </div>
            )}
            <div className="flex items-center gap-3">
                <Link href={`/students/${studentId}`} className="p-2 text-[#484550] hover:text-[#3a3350] hover:bg-[#f0ebf8] rounded-full transition-colors">
                    <ArrowLeft size={18} />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-[#3a3350]">{editLessonId ? 'レッスン記録を直す' : 'レッスン記録'}</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* 基本情報 */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] space-y-4">
                    <h2 className="text-sm font-bold text-[#3a3350] border-b border-[#f0ebf8] pb-2">基本情報</h2>
                    <div>
                        <label htmlFor="date" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">
                            日時 <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <input
                            type="datetime-local" id="date" name="date" required
                            value={formData.date} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button" onClick={handleGenerateFeedback}
                        disabled={isGenerating || (!formData.topics && !formData.mistakes)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#6b5ca5] text-white text-sm font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(107,92,165,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isGenerating ? <><Loader2 size={15} className="animate-spin" />AIが考え中…</> : <><Star size={15} className="fill-white" />AIで宿題・フィードバックを提案</>}
                    </button>
                </div>

                {/* 学習内容 */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] border border-[#ccbeff]/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#f0ebf8] pb-2">
                        <h2 className="text-sm font-bold text-[#6b5ca5]">学習内容（AI分析用）</h2>
                        <span className="text-[10px] font-bold bg-[#efe9ff] text-[#6b5ca5] px-2 py-0.5 rounded-full uppercase tracking-wide">重要</span>
                    </div>
                    <div>
                        <label htmlFor="topics" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">文法・トピック</label>
                        <input type="text" id="topics" name="topics" value={formData.topics} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors"
                            placeholder="例: 〜てはいけません, 許可を求める表現" />
                        <p className="text-[11px] text-[#484550]/60 mt-1">カンマ区切りで入力するとAIが認識しやすくなります</p>
                    </div>
                    <div>
                        <label htmlFor="vocabulary" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">語彙・表現</label>
                        <textarea id="vocabulary" name="vocabulary" rows={2} value={formData.vocabulary} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors resize-none"
                            placeholder="例: 規則、守る、厳しい" />
                    </div>
                    <div>
                        <label htmlFor="mistakes" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">つまずき・弱点</label>
                        <textarea id="mistakes" name="mistakes" rows={3} value={formData.mistakes} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#fff0f0] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#ffe4e4] transition-colors border border-[#f4b8b8]/50 resize-none placeholder:text-[#ba1a1a]/30"
                            placeholder="例: 「〜なくてはいけません」と「〜なくてもいいです」の混同が見られる。" />
                    </div>
                </div>

                {/* 生徒の様子・ネクスト */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] space-y-4">
                    <h2 className="text-sm font-bold text-[#3a3350] border-b border-[#f0ebf8] pb-2">生徒の様子・ネクストアクション</h2>
                    <div>
                        <label className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-2">理解度</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} type="button" onClick={() => setRating(star)}
                                    className={`p-1 transition-colors ${star <= formData.understanding_level ? 'text-[#ccbeff]' : 'text-[#f0ebf8]'}`}>
                                    <Star size={26} fill={star <= formData.understanding_level ? 'currentColor' : 'none'} strokeWidth={star <= formData.understanding_level ? 0 : 2} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="homework" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">宿題</label>
                            <textarea id="homework" name="homework" rows={3} value={formData.homework} onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors resize-none"
                                placeholder="ドリルP20-22" />
                        </div>
                        <div>
                            <label htmlFor="next_goal" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">次回の目標</label>
                            <textarea id="next_goal" name="next_goal" rows={3} value={formData.next_goal} onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors resize-none"
                                placeholder="会話練習を中心に" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="memo" className="block text-xs font-bold text-[#484550] uppercase tracking-wider mb-1.5">その他メモ</label>
                        <textarea id="memo" name="memo" rows={2} value={formData.memo} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#f0ebf8] rounded-xl text-sm text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors resize-none"
                            placeholder="雑談内容など" />
                    </div>
                </div>

                {/* 多言語フィードバック生成 */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] border border-[#ccbeff]/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#f0ebf8] pb-2">
                        <h2 className="text-sm font-bold text-[#6b5ca5] flex items-center gap-2">
                            <Globe size={15} /> 多言語フィードバック生成
                        </h2>
                        <span className="text-[10px] font-bold bg-[#efe9ff] text-[#6b5ca5] px-2 py-0.5 rounded-full">生徒に送る文章</span>
                    </div>
                    <div>
                        <p className="text-xs text-[#484550] mb-2">生徒の母国語を選択</p>
                        <div className="flex flex-wrap gap-2">
                            {FEEDBACK_LANGUAGES.map((lang) => (
                                <button key={lang.code} type="button"
                                    onClick={() => { setSelectedLang(lang.code); setMultilingualFeedback(''); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                        selectedLang === lang.code
                                            ? 'bg-[#6b5ca5] text-white shadow-sm'
                                            : 'bg-[#f0ebf8] text-[#484550] hover:bg-[#efe9ff] hover:text-[#6b5ca5]'
                                    }`}>
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button type="button" onClick={handleGenerateMultilingualFeedback}
                        disabled={isGeneratingFeedback || (!formData.topics && !formData.mistakes && !formData.homework)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-[#6b5ca5] text-white text-sm font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(107,92,165,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isGeneratingFeedback
                            ? <><Loader2 size={15} className="animate-spin" />生成中…</>
                            : <><Globe size={15} />{FEEDBACK_LANGUAGES.find(l => l.code === selectedLang)?.label}でフィードバックを生成</>
                        }
                    </button>
                    {multilingualFeedback && (
                        <div className="relative bg-[#efe9ff] border border-[#ccbeff]/40 rounded-2xl p-4">
                            <p className="text-sm text-[#3a3350] whitespace-pre-wrap leading-relaxed pr-16">{multilingualFeedback}</p>
                            <button type="button" onClick={handleCopyFeedback}
                                className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                                    feedbackCopied ? 'bg-[#dcfce7] text-[#166534]' : 'bg-white text-[#484550] hover:bg-[#dff1ea] border border-[#ccbeff]/30'
                                }`}>
                                {feedbackCopied ? <Check size={12} /> : <Copy size={12} />}
                                {feedbackCopied ? 'コピー済み' : 'コピー'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2 pb-0">
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#6b5ca5] text-white font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(107,92,165,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="animate-spin" size={16} />
                                保存中...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                保存する
                            </>
                        )}
                    </button>
                </div>

                {/* Chat Logs (if available) - placed at bottom for reference */}
                <LessonChatLogsViewer lessonId={scheduledLessonId} />
            </form>
        </div>
    );
}
