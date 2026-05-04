'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft, Loader2, Sparkles, CheckCircle2, AlertCircle,
    MessageCircleQuestion, RefreshCw, Mic, MicOff, Radio, Square,
    PenLine, MessageSquare, LayoutGrid, X, BookOpen
} from 'lucide-react';
import { Student } from '@/types/student';
import { type Milestone } from '@/lib/roadmap/types';
import { nationalityToLangName } from '@/lib/nationality';

const RoadmapGenerator = dynamic(() => import('@/components/roadmap/RoadmapGenerator'), {
    loading: () => (
        <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-[#6f5385]" size={28} />
        </div>
    ),
    ssr: false,
});

// ── 型定義 ──
type MaterialContentType = 'fill_in_blank' | 'dialogue' | 'flashcard';
type Flashcard = { front: string; back: string };
type GeneratedMaterial = {
    title: string;
    content: string;
    cards?: Flashcard[];
};

const MATERIAL_TYPES: Record<MaterialContentType, { label: string; icon: React.ReactNode; desc: string; tag: string }> = {
    fill_in_blank: { label: '穴埋め問題', icon: <PenLine size={18} />, desc: '文法・語彙の確認練習問題', tag: '穴埋め' },
    dialogue:      { label: '会話練習',   icon: <MessageSquare size={18} />, desc: '目的に合ったロールプレイスクリプト', tag: '会話練習' },
    flashcard:     { label: 'フラッシュカード', icon: <LayoutGrid size={18} />, desc: '語彙・表現の暗記カードセット', tag: 'フラッシュカード' },
};

type HearingResult = {
    estimated_jlpt_level: 'N5' | 'N4' | 'N3' | 'N2' | 'N1';
    estimated_level_score: number;
    detected_purpose: string;
    purpose_label: string;
    kanji_necessity: 'required' | 'optional' | 'minimal';
    focus_areas: string[];
    skip_recommendations: string[];
    period_months_suggestion: number;
    summary: string;
    confidence: 'high' | 'medium' | 'low';
    clarification_questions: string[];
};

// Web Speech API 型宣言
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
    error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    start(): void;
    stop(): void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
}
declare global {
    interface Window {
        SpeechRecognition?: new () => SpeechRecognitionInstance;
        webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
    }
}

const JLPT_COLOR: Record<string, string> = {
    N5: 'bg-green-100 text-green-700',
    N4: 'bg-lime-100 text-lime-700',
    N3: 'bg-yellow-100 text-yellow-700',
    N2: 'bg-orange-100 text-orange-700',
    N1: 'bg-red-100 text-red-700',
};
const CONFIDENCE_LABEL: Record<string, { label: string; color: string }> = {
    high: { label: '高', color: 'text-green-600 bg-green-50' },
    medium: { label: '中', color: 'text-yellow-600 bg-yellow-50' },
    low: { label: '低', color: 'text-red-600 bg-red-50' },
};

const SAMPLE_MEMO = `例：
- 初めて日本語を勉強して3ヶ月
- 挨拶とひらがなは読める、カタカナ苦手
- 来年の秋に京都に旅行したい
- 漢字は読めないし書けない
- 観光で使える日本語を重視したい`;

export default function InitialHearingPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = typeof params.id === 'string' ? params.id : '';
    const supabase = createClient();

    // フェーズ管理
    const [phase, setPhase] = useState<'input' | 'analyzing' | 'result'>('input');

    // 生徒データ
    const [loading, setLoading] = useState(true);
    const [student, setStudent] = useState<Student | null>(null);

    // 入力
    const [conversationNotes, setConversationNotes] = useState('');
    const [error, setError] = useState<string | null>(null);

    // AI結果
    const [result, setResult] = useState<HearingResult | null>(null);

    // 保存
    const [saving, setSaving] = useState(false);

    // 教材生成モーダル
    const [showMaterialModal, setShowMaterialModal] = useState(false);
    const [selectedMaterialType, setSelectedMaterialType] = useState<MaterialContentType>('fill_in_blank');
    const [generatingMaterial, setGeneratingMaterial] = useState(false);
    const [generatedMaterial, setGeneratedMaterial] = useState<GeneratedMaterial | null>(null);
    const [materialSaved, setMaterialSaved] = useState(false);

    // Chrome判定
    const [isChrome, setIsChrome] = useState(false);

    // 音声入力（Web Speech API）
    const [isListening, setIsListening] = useState(false);
    const [interimText, setInterimText] = useState('');
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const notesRef = useRef('');

    // 録音（MediaRecorder → transcribe API）
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingSeconds, setRecordingSeconds] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        notesRef.current = conversationNotes;
    }, [conversationNotes]);

    useEffect(() => {
        const chrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const mobile = /Mobi|Android/i.test(navigator.userAgent);
        setIsChrome(chrome && !mobile);
    }, []);

    useEffect(() => {
        if (!studentId) return;
        supabase.from('students').select('*').eq('id', studentId).single()
            .then(({ data, error }) => {
                if (!error && data) setStudent(data as Student);
                setLoading(false);
            });
    }, [studentId]); // eslint-disable-line react-hooks/exhaustive-deps

    // アンマウント時クリーンアップ
    useEffect(() => {
        return () => {
            recognitionRef.current?.stop();
            mediaRecorderRef.current?.stop();
            streamRef.current?.getTracks().forEach(t => t.stop());
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // ── Web Speech API ──
    const stopListening = useCallback(() => {
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setIsListening(false);
        setInterimText('');
    }, []);

    const startListening = useCallback(() => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { alert('Chromeを使用してください'); return; }
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'ja-JP';
        rec.onresult = (e: SpeechRecognitionEvent) => {
            let interim = '';
            let final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) final += e.results[i][0].transcript;
                else interim += e.results[i][0].transcript;
            }
            if (final) setConversationNotes(prev => prev + (notesRef.current ? '\n' : '') + final);
            setInterimText(interim);
        };
        rec.onerror = (e: SpeechRecognitionErrorEvent) => { if (e.error !== 'no-speech') stopListening(); };
        rec.onend = () => { if (recognitionRef.current) { try { recognitionRef.current.start(); } catch { /* ignore */ } } };
        recognitionRef.current = rec;
        rec.start();
        setIsListening(true);
        setError(null);
    }, [stopListening]);

    // ── MediaRecorder 録音 ──
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            chunksRef.current = [];

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType });

            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.onstop = async () => {
                streamRef.current?.getTracks().forEach(t => t.stop());
                streamRef.current = null;
                if (timerRef.current) clearInterval(timerRef.current);
                setRecordingSeconds(0);
                setIsRecording(false);

                if (chunksRef.current.length === 0) return;
                setIsTranscribing(true);

                const blob = new Blob(chunksRef.current, { type: mimeType });
                const formData = new FormData();
                formData.append('audio', blob, 'recording.webm');

                try {
                    const res = await fetch('/api/ai/transcribe', { method: 'POST', body: formData });
                    const data = await res.json();
                    const text = (data.original || data.japanese || '').trim();
                    if (text) {
                        setConversationNotes(prev =>
                            prev + (prev ? '\n\n[録音文字起こし]\n' : '[録音文字起こし]\n') + text
                        );
                    }
                } catch (err) {
                    console.error('Transcription error:', err);
                    setError('文字起こしに失敗しました。テキストで入力してください。');
                } finally {
                    setIsTranscribing(false);
                }
            };

            mediaRecorderRef.current = recorder;
            recorder.start();
            setIsRecording(true);
            setRecordingSeconds(0);
            timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
        } catch {
            alert('マイクへのアクセスを許可してください');
        }
    }, []);

    const stopRecording = useCallback(() => {
        mediaRecorderRef.current?.stop();
        mediaRecorderRef.current = null;
    }, []);

    // ── AI 分析 ──
    const handleAnalyze = async () => {
        if (isListening) stopListening();
        if (!conversationNotes.trim()) { setError('会話メモを入力してください'); return; }
        if (conversationNotes.trim().length < 30) { setError('メモが短すぎます。もう少し詳しく入力してください。'); return; }

        setPhase('analyzing');
        setError(null);

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'initial_hearing',
                    conversation_notes: conversationNotes,
                    student_name: student?.name,
                    nationality: student?.nationality,
                    native_language: nationalityToLangName(student?.nationality),
                }),
            });
            if (!res.ok) throw new Error('AI分析に失敗しました');
            const data = await res.json();
            const parsed: HearingResult = data.data || JSON.parse(data.text);
            setResult(parsed);
            setPhase('result');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'AI分析に失敗しました');
            setPhase('input');
        }
    };

    // ── ロードマップ保存 ──
    const handleSaveRoadmap = async (data: {
        currentLevel: number;
        targetLevel: number;
        purposeId: string;
        purposeLabel: string;
        periodMonths: number;
        milestones: Milestone[];
    }) => {
        if (!result || !student) return;
        setSaving(true);

        try {
            const hearingSummary = `【初回ヒアリングAI判定: ${new Date().toLocaleDateString('ja-JP')}】
判定レベル: ${result.estimated_jlpt_level} (スコア: ${result.estimated_level_score})
学習目的: ${result.purpose_label}
推奨期間: ${result.period_months_suggestion}ヶ月

■ 重点項目
${result.focus_areas.map(a => `- ${a}`).join('\n')}

■ AI要約
${result.summary}

■ 会話メモ
${conversationNotes}`.trim();

            const roadmapSummary = `【ロードマップ作成: ${new Date().toLocaleDateString('ja-JP')}】
現在: Lv.${data.currentLevel} → 目標: Lv.${data.targetLevel}
期間: ${data.periodMonths}ヶ月 / 目的: ${data.purposeLabel}`.trim();

            await supabase.from('students').update({
                jlpt_level: result.estimated_jlpt_level,
                goal_text: `${result.purpose_label}（AI判定）`,
                current_phase: `目標Lv.${data.targetLevel} / ${data.periodMonths}ヶ月`,
                memo: (student.memo ? student.memo + '\n\n' : '') + hearingSummary + '\n\n' + roadmapSummary,
            }).eq('id', studentId);

            setShowMaterialModal(true);
        } catch (err) {
            console.error('Save error:', err);
            alert('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    // ── 教材生成 ──
    const handleGenerateMaterial = async () => {
        if (!result || !student) return;
        setGeneratingMaterial(true);
        setGeneratedMaterial(null);
        setMaterialSaved(false);

        const ctx: string[] = [];
        if (student.name) ctx.push(`・氏名：${student.name}`);
        if (student.nationality) ctx.push(`・国籍：${student.nationality}`);
        ctx.push(`・推定JLPTレベル：${result.estimated_jlpt_level}`);
        ctx.push(`・学習目的：${result.purpose_label}`);
        if (result.focus_areas.length > 0) ctx.push(`・重点項目：${result.focus_areas.join('、')}`);
        if (result.skip_recommendations.length > 0) ctx.push(`・スキップ推奨：${result.skip_recommendations.join('、')}`);
        ctx.push(`・AI要約：${result.summary}`);

        const typeInstructions: Record<MaterialContentType, string> = {
            fill_in_blank: `
上記の生徒プロフィールをもとに、**初回レッスンで使う穴埋め練習問題**を作成してください。
- 問題数：5〜8問
- 空欄は「（　）」で表す
- 必ず答えを問題の後にまとめて記載する
- 難易度は生徒のレベルに合わせる
- 重点項目を優先的に反映する

出力フォーマット（Markdownコードブロック不要のJSON）:
{"title": "教材のタイトル", "content": "問題本文（改行含む）", "cards": null}`,
            dialogue: `
上記の生徒プロフィールをもとに、**初回レッスンで使うロールプレイ会話スクリプト**を作成してください。
- 生徒の学習目的に合わせた場面設定
- 先生役（T）と生徒役（S）の形式
- 8〜12ターン程度
- 難しい表現には簡単な補足をカッコ内に添える
- 最後に重要表現リストを付ける

出力フォーマット（Markdownコードブロック不要のJSON）:
{"title": "教材のタイトル", "content": "スクリプト本文（改行含む）", "cards": null}`,
            flashcard: `
上記の生徒プロフィールをもとに、**初回レッスンで覚えるべき語彙・表現のフラッシュカードセット**を作成してください。
- 枚数：10〜15枚
- 表面：日本語（ひらがな/カタカナ/漢字）
- 裏面：意味＋例文（生徒の母語または英語で補足）
- 重点項目から選ぶ

出力フォーマット（Markdownコードブロック不要のJSON）:
{"title": "教材のタイトル", "content": "", "cards": [{"front": "表面テキスト", "back": "裏面テキスト"}]}`,
        };

        const prompt = `あなたは日本語教育の専門家です。以下の生徒情報をもとに最適な教材を生成してください。\n\n## 生徒情報\n${ctx.join('\n')}\n\n## 指示\n${typeInstructions[selectedMaterialType]}`;

        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            if (!res.ok) throw new Error('AI request failed');
            const data = await res.json();
            const clean = data.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const mat: GeneratedMaterial = JSON.parse(clean);
            setGeneratedMaterial(mat);

            // 自動保存（cards が null / 空配列 / front未定義の場合は content を使う）
            const hasValidCards = Array.isArray(mat.cards) && mat.cards.length > 0 && mat.cards[0]?.front !== undefined;
            const contentToSave = hasValidCards
                ? mat.cards!.map((c, i) => `[${i + 1}] 表: ${c.front}\n     裏: ${c.back}`).join('\n')
                : mat.content;
            const { error: insertError } = await supabase.from('materials').insert([{
                title: mat.title,
                content: contentToSave,
                type: 'content',
                is_public: false,
                tags: [MATERIAL_TYPES[selectedMaterialType].tag, student.name],
                student_id: studentId,
            }]);
            if (!insertError) setMaterialSaved(true);
        } catch (err) {
            console.error('Material generation error:', err);
        } finally {
            setGeneratingMaterial(false);
        }
    };

    const handleModalClose = () => {
        router.push(`/students/${studentId}`);
        router.refresh();
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-[#6f5385]" size={32} />
            </div>
        );
    }
    if (!student) return <div>Student not found</div>;

    const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    return (
        <>
        <div className="min-h-screen bg-[#faf9fd]">
            {/* ヘッダー */}
            <div className="bg-white border-b border-[#f4f3f7] sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
                    <Link href={`/students/${studentId}`} className="p-2 text-[#4b454e] hover:text-[#1a1c1e] hover:bg-[#f4f3f7] rounded-full transition-colors">
                        <ArrowLeft size={18} />
                    </Link>
                    <div>
                        <h1 className="font-bold text-[#1a1c1e] flex items-center gap-2 text-sm">
                            <Sparkles size={15} className="text-[#6f5385]" />
                            体験レッスン → ロードマップ作成
                        </h1>
                        <p className="text-xs text-[#4b454e]">{student.name}さん</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">

                {/* ── フェーズ1: 入力 ── */}
                {(phase === 'input') && (
                    <>
                        {/* ステップ説明 */}
                        <div className="bg-gradient-to-r from-[#f2daff] to-white border border-[#c9a8e0]/30 rounded-2xl p-5">
                            <p className="text-sm font-bold text-[#1a1c1e] mb-3">使い方（3ステップ）</p>
                            <div className="flex items-start gap-6 text-xs text-[#4b454e]">
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#6f5385] text-white flex items-center justify-center font-bold flex-shrink-0 text-[10px]">1</span>
                                    体験レッスンのメモを入力<br/>（テキスト・音声・録音）
                                </div>
                                <div className="text-[#c9a8e0]">→</div>
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#6f5385] text-white flex items-center justify-center font-bold flex-shrink-0 text-[10px]">2</span>
                                    AIがレベル・目的を自動判定
                                </div>
                                <div className="text-[#c9a8e0]">→</div>
                                <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-[#6f5385] text-white flex items-center justify-center font-bold flex-shrink-0 text-[10px]">3</span>
                                    スライダー確認→ロードマップ生成
                                </div>
                            </div>
                        </div>

                        {/* 入力エリア */}
                        <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-bold text-[#1a1c1e]">体験レッスンのメモ</label>
                                <div className="flex items-center gap-2">
                                    {/* 録音ボタン（Chrome限定） */}
                                    {isChrome && (
                                        <button
                                            onClick={isRecording ? stopRecording : startRecording}
                                            disabled={isListening || isTranscribing}
                                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                                isRecording
                                                    ? 'bg-red-500 text-white animate-pulse'
                                                    : 'bg-[#f4f3f7] text-[#4b454e] hover:bg-[#f2daff] hover:text-[#6f5385]'
                                            }`}
                                            title="体験レッスンの会話を録音→自動文字起こし"
                                        >
                                            {isRecording ? (
                                                <><Square size={12} className="fill-white" /> 停止 {formatTime(recordingSeconds)}</>
                                            ) : (
                                                <><Radio size={12} /> 会話を録音</>
                                            )}
                                        </button>
                                    )}
                                    {/* 音声入力ボタン */}
                                    <button
                                        onClick={isListening ? stopListening : startListening}
                                        disabled={isRecording || isTranscribing}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                                            isListening
                                                ? 'bg-[#6f5385] text-white animate-pulse'
                                                : 'bg-[#f4f3f7] text-[#4b454e] hover:bg-[#f2daff] hover:text-[#6f5385]'
                                        }`}
                                        title="話した内容をリアルタイムでテキスト化"
                                    >
                                        {isListening ? <><MicOff size={12} /> 停止</> : <><Mic size={12} /> 音声入力</>}
                                    </button>
                                </div>
                            </div>

                            {/* ステータスバナー */}
                            {isTranscribing && (
                                <div className="flex items-center gap-2 px-3 py-2 bg-[#f2daff] rounded-xl text-xs text-[#6f5385] font-bold">
                                    <Loader2 size={12} className="animate-spin" />
                                    録音を文字起こし中…
                                </div>
                            )}
                            {isListening && interimText && (
                                <div className="px-3 py-2 bg-[#faf9fd] border border-[#c9a8e0]/30 rounded-xl text-sm text-[#4b454e] italic">
                                    {interimText}▋
                                </div>
                            )}

                            <textarea
                                value={conversationNotes}
                                onChange={(e) => setConversationNotes(e.target.value)}
                                placeholder={SAMPLE_MEMO}
                                rows={10}
                                className="w-full px-4 py-3 border border-[#cdc3ce] rounded-xl text-sm text-[#1a1c1e] focus:outline-none focus:ring-2 focus:ring-[#6f5385] focus:border-transparent resize-y"
                                disabled={isTranscribing}
                            />

                            <div className="flex items-center justify-between">
                                <span className="text-xs text-[#4b454e]/60">
                                    {conversationNotes.length}文字
                                    {isListening && <span className="ml-2 text-[#6f5385] font-bold">● 音声入力中</span>}
                                    {isRecording && <span className="ml-2 text-red-500 font-bold">● 録音中 {formatTime(recordingSeconds)}</span>}
                                </span>
                                <button
                                    onClick={handleAnalyze}
                                    disabled={!conversationNotes.trim() || isTranscribing}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#6f5385] to-[#c9a8e0] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity shadow-[0_4px_15px_rgba(111,83,133,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Sparkles size={15} />
                                    AIで判定する
                                </button>
                            </div>

                            {error && (
                                <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                                    {error}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ── フェーズ2: 分析中 ── */}
                {phase === 'analyzing' && (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] flex items-center justify-center animate-pulse">
                            <Sparkles size={28} className="text-white" />
                        </div>
                        <p className="text-sm font-bold text-[#1a1c1e]">AIが分析中…</p>
                        <p className="text-xs text-[#4b454e]">レベル・目的・ロードマップを推定しています</p>
                    </div>
                )}

                {/* ── フェーズ3: 結果 + ロードマップ ── */}
                {phase === 'result' && result && (
                    <>
                        {/* AI判定結果（コンパクト） */}
                        <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] border border-[#c9a8e0]/40 overflow-hidden">
                            <div className="bg-gradient-to-r from-[#6f5385] to-[#c9a8e0] px-5 py-3 flex items-center justify-between">
                                <h2 className="font-bold text-white text-sm flex items-center gap-2">
                                    <CheckCircle2 size={16} />
                                    AI判定結果
                                </h2>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-white/80">確信度：</span>
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CONFIDENCE_LABEL[result.confidence].color}`}>
                                        {CONFIDENCE_LABEL[result.confidence].label}
                                    </span>
                                    <button
                                        onClick={() => { setPhase('input'); setResult(null); }}
                                        className="text-xs text-white/70 hover:text-white flex items-center gap-1 ml-2"
                                    >
                                        <RefreshCw size={12} /> やり直す
                                    </button>
                                </div>
                            </div>

                            <div className="p-5 space-y-4">
                                {/* 要約 */}
                                <p className="text-sm text-[#1a1c1e] leading-relaxed bg-[#faf9fd] rounded-xl p-3">{result.summary}</p>

                                {/* キー指標 */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: '推定レベル', value: <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${JLPT_COLOR[result.estimated_jlpt_level]}`}>{result.estimated_jlpt_level}</span> },
                                        { label: '学習目的', value: result.purpose_label },
                                        { label: '漢字', value: { required: '必須', optional: '任意', minimal: '最小限' }[result.kanji_necessity] },
                                        { label: '推奨期間', value: `${result.period_months_suggestion}ヶ月` },
                                    ].map((item, i) => (
                                        <div key={i} className="border border-[#f4f3f7] rounded-xl p-3 text-center">
                                            <p className="text-[10px] text-[#4b454e] mb-1">{item.label}</p>
                                            <div className="text-sm font-bold text-[#1a1c1e]">{item.value}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* 重点項目 */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-[#1a1c1e] mb-2 flex items-center gap-1">
                                            <CheckCircle2 size={12} className="text-green-600" /> 重点項目
                                        </p>
                                        <ul className="space-y-1">
                                            {result.focus_areas.slice(0, 4).map((a, i) => (
                                                <li key={i} className="text-xs text-[#4b454e] flex items-start gap-1.5">
                                                    <span className="text-green-600 mt-0.5">✓</span>{a}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    {result.clarification_questions.length > 0 && (
                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                                            <p className="text-xs font-bold text-amber-900 mb-2 flex items-center gap-1">
                                                <MessageCircleQuestion size={12} /> 次回確認したい質問
                                            </p>
                                            <ul className="space-y-1">
                                                {result.clarification_questions.slice(0, 3).map((q, i) => (
                                                    <li key={i} className="text-xs text-amber-800 flex items-start gap-1">
                                                        <span className="text-amber-600">？</span>{q}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ロードマップ（AI自動セット、調整可） */}
                        <div className="bg-[#f2daff]/30 border border-[#c9a8e0]/30 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles size={15} className="text-[#6f5385]" />
                                <p className="text-sm font-bold text-[#6f5385]">
                                    AIが推定値をセットしました（スライダーで調整可）
                                </p>
                            </div>
                            <RoadmapGenerator
                                studentName={student.name}
                                initialLevel={result.estimated_level_score}
                                initialTarget={Math.min(result.estimated_level_score + 35, 100)}
                                initialPurpose={result.detected_purpose}
                                initialPeriodMonths={result.period_months_suggestion}
                                onSave={handleSaveRoadmap}
                            />
                            {saving && (
                                <div className="flex items-center justify-center gap-2 py-4 text-[#6f5385]">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span className="text-sm">保存中...</span>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>

        {/* ── 教材生成モーダル ── */}
        {showMaterialModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                    {/* ヘッダー */}
                    <div className="bg-gradient-to-r from-[#6f5385] to-[#c9a8e0] px-6 py-4 flex items-center justify-between">
                        <div>
                            <p className="font-bold text-white flex items-center gap-2">
                                <BookOpen size={16} />
                                ロードマップ保存完了！
                            </p>
                            <p className="text-xs text-white/80 mt-0.5">初回教材を今すぐ生成しますか？</p>
                        </div>
                        <button
                            onClick={handleModalClose}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-5">
                        {!generatedMaterial ? (
                            <>
                                {/* 教材タイプ選択 */}
                                <div className="space-y-2">
                                    {(Object.entries(MATERIAL_TYPES) as [MaterialContentType, typeof MATERIAL_TYPES[MaterialContentType]][]).map(([type, info]) => (
                                        <button
                                            key={type}
                                            onClick={() => setSelectedMaterialType(type)}
                                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                                                selectedMaterialType === type
                                                    ? 'border-[#6f5385] bg-[#f2daff]/50'
                                                    : 'border-[#f4f3f7] hover:border-[#c9a8e0]'
                                            }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                selectedMaterialType === type ? 'bg-[#6f5385] text-white' : 'bg-[#f4f3f7] text-[#4b454e]'
                                            }`}>
                                                {info.icon}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[#1a1c1e]">{info.label}</p>
                                                <p className="text-xs text-[#4b454e]">{info.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* ボタン */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleModalClose}
                                        className="flex-1 py-3 rounded-xl border border-[#cdc3ce] text-sm font-bold text-[#4b454e] hover:bg-[#f4f3f7] transition-colors"
                                    >
                                        あとで
                                    </button>
                                    <button
                                        onClick={handleGenerateMaterial}
                                        disabled={generatingMaterial}
                                        className="flex-2 min-w-0 flex-1 py-3 rounded-xl bg-gradient-to-r from-[#6f5385] to-[#c9a8e0] text-white text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                                    >
                                        {generatingMaterial ? (
                                            <><Loader2 size={15} className="animate-spin" />生成中…</>
                                        ) : (
                                            <><Sparkles size={15} />{MATERIAL_TYPES[selectedMaterialType].label}を生成</>
                                        )}
                                    </button>
                                </div>
                            </>
                        ) : (
                            /* 生成結果 */
                            <div className="space-y-4">
                                <div className="bg-[#faf9fd] rounded-xl p-4 border border-[#f4f3f7]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle2 size={15} className="text-green-600" />
                                        <p className="text-sm font-bold text-[#1a1c1e]">{generatedMaterial.title}</p>
                                    </div>
                                    {Array.isArray(generatedMaterial.cards) && generatedMaterial.cards.length > 0 && generatedMaterial.cards[0]?.front !== undefined ? (
                                        <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                            {generatedMaterial.cards.slice(0, 5).map((card, i) => (
                                                <div key={i} className="text-xs bg-white border border-[#f4f3f7] rounded-lg p-2.5">
                                                    <span className="font-bold text-[#6f5385]">{card.front}</span>
                                                    <span className="text-[#4b454e] ml-2">→ {card.back}</span>
                                                </div>
                                            ))}
                                            {generatedMaterial.cards.length > 5 && (
                                                <p className="text-xs text-[#4b454e]/60 text-center">他 {generatedMaterial.cards.length - 5} 枚</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-[#4b454e] whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                                            {generatedMaterial.content.slice(0, 300)}{generatedMaterial.content.length > 300 ? '…' : ''}
                                        </p>
                                    )}
                                </div>
                                {materialSaved && (
                                    <p className="text-xs text-center text-green-600 flex items-center justify-center gap-1">
                                        <CheckCircle2 size={12} /> 教材ライブラリに保存しました
                                    </p>
                                )}
                                <button
                                    onClick={handleModalClose}
                                    className="w-full py-3 rounded-xl bg-gradient-to-r from-[#6f5385] to-[#c9a8e0] text-white text-sm font-bold hover:opacity-90 transition-opacity"
                                >
                                    生徒ページへ
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
