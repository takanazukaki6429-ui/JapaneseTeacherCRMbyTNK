'use client';

import React, { useState, useEffect } from 'react';

import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Sparkles, Loader2, BookOpen, Brain, ArrowRight, Save } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';

type KeyPoint = {
    question: string;
    answer: string;
};

type PrepContent = {
    review_quiz: KeyPoint[];
    intro_topic: string;
    advice: string;
};

export default function LessonPreparePage() {
    const router = useRouter();
    const params = useParams();
    const studentId = typeof params.id === 'string' ? params.id : '';
    const supabase = createClient();
    const searchParams = useSearchParams();
    const scheduledLessonId = searchParams.get('scheduledLessonId');

    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [lastLesson, setLastLesson] = useState<any>(null);
    const [studentName, setStudentName] = useState('');
    const [prepContent, setPrepContent] = useState<PrepContent | null>(null);

    // Save State
    const [isSaving, setIsSaving] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [savingLoading, setSavingLoading] = useState(false);

    const handleSaveMaterial = async () => {
        if (!prepContent || !saveTitle.trim()) return;
        setSavingLoading(true);

        const content = `
## 復習クイズ
${prepContent.review_quiz.map((q, i) => `Q${i + 1}. ${q.question}\nA. ${q.answer}`).join('\n')}

## 導入トーク
${prepContent.intro_topic}

## アドバイス
${prepContent.advice}
`;

        try {
            const { error } = await supabase.from('materials').insert([
                {
                    title: saveTitle,
                    content: content.trim(),
                    type: 'content',
                    is_public: false,
                    tags: ['レッスン準備', `Student:${studentName}`],
                }
            ]);

            if (error) throw error;

            toast.success("教材として保存しました！");
            setIsSaving(false);
            setSaveTitle('');
        } catch (error) {
            console.error('Error saving material:', error);
            toast.error("保存に失敗しました");
        } finally {
            setSavingLoading(false);
        }
    };

    useEffect(() => {
        if (studentId) {
            fetchData();
        }
    }, [studentId]);

    const fetchData = async () => {
        try {
            // Fetch student name
            const { data: student } = await supabase
                .from('students')
                .select('name')
                .eq('id', studentId)
                .single();

            if (student) setStudentName(student.name);

            // Fetch last lesson
            const { data: lessons, error } = await supabase
                .from('lessons')
                .select('*')
                .eq('student_id', studentId)
                .order('date', { ascending: false })
                .limit(1);

            if (lessons && lessons.length > 0) {
                setLastLesson(lessons[0]);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!lastLesson) return;
        setGenerating(true);

        try {
            const prompt = `
あなたはプロの日本語教師です。
前回 (${new Date(lastLesson.date).toLocaleDateString()}) のレッスン記録に基づき、今日のレッスンのための「復習クイズ」と「導入トーク」を作成してください。

## 前回のレッスン記録
- 宿題: ${lastLesson.homework || 'なし'}
- つまずき・弱点: ${lastLesson.mistakes || 'なし'}
- 次回の目標: ${lastLesson.next_goal || 'なし'}
- トピック: ${lastLesson.topics || 'なし'}

出力は以下のJSON形式でお願いします（Markdownコードブロックは不要です）:
{
  "review_quiz": [
    {"question": "問題文1", "answer": "答え1"},
    {"question": "問題文2", "answer": "答え2"}
    // 3問程度
  ],
  "intro_topic": "前回の内容を踏まえた、今日のレッスンの導入となる短いトークスクリプト（挨拶含む）",
  "advice": "教師へのアドバイス（今日のポイントなど）"
}
`;
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) throw new Error('AI request failed');

            const data = await res.json();
            const cleanText = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanText);

            setPrepContent(result);

            // Save to local storage for access in Live Mode
            localStorage.setItem(`prep_content_${studentId}`, JSON.stringify(result));

        } catch (error) {
            console.error('AI Generation Error:', error);
            alert('生成に失敗しました。');
        } finally {
            setGenerating(false);
        }
    };

    const startLiveMode = () => {
        const query = scheduledLessonId ? `?scheduledLessonId=${scheduledLessonId}` : '';
        router.push(`/students/${studentId}/lessons/live${query}`);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    href={`/students/${studentId}`}
                    className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">レッスン準備</h1>
                    <p className="text-slate-500 text-sm">AIが前回の記録から最適な導入を提案します</p>
                </div>
            </div>

            {/* Context Card */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">前回の記録 ({lastLesson ? new Date(lastLesson.date).toLocaleDateString() : '記録なし'})</h2>

                {lastLesson ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <Brain size={16} className="text-red-500" /> つまずき・弱点
                            </h3>
                            <p className="text-slate-700 text-sm">{lastLesson.mistakes || '特になし'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-lg">
                            <h3 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                                <BookOpen size={16} className="text-blue-500" /> 宿題・課題
                            </h3>
                            <p className="text-slate-700 text-sm">{lastLesson.homework || '特になし'}</p>
                        </div>
                        <div className="md:col-span-2">
                            <p className="text-xs text-slate-400">次回の目標: {lastLesson.next_goal || '未設定'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 text-slate-500">
                        <p>前回のレッスン記録が見つかりません。</p>
                        <p className="text-sm">初回レッスンの場合は、直接レッスンを開始することをお勧めします。</p>
                    </div>
                )}
            </div>

            {/* AI Generation Action */}
            {!prepContent && lastLesson && (
                <div className="flex justify-center py-8">
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="flex flex-col items-center gap-3 px-8 py-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 transition-all w-full md:w-auto"
                    >
                        {generating ? (
                            <Loader2 size={32} className="animate-spin" />
                        ) : (
                            <Sparkles size={32} className="fill-yellow-300 text-yellow-300" />
                        )}
                        <span className="text-lg font-bold">
                            {generating ? 'AIが考え中...' : 'AIで準備プランを作成'}
                        </span>
                        <span className="text-xs opacity-80 font-normal">
                            復習クイズと導入トークを自動生成します
                        </span>
                    </button>
                </div>
            )}

            {/* Generated Content */}
            {prepContent && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden">
                        <div className="bg-purple-50 p-4 border-b border-purple-100 flex items-center justify-between">
                            <h2 className="font-bold text-purple-900 flex items-center gap-2">
                                <Sparkles size={18} className="text-purple-600" />
                                AI提案プラン
                            </h2>
                            <div className="flex gap-2 items-center">
                                <span className="text-xs bg-white text-purple-700 px-2 py-1 rounded-full border border-purple-200">Generated</span>
                                <button
                                    onClick={() => {
                                        setIsSaving(!isSaving);
                                        if (!saveTitle) setSaveTitle(`${new Date().toLocaleDateString()} ${studentName}様 レッスン準備`);
                                    }}
                                    className="p-1 text-purple-600 hover:bg-purple-100 rounded transition-colors"
                                    title="教材として保存"
                                >
                                    <Save size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Save Form */}
                        {isSaving && (
                            <div className="p-4 bg-purple-50/50 border-b border-purple-100">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="タイトルを入力"
                                        className="flex-1 px-3 py-2 text-sm border border-purple-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        value={saveTitle}
                                        onChange={(e) => setSaveTitle(e.target.value)}
                                    />
                                    <button
                                        onClick={handleSaveMaterial}
                                        disabled={savingLoading || !saveTitle.trim()}
                                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {savingLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        保存
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="p-6 space-y-6">
                            {/* Quiz */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-teal-500 pl-3">復習クイズ (Ice Break)</h3>
                                <div className="space-y-3">
                                    {prepContent.review_quiz.map((q, i) => (
                                        <div key={i} className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                            <p className="font-bold text-slate-800 text-sm mb-2">Q{i + 1}. {q.question}</p>
                                            <p className="text-slate-600 text-sm pl-4 border-l-2 border-slate-300">A. {q.answer}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Intro Talk */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-teal-500 pl-3">導入トーク</h3>
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                                    {prepContent.intro_topic}
                                </div>
                            </div>

                            {/* Advice */}
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-3 border-l-4 border-teal-500 pl-3">アドバイス</h3>
                                <p className="text-sm text-slate-600 italic">
                                    {prepContent.advice}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={startLiveMode}
                            className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-full shadow-md hover:bg-teal-700 hover:shadow-lg transition-all"
                        >
                            <span>カンペモードを開始する</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
