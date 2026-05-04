'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    ArrowLeft, Send, MessageCircle, BookOpen, CheckCircle,
    Save, Sparkles, X, Mic, MicOff, Loader2, Zap
} from 'lucide-react';
import Link from 'next/link';

// ────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────
type KeyPoint = { question: string; answer: string };
type PrepContent = { review_quiz: KeyPoint[]; intro_topic: string; advice: string };
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type AutoSuggestion = { id: number; text: string; timestamp: Date };

// Web Speech API の型宣言
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

// ────────────────────────────────────────────
// 定数
// ────────────────────────────────────────────
const CHAR_TRIGGER = 100;   // 100文字ごとに自動分析
const EXCHANGE_TRIGGER = 3; // 3発言ごとに自動分析

// ────────────────────────────────────────────
// コンポーネント
// ────────────────────────────────────────────
export default function LiveLessonPage() {
    const router = useRouter();
    const params = useParams();
    const studentId = typeof params.id === 'string' ? params.id : '';
    const searchParams = useSearchParams();
    const scheduledLessonId = searchParams.get('scheduledLessonId');

    // ── 既存state ──
    const [prepContent, setPrepContent] = useState<PrepContent | null>(null);
    const [activeTab, setActiveTab] = useState<'prep' | 'course' | 'translation' | 'chat'>('prep');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // ── Phase 1B：生徒コンテキスト ──
    const [studentContext, setStudentContext] = useState<string>('');

    // ── 音声認識 state ──
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimText, setInterimText] = useState('');
    const [courseSuggestions, setCourseSuggestions] = useState<AutoSuggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [streamingText, setStreamingText] = useState('');

    // ── 翻訳モード state ──
    type LiveTranslation = { id: number; original: string; japanese: string; timestamp: Date };
    const [isTranslationMode, setIsTranslationMode] = useState(false);
    const [liveTranslations, setLiveTranslations] = useState<LiveTranslation[]>([]);
    const [isChromeDesktop, setIsChromeDesktop] = useState(false);
    const displayStreamRef = useRef<MediaStream | null>(null);
    const translationRecorderRef = useRef<MediaRecorder | null>(null);
    const translationCounterRef = useRef(0);

    // ── トリガーカウンタ ──
    const charsSinceLastTrigger = useRef(0);
    const exchangesSinceLastTrigger = useRef(0);
    const suggestionCounter = useRef(0);
    const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
    const transcriptRef = useRef('');
    const hasAutoStarted = useRef(false);

    // ────────────────────────────────────────────
    // 初期化
    // ────────────────────────────────────────────
    useEffect(() => {
        const saved = localStorage.getItem(`prep_content_${studentId}`);
        if (saved) {
            try { setPrepContent(JSON.parse(saved)); } catch { /* ignore */ }
        }
    }, [studentId]);

    // Chrome Desktop 判定
    useEffect(() => {
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const isMobile = /Mobi|Android/i.test(navigator.userAgent);
        setIsChromeDesktop(isChrome && !isMobile);
    }, []);

    // ── Phase 1B：生徒コンテキスト取得 ──
    useEffect(() => {
        if (!studentId) return;
        const supabase = createClient();

        const fetchContext = async () => {
            try {
                // 生徒情報
                const { data: student } = await supabase
                    .from('students')
                    .select('name, jlpt_level, goal_text, textbook, current_phase, memo')
                    .eq('id', studentId)
                    .single();

                // 直近3回のレッスン記録
                const { data: lessons } = await supabase
                    .from('lessons')
                    .select('date, topics, mistakes, homework, status')
                    .eq('student_id', studentId)
                    .order('date', { ascending: false })
                    .limit(3);

                if (!student) return;

                const lines: string[] = [
                    `生徒ゴール: ${student.goal_text || '未設定'}`,
                    `現在レベル: ${student.jlpt_level || '未設定'}`,
                    `使用教材: ${student.textbook || '未設定'}`,
                    `現在の進度: ${student.current_phase || '未設定'}`,
                ];

                if (lessons && lessons.length > 0) {
                    lines.push('\n直近のレッスン記録:');
                    lessons.forEach((l, i) => {
                        const dateStr = l.date ? new Date(l.date).toLocaleDateString('ja-JP') : '日付不明';
                        lines.push(`[${i + 1}回前 ${dateStr}]`);
                        if (l.topics) lines.push(`  トピック: ${l.topics}`);
                        if (l.mistakes) lines.push(`  ミス・弱点: ${l.mistakes}`);
                        if (l.homework) lines.push(`  宿題: ${l.homework}`);
                    });
                }

                if (student.memo) {
                    lines.push(`\n教師メモ（初回ヒアリング等）:\n${student.memo.slice(0, 300)}`);
                }

                // Phase 3：knowledge_base から成功パターンを注入（信頼度60%以上・5件以上）
                const goalText = (student.goal_text ?? '').toLowerCase();
                let goalType = 'other';
                if (goalText.includes('旅行') || goalText.includes('travel')) goalType = 'travel';
                else if (goalText.includes('jlpt') || goalText.includes('試験')) goalType = 'jlpt';
                else if (goalText.includes('ビジネス') || goalText.includes('仕事')) goalType = 'business';
                else if (goalText.includes('アニメ')) goalType = 'anime';
                else if (goalText.includes('友達')) goalType = 'friends';
                else if (goalText.includes('日常')) goalType = 'daily';

                const jlptMap: Record<string, number> = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
                const jlptLevel = jlptMap[student.jlpt_level ?? ''] ?? 1;

                const { data: knowledgeData } = await supabase
                    .from('knowledge_base')
                    .select('unit_action, unit_id, unit_label, success_count, fail_count, confidence')
                    .eq('goal_type', goalType)
                    .eq('jlpt_level', jlptLevel)
                    .gte('confidence', 0.6)
                    .order('confidence', { ascending: false })
                    .limit(6);

                if (knowledgeData && knowledgeData.length > 0) {
                    const validPatterns = knowledgeData.filter(
                        k => (k.success_count + k.fail_count) >= 5
                    );
                    if (validPatterns.length > 0) {
                        lines.push('\n【過去の成功パターン（knowledge_base）】');
                        const actionLabel: Record<string, string> = { skip: 'スキップ推奨', focus: '重点推奨', return: '戻る推奨' };
                        validPatterns.forEach(k => {
                            const pct = Math.round(k.confidence * 100);
                            const total = k.success_count + k.fail_count;
                            lines.push(`- ${k.unit_label || k.unit_id}：${actionLabel[k.unit_action] || k.unit_action}（信頼度${pct}%・${total}件）`);
                        });
                    }
                }

                setStudentContext(lines.join('\n'));
            } catch (err) {
                console.error('Failed to fetch student context:', err);
            }
        };

        fetchContext();
    }, [studentId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    // ────────────────────────────────────────────
    // 案Y：自動分析トリガー
    // ────────────────────────────────────────────
    const triggerAnalysis = useCallback(async (currentTranscript: string) => {
        if (isAnalyzing || currentTranscript.trim().length < 10) return;

        setIsAnalyzing(true);
        setStreamingText('');
        // モバイル：分析開始時に進め方タブへ自動切替（streaming表示のため）
        setActiveTab(prev => prev === 'prep' ? 'course' : prev);

        let accumulated = '';

        try {
            const res = await fetch('/api/ai/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'live_assistant',
                    transcript: currentTranscript.slice(-600), // 直近600文字のみ送信
                    studentContext: studentContext || '',
                }),
            });

            if (!res.ok || !res.body) throw new Error('Stream failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const data = line.slice(6);
                    if (data === '[DONE]') break;

                    try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) {
                            accumulated += parsed.text;
                            setStreamingText(accumulated);
                        }
                    } catch { /* ignore parse errors */ }
                }
            }

            // ストリーミング完了 → [COURSE]/[TRANSLATION] でパースしてタブ別に振り分け
            if (accumulated.trim()) {
                suggestionCounter.current += 1;
                const now = new Date();
                const id = suggestionCounter.current;

                const courseMatch = accumulated.match(/\[COURSE\]([\s\S]*?)\[\/COURSE\]/);
                const translationMatch = accumulated.match(/\[TRANSLATION\]([\s\S]*?)\[\/TRANSLATION\]/);

                const courseText = courseMatch?.[1]?.trim() ?? '';
                const translationText = translationMatch?.[1]?.trim() ?? '';

                if (courseText && !courseText.includes('現在のペースで進めてOK')) {
                    setCourseSuggestions(prev => [
                        { id, text: courseText, timestamp: now },
                        ...prev.slice(0, 4),
                    ]);
                    setActiveTab('course');
                }
                void translationText; // 翻訳タブはgetDisplayMediaで処理するため不使用
            }
        } catch (err) {
            console.error('Auto analysis error:', err);
        } finally {
            setIsAnalyzing(false);
            setStreamingText('');
            charsSinceLastTrigger.current = 0;
            exchangesSinceLastTrigger.current = 0;
        }
    }, [isAnalyzing, studentContext]);

    // ────────────────────────────────────────────
    // 案Y：音声認識 開始 / 停止
    // ────────────────────────────────────────────
    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('このブラウザは音声認識に対応していません。Chrome を使用してください。');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'ja-JP';

        recognition.onresult = (e: SpeechRecognitionEvent) => {
            let interim = '';
            let newFinal = '';

            for (let i = e.resultIndex; i < e.results.length; i++) {
                const result = e.results[i];
                if (result.isFinal) {
                    newFinal += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            setInterimText(interim);

            if (newFinal) {
                const updated = transcriptRef.current + newFinal;
                transcriptRef.current = updated;
                setTranscript(updated);

                // トリガーカウント更新
                charsSinceLastTrigger.current += newFinal.length;
                exchangesSinceLastTrigger.current += 1;

                // トリガー判定
                if (
                    charsSinceLastTrigger.current >= CHAR_TRIGGER ||
                    exchangesSinceLastTrigger.current >= EXCHANGE_TRIGGER
                ) {
                    triggerAnalysis(updated);
                }
            }
        };

        recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
            if (e.error !== 'no-speech') {
                console.error('SpeechRecognition error:', e.error);
            }
        };

        recognition.onend = () => {
            // continuous=trueでも途切れることがある → 自動再起動
            if (recognitionRef.current) {
                try { recognition.start(); } catch { /* already started */ }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [triggerAnalysis]);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.onend = null; // 自動再起動を止める
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
        setInterimText('');
    }, []);

    // 自動起動: studentContext取得後に1回だけ音声認識を開始
    useEffect(() => {
        if (studentContext && !hasAutoStarted.current) {
            hasAutoStarted.current = true;
            startListening();
        }
    }, [studentContext, startListening]);

    // ────────────────────────────────────────────
    // 既存：手動チャット
    // ────────────────────────────────────────────
    const handleSendMessage = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const supabase = createClient();
        const userContent = input;
        const userMsg: ChatMessage = { role: 'user', content: userContent };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);
        setActiveTab('chat');

        try {
            await supabase.from('lesson_chat_logs').insert({
                student_id: studentId,
                lesson_id: scheduledLessonId || null,
                role: 'user',
                content: userContent
            });

            const prompt = `あなたはレッスン中の日本語教師をサポートするAIアシスタント（カンペ）です。
先生からの質問（文法の違い、例文の要求など）に対して、**簡潔に**、**わかりやすく**、**生徒にそのまま説明できるような**回答を提示してください。
長々とした解説は不要です。即座に使えるフレーズや例文を優先してください。

先生の質問: ${userContent}`;

            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            if (!res.ok) throw new Error('AI request failed');

            const data = await res.json();
            const aiContent = data.text;
            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);

            await supabase.from('lesson_chat_logs').insert({
                student_id: studentId,
                lesson_id: scheduledLessonId || null,
                role: 'assistant',
                content: aiContent
            });
        } catch (err) {
            console.error('Chat Error:', err);
            setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
        } finally {
            setIsTyping(false);
        }
    };

    // ── 翻訳モード 開始 / 停止 ──
    const startTranslationMode = useCallback(async () => {
        if (!isChromeDesktop) return;
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true } as DisplayMediaStreamOptions);
            // videoトラックは音声取得のために必要だが映像は不要なので即停止
            stream.getVideoTracks().forEach(t => t.stop());
            displayStreamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';
            const recorder = new MediaRecorder(stream, { mimeType });
            translationRecorderRef.current = recorder;

            recorder.ondataavailable = async (e) => {
                if (e.data.size < 500) return;
                const formData = new FormData();
                formData.append('audio', e.data, 'chunk.webm');
                try {
                    const res = await fetch('/api/ai/transcribe', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (data.japanese?.trim()) {
                        translationCounterRef.current += 1;
                        setLiveTranslations(prev => [{
                            id: translationCounterRef.current,
                            original: data.original || '',
                            japanese: data.japanese,
                            timestamp: new Date(),
                        }, ...prev.slice(0, 9)]);
                        setActiveTab('translation');
                    }
                } catch (err) { console.error('Translation chunk error:', err); }
            };

            recorder.start(7000); // 7秒チャンク
            setIsTranslationMode(true);
            setActiveTab('translation');

            stream.getAudioTracks()[0].onended = () => stopTranslationMode();
        } catch (err) {
            console.error('getDisplayMedia error:', err);
        }
    }, [isChromeDesktop]); // eslint-disable-line react-hooks/exhaustive-deps

    const stopTranslationMode = useCallback(() => {
        translationRecorderRef.current?.stop();
        translationRecorderRef.current = null;
        displayStreamRef.current?.getTracks().forEach(t => t.stop());
        displayStreamRef.current = null;
        setIsTranslationMode(false);
    }, []);

    // アンマウント時にクリーンアップ（stopTranslationMode宣言の後に配置）
    useEffect(() => {
        return () => { stopListening(); stopTranslationMode(); };
    }, [stopListening, stopTranslationMode]);

    const finishLesson = () => {
        stopListening();
        stopTranslationMode();
        if (transcriptRef.current.trim()) {
            localStorage.setItem(`live_session_${studentId}`, JSON.stringify({
                transcript: transcriptRef.current,
                courseSuggestions: courseSuggestions.slice(0, 3),
            }));
        }
        const query = scheduledLessonId ? `?scheduledLessonId=${scheduledLessonId}` : '';
        router.push(`/students/${studentId}/lessons/new${query}`);
    };

    // ────────────────────────────────────────────
    // UI
    // ────────────────────────────────────────────
    return (
        <div className="flex flex-col h-[calc(100vh-theme(spacing.4))] max-w-5xl mx-auto bg-white rounded-2xl shadow-[0_8px_48px_rgba(111,83,133,0.15)] overflow-hidden border border-[#c9a8e0]/20">

            {/* ヘッダー */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#6f5385] to-[#9b77b5] text-white shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-1.5 hover:bg-white/20 rounded-full transition-colors">
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className="font-bold text-base flex items-center gap-2">
                        LIVE カンペモード
                        <span className="text-[10px] bg-red-500 px-2 py-0.5 rounded-full animate-pulse font-bold">ON AIR</span>
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={isListening ? stopListening : startListening}
                        title={isListening ? '録音を一時停止' : '録音を再開'}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all ${isListening
                            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                            : 'bg-white/30 hover:bg-white/40 text-white border border-white/40'
                            }`}
                    >
                        {isListening ? <MicOff size={14} /> : <Mic size={14} />}
                        {isListening ? '録音中' : '録音再開'}
                    </button>

                    {isChromeDesktop && (
                        <button
                            onClick={isTranslationMode ? stopTranslationMode : startTranslationMode}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all ${isTranslationMode
                                ? 'bg-[#c9a8e0] text-white animate-pulse'
                                : 'bg-white/20 hover:bg-white/30 text-white'
                                }`}
                        >
                            <Zap size={14} />
                            {isTranslationMode ? '翻訳中' : '翻訳ON'}
                        </button>
                    )}

                    <button
                        onClick={finishLesson}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-[#6f5385] font-bold rounded-full hover:bg-[#f2daff] transition-colors text-xs shadow-sm"
                    >
                        <Save size={14} />
                        終了・記録
                    </button>
                </div>
            </div>

            {/* コンテンツエリア */}
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                {/* タブ（モバイル） */}
                <div className="md:hidden flex border-b border-[#f4f3f7]">
                    {(['prep', 'course', 'translation', 'chat'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-2.5 text-[10px] font-bold relative ${activeTab === tab ? 'text-[#6f5385] border-b-2 border-[#6f5385]' : 'text-[#4b454e]'}`}
                        >
                            {tab === 'prep' && '準備'}
                            {tab === 'course' && (
                                <span className="flex items-center justify-center gap-0.5">
                                    🎯進め方
                                    {courseSuggestions.length > 0 && (
                                        <span className="bg-[#6f5385] text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center ml-0.5">
                                            {courseSuggestions.length}
                                        </span>
                                    )}
                                </span>
                            )}
                            {tab === 'translation' && (
                                <span className="flex items-center justify-center gap-0.5">
                                    🌐翻訳
                                    {liveTranslations.length > 0 && (
                                        <span className="bg-[#655a6f] text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center ml-0.5">
                                            {liveTranslations.length}
                                        </span>
                                    )}
                                </span>
                            )}
                            {tab === 'chat' && 'チャット'}
                        </button>
                    ))}
                </div>

                {/* 左パネル：準備メモ */}
                <div className={`w-full md:w-1/3 overflow-y-auto p-4 bg-[#faf9fd] border-r border-[#f4f3f7] ${activeTab !== 'prep' ? 'hidden md:block' : ''}`}>
                    {prepContent ? (
                        <div className="space-y-3">
                            <div className="bg-white p-4 rounded-2xl shadow-[0_0_20px_rgba(111,83,133,0.06)]">
                                <h2 className="font-bold text-[#1a1c1e] mb-3 flex items-center gap-2 text-sm">
                                    <CheckCircle size={15} className="text-[#6f5385]" />
                                    復習クイズ
                                </h2>
                                <ul className="space-y-2">
                                    {prepContent.review_quiz.map((q, i) => (
                                        <li key={i} className="text-xs">
                                            <p className="font-bold text-[#1a1c1e] mb-0.5">Q. {q.question}</p>
                                            <p className="text-[#4b454e] pl-3 border-l-2 border-[#c9a8e0]">A. {q.answer}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="bg-white p-4 rounded-2xl shadow-[0_0_20px_rgba(111,83,133,0.06)]">
                                <h2 className="font-bold text-[#1a1c1e] mb-2 flex items-center gap-2 text-sm">
                                    <MessageCircle size={15} className="text-[#655a6f]" />
                                    導入トーク
                                </h2>
                                <p className="text-xs text-[#4b454e] whitespace-pre-wrap leading-relaxed">{prepContent.intro_topic}</p>
                            </div>
                            <div className="bg-[#f2daff] p-3 rounded-2xl">
                                <h2 className="font-bold text-[#6f5385] mb-1 text-xs uppercase tracking-wide">Advice</h2>
                                <p className="text-xs text-[#4b454e] italic">{prepContent.advice}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-[#4b454e]">
                            <BookOpen size={36} className="mb-3 opacity-30" />
                            <p className="text-sm">準備データがありません</p>
                            <Link href={`/students/${studentId}/lessons/prepare`} className="text-[#6f5385] underline mt-2 text-xs">
                                準備ページへ
                            </Link>
                        </div>
                    )}
                </div>

                {/* 右エリア：AIサジェスト + チャット */}
                <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'prep' ? 'hidden md:flex' : 'flex'}`}>

                    {/* デスクトップ用サブタブバー */}
                    <div className="hidden md:flex items-center border-b border-[#f4f3f7] bg-white shrink-0">
                        <button
                            onClick={() => setActiveTab('course')}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                                activeTab === 'course' || activeTab === 'prep'
                                    ? 'text-[#6f5385] border-[#6f5385]'
                                    : 'text-[#4b454e] border-transparent hover:text-[#1a1c1e]'
                            }`}
                        >
                            🎯 進め方
                            {courseSuggestions.length > 0 && (
                                <span className="bg-[#6f5385] text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                                    {courseSuggestions.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('translation')}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                                activeTab === 'translation'
                                    ? 'text-[#655a6f] border-[#655a6f]'
                                    : 'text-[#4b454e] border-transparent hover:text-[#1a1c1e]'
                            }`}
                        >
                            🌐 翻訳
                            {liveTranslations.length > 0 && (
                                <span className="bg-[#655a6f] text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">
                                    {liveTranslations.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('chat')}
                            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${
                                activeTab === 'chat'
                                    ? 'text-[#6f5385] border-[#6f5385]'
                                    : 'text-[#4b454e] border-transparent hover:text-[#1a1c1e]'
                            }`}
                        >
                            💬 チャット
                        </button>
                        <div className="ml-auto flex items-center gap-2 px-3 text-xs">
                            {isListening && (
                                <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">
                                    <Mic size={10} /> 自動録音中
                                </span>
                            )}
                            {!isListening && hasAutoStarted.current && (
                                <span className="text-[10px] bg-[#f4f3f7] text-[#4b454e] px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <MicOff size={10} /> 録音停止中
                                </span>
                            )}
                            {isAnalyzing && (
                                <span className="flex items-center gap-1 text-[#6f5385]">
                                    <Loader2 size={12} className="animate-spin" />
                                    分析中…
                                </span>
                            )}
                        </div>
                    </div>

                    {/* 🎯 課の進め方パネル */}
                    <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'course' || activeTab === 'prep' ? 'flex' : 'hidden'}`}>
                        {isListening && (
                            <div className="px-4 pt-2 pb-1 bg-[#faf9fd] border-b border-[#f4f3f7] shrink-0">
                                <p className="text-[11px] text-[#4b454e] leading-relaxed line-clamp-2">
                                    {interimText
                                        ? <span className="italic">{interimText}</span>
                                        : <span className="text-[#4b454e]/40">話しているとAIが認識します…</span>
                                    }
                                </p>
                            </div>
                        )}
                        {(isAnalyzing || streamingText) && (
                            <div className="mx-4 mt-3 p-3 bg-[#f2daff] border border-[#c9a8e0]/40 rounded-2xl shrink-0">
                                <p className="text-xs font-bold text-[#6f5385] mb-1 flex items-center gap-1">
                                    <Sparkles size={12} /> AIが分析しています…
                                </p>
                                <p className="text-sm text-[#1a1c1e] whitespace-pre-wrap leading-relaxed">
                                    {streamingText}
                                    {isAnalyzing && <span className="animate-pulse">▋</span>}
                                </p>
                            </div>
                        )}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {courseSuggestions.length === 0 && !isListening && (
                                <div className="h-full flex flex-col items-center justify-center text-[#4b454e] py-12">
                                    <Mic size={36} className="mb-3 opacity-20" />
                                    <p className="text-sm font-medium">生徒情報を読み込み中…</p>
                                    <p className="text-xs mt-1 text-[#4b454e]/60">準備完了後、自動で録音を開始します</p>
                                </div>
                            )}
                            {courseSuggestions.length === 0 && isListening && !isAnalyzing && (
                                <div className="h-full flex flex-col items-center justify-center py-12">
                                    <Mic size={36} className="mb-3 text-[#6f5385] animate-pulse" />
                                    <p className="text-sm font-medium text-[#1a1c1e]">自動録音中…</p>
                                    <p className="text-xs mt-1 text-[#4b454e]">{CHAR_TRIGGER}文字 または {EXCHANGE_TRIGGER}発言でAIが自動分析します</p>
                                </div>
                            )}
                            {courseSuggestions.map((s) => (
                                <div key={s.id} className="bg-white border border-[#c9a8e0]/30 rounded-2xl p-3 shadow-[0_0_20px_rgba(111,83,133,0.06)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-[#6f5385] uppercase tracking-wide">🎯 進め方 #{s.id}</span>
                                        <span className="text-[10px] text-[#4b454e]">{s.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm text-[#1a1c1e] whitespace-pre-wrap leading-relaxed">{s.text}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 🌐 翻訳パネル */}
                    <div className={`flex-1 flex flex-col overflow-hidden ${activeTab === 'translation' ? 'flex' : 'hidden'}`}>
                        {/* Chrome限定バナー（常時表示） */}
                        <div className={`px-4 py-2 shrink-0 border-b border-[#f4f3f7] flex items-center gap-2 text-xs font-medium ${isChromeDesktop ? 'bg-[#f2daff] text-[#6f5385]' : 'bg-[#fff0f0] text-[#ba1a1a]'}`}>
                            {isChromeDesktop
                                ? '✓ Chrome Desktop — 翻訳機能が使用可能です'
                                : '⚠️ この機能はChrome Desktop専用です。Safari・iOS・Androidには非対応。'}
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {/* 未起動 */}
                            {!isTranslationMode && liveTranslations.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center py-12 gap-3">
                                    {isChromeDesktop ? (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-[#f2daff] flex items-center justify-center">
                                                <Zap size={22} className="text-[#6f5385]" />
                                            </div>
                                            <p className="text-sm font-bold text-[#1a1c1e]">翻訳モードを起動してください</p>
                                            <p className="text-xs text-[#4b454e] text-center leading-relaxed">
                                                ヘッダーの「翻訳ON」を押して<br/>Preplyのタブを選択してください
                                            </p>
                                            <p className="text-[10px] text-[#4b454e]/60">生徒の音声を日本語にリアルタイム翻訳します（約7秒ごと）</p>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-12 h-12 rounded-full bg-[#fff0f0] flex items-center justify-center">
                                                <Zap size={22} className="text-[#ba1a1a]" />
                                            </div>
                                            <p className="text-sm font-bold text-[#ba1a1a]">Chrome Desktopが必要です</p>
                                            <p className="text-xs text-[#4b454e] text-center">Safari・iOS・Androidでは<br/>この機能を使用できません</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* 翻訳中・待機中 */}
                            {isTranslationMode && liveTranslations.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center py-12 gap-3">
                                    <div className="w-12 h-12 rounded-full bg-[#c9a8e0]/30 flex items-center justify-center animate-pulse">
                                        <Zap size={22} className="text-[#6f5385]" />
                                    </div>
                                    <p className="text-sm font-bold text-[#1a1c1e]">翻訳モード起動中</p>
                                    <p className="text-xs text-[#4b454e]">生徒が話すと約7秒後に翻訳が表示されます</p>
                                </div>
                            )}

                            {/* 翻訳結果一覧 */}
                            {liveTranslations.map((t) => (
                                <div key={t.id} className="bg-white border border-[#c9a8e0]/30 rounded-2xl p-4 shadow-[0_0_20px_rgba(111,83,133,0.06)]">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-bold text-[#655a6f] uppercase tracking-wide">🌐 翻訳 #{t.id}</span>
                                        <span className="text-[10px] text-[#4b454e]">{t.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>
                                    <p className="text-sm font-bold text-[#1a1c1e] leading-relaxed">{t.japanese}</p>
                                    {t.original && <p className="text-xs text-[#4b454e]/60 italic mt-1">{t.original}</p>}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 💬 手動チャットパネル */}
                    <div className={`flex-1 flex flex-col bg-white ${activeTab === 'chat' ? 'flex' : 'hidden'}`}>
                        <div className="px-4 py-2 border-b border-[#f4f3f7] bg-[#faf9fd] flex justify-between items-center shrink-0">
                            <span className="text-xs font-bold text-[#4b454e] uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={12} className="text-[#6f5385]" /> 手動チャット
                            </span>
                            {messages.length > 0 && (
                                <button onClick={() => setMessages([])} className="text-xs text-[#4b454e] hover:text-red-500 flex items-center gap-1">
                                    <X size={12} /> Clear
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {messages.length === 0 && (
                                <p className="text-xs text-[#4b454e]/50 text-center py-4">「〜の例文を作って」など手動で質問できます</p>
                            )}
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${msg.role === 'user'
                                        ? 'bg-gradient-to-br from-[#6f5385] to-[#9b77b5] text-white rounded-tr-none'
                                        : 'bg-[#f4f3f7] text-[#1a1c1e] rounded-tl-none'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start">
                                    <div className="bg-[#f4f3f7] rounded-2xl rounded-tl-none px-3 py-2 flex items-center gap-1">
                                        {[0, 150, 300].map((d) => (
                                            <span key={d} className="w-1.5 h-1.5 bg-[#c9a8e0] rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-3 border-t border-[#f4f3f7] bg-[#faf9fd] shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="AIに質問する…"
                                    className="flex-1 px-3 py-2 bg-white border border-[#f4f3f7] rounded-full outline-none focus:border-[#c9a8e0] text-xs text-[#1a1c1e]"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="p-2 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white rounded-full disabled:opacity-50 transition-opacity shadow-sm"
                                >
                                    <Send size={15} />
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
