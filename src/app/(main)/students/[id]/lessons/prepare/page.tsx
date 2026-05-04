'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft, Sparkles, Loader2, BookOpen, Brain, ArrowRight,
    CheckCircle2, PenLine, MessageSquare, LayoutGrid, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { showAppError } from '@/lib/error-handler';
import Link from 'next/link';
import { Lesson } from '@/types/lesson';
import { Student } from '@/types/student';

/* ── 型定義 ─────────────────────────────────────── */
type KeyPoint = { question: string; answer: string };
type PrepContent = {
    review_quiz: KeyPoint[];
    intro_topic: string;
    advice: string;
};

type MaterialContentType = 'fill_in_blank' | 'dialogue' | 'flashcard';

type Flashcard = { front: string; back: string };
type GeneratedMaterial = {
    title: string;
    content: string;            // 穴埋め・会話練習の場合はここに本文
    cards?: Flashcard[];        // フラッシュカードの場合のみ
};

/* ── 教材種別マスタ ──────────────────────────────── */
const MATERIAL_TYPES: Record<
    MaterialContentType,
    { label: string; icon: React.ReactNode; desc: string; tag: string }
> = {
    fill_in_blank: {
        label: '穴埋め問題',
        icon: <PenLine size={18} />,
        desc: '文法・語彙の確認練習問題',
        tag: '穴埋め',
    },
    dialogue: {
        label: '会話練習',
        icon: <MessageSquare size={18} />,
        desc: '目的に合ったロールプレイスクリプト',
        tag: '会話練習',
    },
    flashcard: {
        label: 'フラッシュカード',
        icon: <LayoutGrid size={18} />,
        desc: '語彙・表現の暗記カードセット',
        tag: 'フラッシュカード',
    },
};

/* ── コンポーネント ──────────────────────────────── */
export default function LessonPreparePage() {
    const router = useRouter();
    const params = useParams();
    const studentId = typeof params.id === 'string' ? params.id : '';
    const supabase = createClient();
    const searchParams = useSearchParams();
    const scheduledLessonId = searchParams.get('scheduledLessonId');

    // データ
    const [loading, setLoading] = useState(true);
    const [lastLesson, setLastLesson] = useState<Lesson | null>(null);
    const [student, setStudent] = useState<Student | null>(null);

    // 準備プラン（既存機能）
    const [generating, setGenerating] = useState(false);
    const [prepContent, setPrepContent] = useState<PrepContent | null>(null);
    const [prepExpanded, setPrepExpanded] = useState(true);

    // 教材生成（新機能）
    const [selectedType, setSelectedType] = useState<MaterialContentType>('fill_in_blank');
    const [shareToCommunity, setShareToCommuntiy] = useState(false);
    const [generatingMaterial, setGeneratingMaterial] = useState(false);
    const [generatedMaterial, setGeneratedMaterial] = useState<GeneratedMaterial | null>(null);
    const [materialSaved, setMaterialSaved] = useState(false);

    /* ── データ取得 ──────────────────────────────── */
    useEffect(() => {
        if (!studentId) return;
        const fetchData = async () => {
            try {
                const [{ data: stu }, { data: lessons }] = await Promise.all([
                    supabase
                        .from('students')
                        .select('*')
                        .eq('id', studentId)
                        .single(),
                    supabase
                        .from('lessons')
                        .select('*')
                        .eq('student_id', studentId)
                        .order('date', { ascending: false })
                        .limit(1),
                ]);
                if (stu) setStudent(stu as Student);
                if (lessons && lessons.length > 0) setLastLesson(lessons[0]);
            } catch (err) {
                console.error('Error fetching data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [studentId]);

    /* ── 準備プラン生成（既存） ──────────────────── */
    const handleGeneratePlan = async () => {
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
            const clean = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result: PrepContent = JSON.parse(clean);
            setPrepContent(result);
            localStorage.setItem(`prep_content_${studentId}`, JSON.stringify(result));
        } catch (err) {
            console.error('Plan generation error:', err);
            toast.error('生成に失敗しました。もう一度お試しください。');
        } finally {
            setGenerating(false);
        }
    };

    /* ── 教材生成（新機能） ──────────────────────── */
    const handleGenerateMaterial = async () => {
        setGeneratingMaterial(true);
        setGeneratedMaterial(null);
        setMaterialSaved(false);

        // 生徒コンテキストを構築
        const ctx: string[] = [];
        if (student?.name) ctx.push(`・氏名：${student.name}`);
        if (student?.nationality) ctx.push(`・国籍：${student.nationality}`);
        if (student?.jlpt_level) ctx.push(`・日本語レベル：${student.jlpt_level}`);
        if (student?.goal_text) ctx.push(`・学習目的：${student.goal_text}`);
        if (student?.textbook) ctx.push(`・使用教材：${student.textbook}`);
        if (student?.current_phase) ctx.push(`・現在のフェーズ：${student.current_phase}`);
        if (student?.memo) ctx.push(`・特記事項：${student.memo}`);
        if (lastLesson?.topics) ctx.push(`・前回のトピック：${lastLesson.topics}`);
        if (lastLesson?.vocabulary) ctx.push(`・前回の語彙：${lastLesson.vocabulary}`);
        if (lastLesson?.mistakes) ctx.push(`・つまずき・弱点：${lastLesson.mistakes}`);
        if (lastLesson?.next_goal) ctx.push(`・次回の目標：${lastLesson.next_goal}`);

        const typeInstructions: Record<MaterialContentType, string> = {
            fill_in_blank: `
上記の生徒プロフィールと直近レッスン記録をもとに、**今日のレッスンで使う穴埋め練習問題**を作成してください。
- 問題数：5〜8問
- 空欄は「（　）」で表す
- 必ず答えを問題の後にまとめて記載する
- 難易度は生徒のレベルに合わせる
- 前回のつまずき・次回目標を優先的に反映する

出力フォーマット（Markdownコードブロック不要のJSON）:
{
  "title": "教材のタイトル（例: N4助詞穴埋め問題）",
  "content": "問題本文（改行含む）",
  "cards": null
}`,
            dialogue: `
上記の生徒プロフィールと直近レッスン記録をもとに、**今日のレッスンで使うロールプレイ会話スクリプト**を作成してください。
- 生徒の学習目的（旅行・仕事・日常会話など）に合わせた場面設定
- 先生役（T）と生徒役（S）の形式
- 8〜12ターン程度
- 難しい表現には簡単な補足をカッコ内に添える
- 最後に重要表現リストを付ける

出力フォーマット（Markdownコードブロック不要のJSON）:
{
  "title": "教材のタイトル（例: カフェでの注文会話）",
  "content": "スクリプト本文（改行含む）",
  "cards": null
}`,
            flashcard: `
上記の生徒プロフィールと直近レッスン記録をもとに、**今日覚えるべき語彙・表現のフラッシュカードセット**を作成してください。
- 枚数：10〜15枚
- 表面：日本語（ひらがな/カタカナ/漢字）
- 裏面：意味＋例文（生徒の母語または英語で補足）
- 前回の語彙・弱点・目標から重点的に選ぶ

出力フォーマット（Markdownコードブロック不要のJSON）:
{
  "title": "教材のタイトル（例: N4必須語彙カードセット）",
  "content": "",
  "cards": [
    {"front": "表面テキスト", "back": "裏面テキスト"},
    ...
  ]
}`,
        };

        const prompt = `
あなたは日本語教育の専門家です。以下の生徒情報をもとに最適な教材を生成してください。

## 生徒情報
${ctx.join('\n')}

## 指示
${typeInstructions[selectedType]}
`;

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error('AI request failed');
            const data = await res.json();
            const clean = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result: GeneratedMaterial = JSON.parse(clean);
            setGeneratedMaterial(result);

            // 自動保存（student_id付き）
            await autoSaveMaterial(result);
        } catch (err) {
            console.error('Material generation error:', err);
            toast.error('教材の生成に失敗しました。もう一度お試しください。');
        } finally {
            setGeneratingMaterial(false);
        }
    };

    const autoSaveMaterial = async (mat: GeneratedMaterial) => {
        try {
            const contentToSave = mat.cards
                ? mat.cards.map((c, i) => `[${i + 1}] 表: ${c.front}\n     裏: ${c.back}`).join('\n')
                : mat.content;

            const { error } = await supabase.from('materials').insert([{
                title: mat.title,
                content: contentToSave,
                type: 'content',
                is_public: shareToCommunity,
                tags: [MATERIAL_TYPES[selectedType].tag, student?.name ?? ''],
                student_id: studentId,
            }]);

            if (error) {
                // student_id カラムがまだない場合はフォールバック（migration未適用時）
                if (error.message?.includes('student_id')) {
                    await supabase.from('materials').insert([{
                        title: mat.title,
                        content: contentToSave,
                        type: 'content',
                        is_public: shareToCommunity,
                        tags: [MATERIAL_TYPES[selectedType].tag, student?.name ?? ''],
                    }]);
                } else {
                    throw error;
                }
            }
            setMaterialSaved(true);
            toast.success('教材として保存しました！');
        } catch (err) {
            console.error('Auto-save error:', err);
            showAppError(err, '教材の保存に失敗しました');
        }
    };

    const startLiveMode = () => {
        const query = scheduledLessonId ? `?scheduledLessonId=${scheduledLessonId}` : '';
        router.push(`/students/${studentId}/lessons/live${query}`);
    };

    /* ── ローディング ────────────────────────────── */
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-[#6f5385]" size={32} />
            </div>
        );
    }

    /* ── レンダリング ─────────────────────────────── */
    return (
        <div className="max-w-3xl mx-auto space-y-5 pb-20">

            {/* ── ヘッダー ── */}
            <div className="flex items-center gap-3">
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-1.5 text-sm text-[#4b454e] hover:text-[#1a1c1e] transition-colors"
                >
                    <ArrowLeft size={16} />
                    {student?.name ?? '生徒詳細'}
                </Link>
            </div>
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">レッスン準備</h1>
                <p className="text-sm text-[#4b454e] mt-0.5">AIが最適な授業プランと専用教材を提案します</p>
            </div>

            {/* ── 前回の記録 ── */}
            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] p-5">
                <h2 className="text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-4">
                    前回の記録（{lastLesson ? new Date(lastLesson.date).toLocaleDateString('ja-JP') : '記録なし'}）
                </h2>

                {lastLesson ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-[#f4f3f7] p-4 rounded-xl">
                            <h3 className="text-xs font-bold text-[#1a1c1e] flex items-center gap-1.5 mb-2">
                                <Brain size={14} className="text-[#ba1a1a]" /> つまずき・弱点
                            </h3>
                            <p className="text-sm text-[#4b454e]">{lastLesson.mistakes || '特になし'}</p>
                        </div>
                        <div className="bg-[#f4f3f7] p-4 rounded-xl">
                            <h3 className="text-xs font-bold text-[#1a1c1e] flex items-center gap-1.5 mb-2">
                                <BookOpen size={14} className="text-[#6f5385]" /> 宿題・課題
                            </h3>
                            <p className="text-sm text-[#4b454e]">{lastLesson.homework || '特になし'}</p>
                        </div>
                        <div className="sm:col-span-2 px-1">
                            <p className="text-xs text-[#4b454e]/70">次回の目標：{lastLesson.next_goal || '未設定'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8">
                        <p className="text-sm text-[#4b454e] mb-1">前回のレッスン記録が見つかりません。</p>
                        <p className="text-xs text-[#4b454e]/60 mb-6">初回レッスンの場合は、直接ライブ授業を開始できます。</p>
                        <button
                            onClick={startLiveMode}
                            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold text-sm rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)]"
                        >
                            ライブ授業を開始する
                            <ArrowRight size={16} />
                        </button>
                    </div>
                )}
            </div>

            {/* ── 準備プラン生成（既存機能） ── */}
            {lastLesson && (
                <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] overflow-hidden">
                    <button
                        onClick={() => setPrepExpanded(v => !v)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left"
                    >
                        <div className="flex items-center gap-2">
                            <Sparkles size={16} className="text-[#6f5385]" />
                            <span className="font-bold text-sm text-[#1a1c1e]">準備プランを作成</span>
                            <span className="text-xs text-[#4b454e]/60">復習クイズ・導入トーク</span>
                        </div>
                        {prepExpanded ? <ChevronUp size={16} className="text-[#4b454e]" /> : <ChevronDown size={16} className="text-[#4b454e]" />}
                    </button>

                    {prepExpanded && (
                        <div className="px-5 pb-5 border-t border-[#f4f3f7]">
                            {!prepContent ? (
                                <div className="flex justify-center pt-5">
                                    <button
                                        onClick={handleGeneratePlan}
                                        disabled={generating}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-[#f2daff] text-[#6f5385] font-bold text-sm rounded-full hover:bg-[#eddcf4] hover:-translate-y-0.5 transition-all disabled:opacity-50"
                                    >
                                        {generating ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                                        {generating ? 'AIが考え中...' : 'AIで準備プランを作成'}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-4 pt-4">
                                    {/* 復習クイズ */}
                                    <div>
                                        <h3 className="text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-3 border-l-2 border-[#6f5385] pl-2">
                                            復習クイズ
                                        </h3>
                                        <div className="space-y-2">
                                            {prepContent.review_quiz.map((q, i) => (
                                                <div key={i} className="bg-[#f4f3f7] p-3.5 rounded-xl">
                                                    <p className="font-bold text-sm text-[#1a1c1e] mb-1">Q{i + 1}. {q.question}</p>
                                                    <p className="text-sm text-[#4b454e] pl-3 border-l-2 border-[#cdc3ce]">A. {q.answer}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 導入トーク */}
                                    <div>
                                        <h3 className="text-xs font-bold text-[#4b454e] uppercase tracking-wider mb-3 border-l-2 border-[#6f5385] pl-2">
                                            導入トーク
                                        </h3>
                                        <div className="bg-[#f2daff]/40 p-4 rounded-xl text-sm text-[#1a1c1e] leading-relaxed whitespace-pre-wrap">
                                            {prepContent.intro_topic}
                                        </div>
                                    </div>

                                    {/* アドバイス */}
                                    <div className="bg-[#f4f3f7] p-4 rounded-xl">
                                        <p className="text-xs font-bold text-[#4b454e] mb-1">💡 アドバイス</p>
                                        <p className="text-sm text-[#4b454e] italic">{prepContent.advice}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── 教材生成（新機能）────────────────── */}
            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] p-5 space-y-4">
                <div>
                    <h2 className="font-bold text-sm text-[#1a1c1e] flex items-center gap-2">
                        <BookOpen size={16} className="text-[#6f5385]" />
                        今日の教材を生成
                    </h2>
                    <p className="text-xs text-[#4b454e]/70 mt-0.5">
                        {student?.name}さんのレベル・目標・つまずきをもとにAIが専用教材を作成します
                    </p>
                </div>

                {/* 種別セレクター */}
                <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(MATERIAL_TYPES) as [MaterialContentType, typeof MATERIAL_TYPES[MaterialContentType]][]).map(
                        ([key, meta]) => (
                            <button
                                key={key}
                                onClick={() => {
                                    setSelectedType(key);
                                    setGeneratedMaterial(null);
                                    setMaterialSaved(false);
                                }}
                                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                                    selectedType === key
                                        ? 'border-[#6f5385] bg-[#f2daff] text-[#6f5385]'
                                        : 'border-[#cdc3ce]/30 hover:border-[#cdc3ce] text-[#4b454e]'
                                }`}
                            >
                                {meta.icon}
                                <span className="text-xs font-bold">{meta.label}</span>
                                <span className="text-[10px] leading-tight opacity-70 hidden sm:block">{meta.desc}</span>
                            </button>
                        )
                    )}
                </div>

                {/* コミュニティ共有トグル */}
                {!generatedMaterial && (
                    <div className="flex items-center justify-between px-1">
                        <div>
                            <p className="text-xs font-semibold text-[#1a1c1e]">コミュニティに共有する</p>
                            <p className="text-[10px] text-[#4b454e]/70">他の先生も閲覧できる公開教材として保存します</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShareToCommuntiy(v => !v)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${shareToCommunity ? 'bg-[#6f5385]' : 'bg-[#cdc3ce]'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${shareToCommunity ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                )}

                {/* 生成ボタン */}
                {!generatedMaterial && (
                    <button
                        onClick={handleGenerateMaterial}
                        disabled={generatingMaterial}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold text-sm rounded-full hover:scale-[1.01] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generatingMaterial ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                AIが{MATERIAL_TYPES[selectedType].label}を作成中...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} />
                                {MATERIAL_TYPES[selectedType].label}を生成する
                            </>
                        )}
                    </button>
                )}

                {/* 生成結果プレビュー */}
                {generatedMaterial && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-400">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-[#1a1c1e]">{generatedMaterial.title}</h3>
                            {materialSaved && (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-[#386a20] bg-[#c3efad]/40 px-2.5 py-1 rounded-full">
                                    <CheckCircle2 size={12} />
                                    教材として保存済み
                                </span>
                            )}
                        </div>

                        {/* フラッシュカード */}
                        {generatedMaterial.cards && generatedMaterial.cards.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {generatedMaterial.cards.map((card, i) => (
                                    <div
                                        key={i}
                                        className="bg-[#f4f3f7] hover:bg-[#f2daff] transition-colors rounded-xl p-3 cursor-default"
                                    >
                                        <p className="font-bold text-sm text-[#1a1c1e] mb-1">{card.front}</p>
                                        <p className="text-xs text-[#4b454e]">{card.back}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* 穴埋め・会話練習 */
                            <div className="bg-[#f4f3f7] p-4 rounded-xl text-sm text-[#1a1c1e] leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                                {generatedMaterial.content}
                            </div>
                        )}

                        {/* 再生成ボタン */}
                        <button
                            onClick={() => {
                                setGeneratedMaterial(null);
                                setMaterialSaved(false);
                            }}
                            className="text-xs text-[#6f5385] hover:text-[#4b454e] transition-colors underline underline-offset-2"
                        >
                            別のパターンで再生成する
                        </button>
                    </div>
                )}
            </div>

            {/* ── ライブ授業開始ボタン ── */}
            <div className="flex justify-end pt-2">
                <button
                    onClick={startLiveMode}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold text-sm rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)]"
                >
                    ライブ授業を開始する
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}
