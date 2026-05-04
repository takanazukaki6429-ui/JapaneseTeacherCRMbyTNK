'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Save, Loader2, Star, Globe, Copy, Check, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { LessonChatLogsViewer } from '@/components/lessons/lesson-chat-logs-viewer';

export default function NewLessonPage() {
    const router = useRouter();
    const supabase = createClient();
    const params = useParams(); // useParams returns string | string[]
    const studentId = typeof params.id === 'string' ? params.id : '';
    const searchParams = useSearchParams();
    const scheduledLessonId = searchParams.get('scheduledLessonId');

    const [loading, setLoading] = useState(false);
    const [fetchingScheduled, setFetchingScheduled] = useState(false);
    const [isAutoFilling, setIsAutoFilling] = useState(false);
    const [autoFilled, setAutoFilled] = useState(false);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().slice(0, 16), // datetime-local format YYYY-MM-DDTHH:mm
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
                    // Convert ISO date to datetime-local format (subset)
                    const dateObj = new Date(data.date);
                    const localIso = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);

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

    useEffect(() => {
        if (!studentId) return;
        const sessionKey = `live_session_${studentId}`;
        const saved = localStorage.getItem(sessionKey);
        if (!saved) return;
        try {
            const { transcript, courseSuggestions: suggestions } = JSON.parse(saved);
            localStorage.removeItem(sessionKey);
            if (!transcript?.trim()) return;
            setIsAutoFilling(true);
            const context = suggestions?.length
                ? `\n\nAIサジェスト:\n${suggestions.map((s: { text: string }) => s.text).join('\n\n')}`
                : '';
            fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: `以下は日本語レッスン中の音声テキストです。これをもとにレッスン記録の各項目を抽出してください。${context}\n\n音声テキスト:\n${transcript.slice(0, 1500)}\n\n以下のJSON形式のみで出力（Markdownなし）:\n{\n  "topics": "学習した文法・トピック（カンマ区切り）",\n  "vocabulary": "出てきた語彙・表現（カンマ区切り）",\n  "mistakes": "つまずき・弱点"\n}`,
                }),
            })
                .then(r => r.json())
                .then(data => {
                    try {
                        const clean = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
                        const result = JSON.parse(clean);
                        setFormData(prev => ({
                            ...prev,
                            topics: result.topics || prev.topics,
                            vocabulary: result.vocabulary || prev.vocabulary,
                            mistakes: result.mistakes || prev.mistakes,
                        }));
                        setAutoFilled(true);
                    } catch { /* ignore parse errors */ }
                })
                .catch(err => console.error('Auto-fill error:', err))
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
    const LANGUAGE_NAMES: Record<string, string> = {
        en: 'English', es: 'Español', pt: 'Português',
        ko: '한국어', zh: '中文', fr: 'Français', ja: '日本語',
    };
    const [selectedLang, setSelectedLang] = useState<string>('en');
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
                    language_name: LANGUAGE_NAMES[selectedLang],
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
                body: JSON.stringify({ prompt }),
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
                date: new Date(formData.date).toISOString(),
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
            let savedLessonId: string | null = scheduledLessonId;

            if (scheduledLessonId) {
                // Update existing
                const result = await supabase
                    .from('lessons')
                    .update(payload)
                    .eq('id', scheduledLessonId);
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
            if (savedLessonId) {
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

    if (fetchingScheduled || isAutoFilling) {
        return (
            <div className="flex h-screen flex-col items-center justify-center gap-3">
                <Loader2 className="animate-spin text-[#6f5385]" size={32} />
                {isAutoFilling && <p className="text-sm text-[#4b454e]">授業データをAIが解析中…</p>}
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {autoFilled && (
                <div className="flex items-center gap-2 px-4 py-3 bg-[#f2daff] border border-[#c9a8e0]/40 rounded-2xl text-sm text-[#6f5385] font-medium">
                    <Sparkles size={15} className="flex-shrink-0" />
                    授業の音声データからAIが自動入力しました。内容を確認・編集してください。
                </div>
            )}
            <div className="flex items-center gap-3">
                <Link href={`/students/${studentId}`} className="p-2 text-[#4b454e] hover:text-[#1a1c1e] hover:bg-[#f4f3f7] rounded-full transition-colors">
                    <ArrowLeft size={18} />
                </Link>
                <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">レッスン記録</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* 基本情報 */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] space-y-4">
                    <h2 className="text-sm font-bold text-[#1a1c1e] border-b border-[#f4f3f7] pb-2">基本情報</h2>
                    <div>
                        <label htmlFor="date" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">
                            日時 <span className="text-[#ba1a1a]">*</span>
                        </label>
                        <input
                            type="datetime-local" id="date" name="date" required
                            value={formData.date} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors"
                        />
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="button" onClick={handleGenerateFeedback}
                        disabled={isGenerating || (!formData.topics && !formData.mistakes)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white text-sm font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isGenerating ? <><Loader2 size={15} className="animate-spin" />AIが考え中…</> : <><Star size={15} className="fill-white" />AIで宿題・フィードバックを提案</>}
                    </button>
                </div>

                {/* 学習内容 */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] border border-[#c9a8e0]/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#f4f3f7] pb-2">
                        <h2 className="text-sm font-bold text-[#6f5385]">学習内容（AI分析用）</h2>
                        <span className="text-[10px] font-bold bg-[#f2daff] text-[#6f5385] px-2 py-0.5 rounded-full uppercase tracking-wide">重要</span>
                    </div>
                    <div>
                        <label htmlFor="topics" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">文法・トピック</label>
                        <input type="text" id="topics" name="topics" value={formData.topics} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors"
                            placeholder="例: 〜てはいけません, 許可を求める表現" />
                        <p className="text-[11px] text-[#4b454e]/60 mt-1">カンマ区切りで入力するとAIが認識しやすくなります</p>
                    </div>
                    <div>
                        <label htmlFor="vocabulary" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">語彙・表現</label>
                        <textarea id="vocabulary" name="vocabulary" rows={2} value={formData.vocabulary} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors resize-none"
                            placeholder="例: 規則、守る、厳しい" />
                    </div>
                    <div>
                        <label htmlFor="mistakes" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">つまずき・弱点</label>
                        <textarea id="mistakes" name="mistakes" rows={3} value={formData.mistakes} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#fff0f0] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#ffe4e4] transition-colors border border-[#f4b8b8]/50 resize-none placeholder:text-[#ba1a1a]/30"
                            placeholder="例: 「〜なくてはいけません」と「〜なくてもいいです」の混同が見られる。" />
                    </div>
                </div>

                {/* 生徒の様子・ネクスト */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] space-y-4">
                    <h2 className="text-sm font-bold text-[#1a1c1e] border-b border-[#f4f3f7] pb-2">生徒の様子・ネクストアクション</h2>
                    <div>
                        <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-2">理解度</label>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button key={star} type="button" onClick={() => setRating(star)}
                                    className={`p-1 transition-colors ${star <= formData.understanding_level ? 'text-[#c9a8e0]' : 'text-[#f4f3f7]'}`}>
                                    <Star size={26} fill={star <= formData.understanding_level ? 'currentColor' : 'none'} strokeWidth={star <= formData.understanding_level ? 0 : 2} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="homework" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">宿題</label>
                            <textarea id="homework" name="homework" rows={3} value={formData.homework} onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors resize-none"
                                placeholder="ドリルP20-22" />
                        </div>
                        <div>
                            <label htmlFor="next_goal" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">次回の目標</label>
                            <textarea id="next_goal" name="next_goal" rows={3} value={formData.next_goal} onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors resize-none"
                                placeholder="会話練習を中心に" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="memo" className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-1.5">その他メモ</label>
                        <textarea id="memo" name="memo" rows={2} value={formData.memo} onChange={handleChange}
                            className="w-full px-4 py-2.5 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors resize-none"
                            placeholder="雑談内容など" />
                    </div>
                </div>

                {/* 多言語フィードバック生成 */}
                <div className="bg-white p-6 rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] border border-[#c9a8e0]/30 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#f4f3f7] pb-2">
                        <h2 className="text-sm font-bold text-[#6f5385] flex items-center gap-2">
                            <Globe size={15} /> 多言語フィードバック生成
                        </h2>
                        <span className="text-[10px] font-bold bg-[#f2daff] text-[#6f5385] px-2 py-0.5 rounded-full">生徒に送る文章</span>
                    </div>
                    <div>
                        <p className="text-xs text-[#4b454e] mb-2">生徒の母国語を選択</p>
                        <div className="flex flex-wrap gap-2">
                            {FEEDBACK_LANGUAGES.map((lang) => (
                                <button key={lang.code} type="button"
                                    onClick={() => { setSelectedLang(lang.code); setMultilingualFeedback(''); }}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                        selectedLang === lang.code
                                            ? 'bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white shadow-sm'
                                            : 'bg-[#f4f3f7] text-[#4b454e] hover:bg-[#f2daff] hover:text-[#6f5385]'
                                    }`}>
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button type="button" onClick={handleGenerateMultilingualFeedback}
                        disabled={isGeneratingFeedback || (!formData.topics && !formData.mistakes && !formData.homework)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white text-sm font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                        {isGeneratingFeedback
                            ? <><Loader2 size={15} className="animate-spin" />生成中…</>
                            : <><Globe size={15} />{FEEDBACK_LANGUAGES.find(l => l.code === selectedLang)?.label}でフィードバックを生成</>
                        }
                    </button>
                    {multilingualFeedback && (
                        <div className="relative bg-[#f2daff] border border-[#c9a8e0]/40 rounded-2xl p-4">
                            <p className="text-sm text-[#1a1c1e] whitespace-pre-wrap leading-relaxed pr-16">{multilingualFeedback}</p>
                            <button type="button" onClick={handleCopyFeedback}
                                className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-lg transition-all ${
                                    feedbackCopied ? 'bg-[#dcfce7] text-[#166534]' : 'bg-white text-[#4b454e] hover:bg-[#eddcf4] border border-[#c9a8e0]/30'
                                }`}>
                                {feedbackCopied ? <Check size={12} /> : <Copy size={12} />}
                                {feedbackCopied ? 'コピー済み' : 'コピー'}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-2 pb-0">
                    <button type="submit" disabled={loading}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
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
