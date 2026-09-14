'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpeechSegmenter, rmsOf } from '@/lib/speech-segmenter';
import {
    ArrowLeft, Send, Sparkles, Mic, Loader2, Download, ChevronDown, Headphones, Lightbulb, Image as ImageIcon, BookOpen, PencilLine, Repeat2, Home, GraduationCap, Settings,
} from 'lucide-react';
import Link from 'next/link';
import { GuidePanel } from './guide-panel';

// ────────────────────────────────────────────
// 型定義
// ────────────────────────────────────────────
type KeyPoint = { question: string; answer: string };
type PrepContent = { review_quiz: KeyPoint[]; intro_topic: string; advice: string };
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type AutoSuggestion = { id: number; text: string; timestamp: Date };

// 授業の流れ（中央フィード）。会話とASTAの提案・生成物が時系列で1本に並ぶ
// （UI改修 第二段階・2026-08-16。設計方針「道具箱から助手へ」）
type FlowItem = {
    id: number;
    kind: 'said'          // 先生・生徒の発話（文字起こし）
        | 'suggest'       // ASTAからの提案（進め方）
        | 'translate-help'// ASTAからの提案（ことばの補助）
        | 'illust'        // 生成した絵（案C：速い版→丁寧版に差し替え）
        | 'material'      // 例文・練習問題・言い換え
        | 'asked'         // 先生が手で聞いた質問（旧・手動チャット）
        | 'answer'        // その答え
        | 'textbook'      // 教科書のページ（台本のステップを開くと流れに入る）
        | 'student-said'  // 生徒の発話（画面共有の音声→日本語訳）
        | 'notice';       // 運用のお知らせ（上限で停止・音声なし共有 など）
    text?: string;
    title?: string;
    translation?: string;  // said: 発話の母語訳（あとから届く）
    img?: string;          // illust: 表示中の絵
    imgQuality?: string;   // illust: 裏で作った丁寧版（未差し替え時のみ保持）
    imgs?: string[];       // textbook: ページの画像
    ts: Date;
};

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
/**
 * AIが返す文の強調記号などを落として読める形にする。
 * 授業中に「**」が見えると読みづらく、生徒にも見せられない
 */
function readable(md: string): string {
    return md
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/^\s*[*-]\s+/gm, '・')
        .replace(/^#{1,6}\s*/gm, '')
        .replace(/`/g, '');
}

const CHAR_TRIGGER = 50;    // 50文字ごとに自動分析（体感が遅い指摘で100→50・2026-08-25）
const EXCHANGE_TRIGGER = 2; // 2発言ごとに自動分析（同上 3→2）

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

    // ── 授業の流れ（中央フィード）──
    const [flow, setFlow] = useState<FlowItem[]>([]);
    const flowRef = useRef<FlowItem[]>([]);   // ボタン処理から最新の流れを読むための写し
    const flowIdRef = useRef(0);
    const flowEndRef = useRef<HTMLDivElement>(null);
    const saidBufferRef = useRef('');   // 発話を文の切れ目まで貯めるバッファ
    const saidFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const addFlow = useCallback((item: Omit<FlowItem, 'id' | 'ts'>) => {
        flowIdRef.current += 1;
        const id = flowIdRef.current;
        setFlow(prev => [...prev.slice(-79), { ...item, id, ts: new Date() }]);
        return id;
    }, []);
    const patchFlow = useCallback((id: number, patch: Partial<FlowItem>) => {
        setFlow(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
    }, []);
    useEffect(() => { flowRef.current = flow; }, [flow]);

    // 4ボタン（絵・例文・練習問題・言い換え）に渡す「いま授業で話していること」。
    // 先生の言葉だけでなく生徒の言葉も、誰が言ったか付きで渡す（2026-09-06 かずき決定）。
    // それまでは「絵で見せる」だけが先生の言葉を使い、他の3つは会話を一切見ていなかった
    const recentConversation = useCallback((limit = 700) => {
        const lines: string[] = [];
        for (const it of flowRef.current) {
            if (it.kind === 'said' && it.text) {
                lines.push(`先生：${it.text}`);
            } else if (it.kind === 'student-said' && it.text) {
                const orig = it.translation && it.translation !== it.text ? `（原文: ${it.translation}）` : '';
                lines.push(`生徒：${it.text}${orig}`);
            }
        }
        const pending = saidBufferRef.current.trim();   // まだ吹き出しになっていない先生の言葉
        if (pending) lines.push(`先生：${pending}`);
        const all = lines.join('\n');
        if (all.length <= limit) return all;
        const tail = all.slice(-limit);                 // 末尾（直近）を優先
        const nl = tail.indexOf('\n');
        return nl >= 0 ? tail.slice(nl + 1) : tail;
    }, []);
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
    const [micError, setMicError] = useState<string | null>(null);
    // 使用中のマイクの名前（2026-09-06 かずき許可）。先生の音声認識はChrome内蔵でマイクを
    // 選べないため、せめて「どのマイクか」を見せる。実機で Mac の入力が iPhone に連係で
    // 切り替わり、録音中のまま無音になった事故から（原因の切り分けに1時間かかった）
    const [micLabel, setMicLabel] = useState('');
    const micWarnedLabelRef = useRef('');                          // iPhone警告を出した名前（同じ名前で繰り返さない）
    const micErrorNoticeRef = useRef<Record<string, number>>({});  // エラー種別ごとの最終表示時刻
    const IPHONE_MIC = /iphone|ipad|continuity|連係/i;

    // 既定のマイクの名前を読む。Chrome内蔵の認識は「既定の入力」を使うので、
    // enumerateDevices の 'default' がそれに当たる（前提・未検証）
    const refreshMicLabel = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const inputs = devices.filter(d => d.kind === 'audioinput');
            const def = inputs.find(d => d.deviceId === 'default') ?? inputs[0];
            const label = (def?.label ?? '').replace(/^(default|既定|デフォルト)\s*[-–—:：]\s*/i, '').trim();
            setMicLabel(label);
            if (label && IPHONE_MIC.test(label) && micWarnedLabelRef.current !== label) {
                micWarnedLabelRef.current = label;
                addFlow({ kind: 'notice', text: `⚠️ 先生のマイクが「${label}」になっています。Macのマイクを使うつもりなら、Macの「システム設定→サウンド→入力」で切り替えるか、iPhoneの「設定→一般→AirPlayとHandoff→連係カメラ」をオフにしてください。` });
            }
        } catch { /* 名前が取れなければ表示しないだけ */ }
    }, [addFlow]);   // IPHONE_MIC は定数

    // マイクが差し替わったら名前を更新（AirPods接続・iPhone連係など）
    useEffect(() => {
        const md = navigator.mediaDevices;
        if (!md?.addEventListener) return;
        md.addEventListener('devicechange', refreshMicLabel);
        return () => md.removeEventListener('devicechange', refreshMicLabel);
    }, [refreshMicLabel]);

    // ── 翻訳モード state ──
    const [isTranslationMode, setIsTranslationMode] = useState(false);
    const [aiTranslationSuggestions, setAiTranslationSuggestions] = useState<AutoSuggestion[]>([]);
    const [isChromeDesktop, setIsChromeDesktop] = useState(false);
    const displayStreamRef = useRef<MediaStream | null>(null);
    const translationRecorderRef = useRef<MediaRecorder | null>(null);
    const translationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // 生徒音声を「文の切れ目」で区切るための道具（2026-09-06 かずき決定 A案）
    const audioCtxRef = useRef<AudioContext | null>(null);
    const vadTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const cutRecorderRef = useRef<((send: boolean) => void) | null>(null);
    const sendChainRef = useRef<Promise<void>>(Promise.resolve());
    // 直前の生徒発話（文の途中で終わっていれば、次の発話とつなげて翻訳し直す＝B案）
    const lastStudentRef = useRef<{ id: number; original: string; at: number } | null>(null);

    // ── 即興イラスト生成（機能B-2）──
    // 授業中どのタブを見ていても押せるよう、ヘッダーに置く。
    // 課が選ばれていなくても、直近の会話から場面を起こせる
    // 教科書タブで選んだ課。ヘッダーのイラスト生成でも使う
    const [selectedLessonId, setSelectedLessonId] = useState('');
    const handleLessonChange = useCallback((id: string) => setSelectedLessonId(id), []);
    // イラストは案C（2026-08-16 かずき決定）：1ボタンで速い絵を先に出し、
    // 裏で丁寧な絵も作って「差し替える？」と提案する。先生はモードを選ばない。
    // 結果は「授業の流れ」のカードとして出す（第二段階でタブを廃止）
    const [illustBusy, setIllustBusy] = useState(false);
    const [illustError, setIllustError] = useState('');
    const illustRunRef = useRef(0);                     // 連打時に古い結果を捨てるための世代番号

    // 例文・練習問題・言い換え（教科書タブから4ボタンへ移設）
    const [materialBusy, setMaterialBusy] = useState<string | null>(null);

    // 道具を出す/しまう（2026-09-02 かずき提案のワンクリック切替）。
    // しまう＝生徒と見る配分（先生の道具を最小化・文字を大きく）。
    // どちらの状態でも全部見えて安全な設計なので、押し忘れても事故にならない
    const [toolsOut, setToolsOut] = useState(true);
    const [showHints, setShowHints] = useState(true);   // ASTAのヒント（進め方・ことば・考え中）を画面に出すか。生徒に画面を見せるときはオフ


    // ── 生徒向け翻訳（先生 → 生徒方向）──
    const [studentNativeLanguage, setStudentNativeLanguage] = useState('English');
    const [studentName, setStudentName] = useState('');   // 吹き出しの話し手表示に使う
    const studentNativeLangRef = useRef('English');
    const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
    const translateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // BroadcastChannel（生徒ビューとの同デバイス通信）
    useEffect(() => {
        if (typeof window === 'undefined' || !studentId) return;
        const ch = new BroadcastChannel(`asta-live-${studentId}`);
        broadcastChannelRef.current = ch;
        return () => { ch.close(); broadcastChannelRef.current = null; };
    }, [studentId]);

    // studentNativeLanguage を ref に同期（stale closure 防止）
    useEffect(() => { studentNativeLangRef.current = studentNativeLanguage; }, [studentNativeLanguage]);

    // ── Phase 1B：生徒コンテキスト取得 ──
    useEffect(() => {
        if (!studentId) return;
        const supabase = createClient();

        const fetchContext = async () => {
            try {
                // 生徒情報
                const { data: student } = await supabase
                    .from('students')
                    .select('name, jlpt_level, goal_text, textbook, current_phase, memo, nationality')
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
                setStudentName(student.name ?? '');

                // 国籍 → 言語の自動設定
                const nationalityToLang: Record<string, string> = {
                    'アメリカ': 'English', 'イギリス': 'English', 'カナダ': 'English', 'オーストラリア': 'English',
                    'フィリピン': 'English', 'インド': 'English', 'シンガポール': 'English',
                    'スペイン': 'Spanish', 'メキシコ': 'Spanish', 'コロンビア': 'Spanish',
                    'ブラジル': 'Portuguese', 'ポルトガル': 'Portuguese',
                    '韓国': 'Korean', '中国': 'Chinese', '台湾': 'Chinese',
                    'フランス': 'French', 'ドイツ': 'German', 'イタリア': 'Italian',
                    'タイ': 'Thai', 'ベトナム': 'Vietnamese', 'インドネシア': 'Indonesian',
                };
                const nativeLang = student.nationality ? nationalityToLang[student.nationality] : null;
                if (nativeLang) {
                    setStudentNativeLanguage(nativeLang);
                }

                const lines: string[] = [
                    `生徒ゴール: ${student.goal_text || '未設定'}`,
                    `現在レベル: ${student.jlpt_level || '未設定'}`,
                    `使用教材: ${student.textbook || '未設定'}`,
                    `現在の進度: ${student.current_phase || '未設定'}`,
                    `生徒のネイティブ言語: ${nativeLang || 'English'}（翻訳補助はこの言語で出力すること）`,
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
    }, [messages]);

    // 授業の流れ：新しいカードが増えたら一番下まで送る
    useEffect(() => {
        flowEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [flow]);

    // ────────────────────────────────────────────
    // 生徒向け翻訳（先生の日本語 → 生徒の母国語）
    // ────────────────────────────────────────────
    // 発話の吹き出しに母語訳を後付けする（共有前提の1画面設計・2026-08-25）。
    // 生徒も同じ画面を見るので、日本語の吹き出しの下に訳が届く。
    // 原文と訳が必ず同じ吹き出しで揃うよう、吹き出し確定の単位で訳す
    const translateSaid = useCallback((flowId: number, japaneseText: string) => {
        if (!japaneseText.trim()) return;
        (async () => {
            try {
                const res = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        // 発話ごとに飛ぶ高頻度用途。専用の回数枠（600/時）で数えるため type を明示する
                        type: 'student_translation',
                        prompt: `Translate the following Japanese text to ${studentNativeLangRef.current}. Output ONLY the translation, nothing else.\n\n${japaneseText}`,
                    }),
                });
                if (!res.ok) return;
                const data = await res.json();
                const translated = (data.text ?? '').trim();
                if (translated) {
                    patchFlow(flowId, { translation: translated });
                    // 旧・生徒ビューを開いている場合にも一応流す（互換・無害）
                    broadcastChannelRef.current?.postMessage({
                        type: 'translation',
                        text: translated,
                        original: japaneseText,
                        timestamp: Date.now(),
                    });
                }
            } catch { /* silent - 翻訳はベストエフォート */ }
        })();
    }, [patchFlow]); // refs のみ参照するため依存は patchFlow だけ

    // ────────────────────────────────────────────
    // 案Y：自動分析トリガー
    // ────────────────────────────────────────────
    const triggerAnalysis = useCallback(async (currentTranscript: string) => {
        if (isAnalyzing || currentTranscript.trim().length < 10) return;

        setIsAnalyzing(true);
        setStreamingText('');

        let accumulated = '';

        // 本日の準備プランをコンテキストとして付与（R-1）
        const prepSummary = prepContent
            ? [
                prepContent.intro_topic ? `導入トーク: ${prepContent.intro_topic.slice(0, 100)}` : '',
                prepContent.advice ? `アドバイス: ${prepContent.advice.slice(0, 100)}` : '',
                prepContent.review_quiz?.length
                    ? `復習クイズ: ${prepContent.review_quiz.map(q => q.question).slice(0, 2).join(' / ')}`
                    : '',
              ].filter(Boolean).join('\n')
            : '';

        try {
            const res = await fetch('/api/ai/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'live_assistant',
                    transcript: currentTranscript.slice(-800), // 直近800文字
                    studentContext: studentContext || '',
                    prepContext: prepSummary || undefined,
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
                    // ASTAが自分から名乗り出る：流れに提案カードとして出す
                    addFlow({ kind: 'suggest', title: '💡 ヒント（進め方）', text: courseText });
                }

                // R-2: AI翻訳補助サジェスト（ことばの補助）も流れに出す
                if (translationText && !translationText.includes('翻訳補助の出番なし')) {
                    setAiTranslationSuggestions(prev => [
                        { id, text: translationText, timestamp: now },
                        ...prev.slice(0, 4),
                    ]);
                    addFlow({ kind: 'translate-help', title: '💡 ことばのヒント', text: translationText });
                }
            }
        } catch (err) {
            console.error('Auto analysis error:', err);
        } finally {
            setIsAnalyzing(false);
            setStreamingText('');
            charsSinceLastTrigger.current = 0;
            exchangesSinceLastTrigger.current = 0;
        }
    }, [isAnalyzing, studentContext, prepContent, addFlow]);

    // ────────────────────────────────────────────
    // 案Y：音声認識 開始 / 停止
    // ────────────────────────────────────────────
    const startListening = useCallback(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert('このブラウザは音声認識に対応していません。Chrome を使用してください。');
            return;
        }
        setMicError(null);

        // マイクの許可を明示的に取り、どのマイクかを読む（Chrome内蔵の認識はマイクを選べず、
        // 許可が保留のときも黙って「録音中」のままになるため）。取ったら即座に手放す
        navigator.mediaDevices?.getUserMedia({ audio: true })
            .then(stream => { stream.getTracks().forEach(t => t.stop()); void refreshMicLabel(); })
            .catch((err: unknown) => {
                if (err instanceof DOMException && err.name === 'NotAllowedError') {
                    setMicError('マイクの使用が許可されていません。ブラウザのアドレスバー左のマイクアイコンから権限を許可してください。');
                } else if (err instanceof DOMException && err.name === 'NotFoundError') {
                    setMicError('マイクが見つかりません。Macの「システム設定→サウンド→入力」を確認してください。');
                }
            });

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

                // 授業の流れに発話を積む。細切れを避けるため、
                // 文の切れ目（。？！）か20字、または2秒の間が空いたら1つの吹き出しにする
                // （初版は40字で「なかなか出ない」体感だった＝かずき指摘 2026-08-25）
                saidBufferRef.current += newFinal;
                const buf = saidBufferRef.current;
                if (saidFlushTimerRef.current) clearTimeout(saidFlushTimerRef.current);
                if (/[。？！?!]\s*$/.test(buf) || buf.length >= 20) {
                    const id = addFlow({ kind: 'said', text: buf.trim() });
                    translateSaid(id, buf.trim());
                    saidBufferRef.current = '';
                } else {
                    saidFlushTimerRef.current = setTimeout(() => {
                        const rest = saidBufferRef.current.trim();
                        if (rest) {
                            const id = addFlow({ kind: 'said', text: rest });
                            translateSaid(id, rest);
                            saidBufferRef.current = '';
                        }
                    }, 2000);
                }

                
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
            if (e.error === 'not-allowed') {
                // マイク権限が拒否された → onend の自動再起動を止めて終了
                recognitionRef.current = null;
                setIsListening(false);
                setMicError('マイクの使用が許可されていません。ブラウザのアドレスバー左のマイクアイコンから権限を許可してください。');
            } else if (e.error !== 'no-speech') {
                console.error('SpeechRecognition error:', e.error);
                // 権限以外のエラーも画面に出す（2026-09-06 かずき許可）。同じ種類は60秒に1回まで
                const now = Date.now();
                if (now - (micErrorNoticeRef.current[e.error] ?? 0) > 60_000) {
                    micErrorNoticeRef.current[e.error] = now;
                    const why: Record<string, string> = {
                        network: '認識サービスとの通信に失敗しています（回線かChromeの不調）',
                        'audio-capture': 'マイクの音が取れません（別のアプリがマイクを使っていないか確認）',
                        aborted: '認識が中断されました（別のタブでASTAの授業画面を開いていないか確認）',
                        'language-not-supported': 'この環境では日本語の認識が使えません',
                        'service-not-allowed': 'この環境では音声認識が使えません',
                    };
                    addFlow({ kind: 'notice', text: `⚠️ 先生のマイク認識：${why[e.error] ?? `エラー（${e.error}）`}。「録音中」のまま文字が出ない時はこれが原因です。` });
                }
            }
        };

        recognition.onend = () => {
            // continuous=trueでも途切れることがある → 自動再起動
            // ただし recognitionRef.current === recognition の場合のみ（not-allowed で null 化された場合は除く）
            if (recognitionRef.current === recognition) {
                try {
                    recognition.start();
                } catch (err) {
                    // NotAllowedError は権限拒否 → 再起動せず終了
                    if (err instanceof DOMException && err.name === 'NotAllowedError') {
                        recognitionRef.current = null;
                        setIsListening(false);
                        setMicError('マイクの使用が許可されていません。ブラウザのアドレスバー左のマイクアイコンから権限を許可してください。');
                    }
                }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [triggerAnalysis, translateSaid, addFlow, refreshMicLabel]);

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
        // 授業の流れに質問を積む（2026-08-20：チャットタブを廃止し流れに統合）
        addFlow({ kind: 'asked', text: userContent });

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
                body: JSON.stringify({ prompt, type: 'live_answer' }),   // 授業中：質問への答え（利用実態を画面ごとに数えるため）
            });

            if (!res.ok) throw new Error('AI request failed');

            const data = await res.json();
            const aiContent = data.text;
            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
            addFlow({ kind: 'answer', title: '💬 質問への答え', text: aiContent });

            await supabase.from('lesson_chat_logs').insert({
                student_id: studentId,
                lesson_id: scheduledLessonId || null,
                role: 'assistant',
                content: aiContent
            });
        } catch (err) {
            console.error('Chat Error:', err);
            setMessages(prev => [...prev, { role: 'assistant', content: 'エラーが発生しました。もう一度お試しください。' }]);
            addFlow({ kind: 'answer', title: '💬 質問への答え', text: '答えを作れませんでした。もう一度お試しください。' });
        } finally {
            setIsTyping(false);
        }
    };

    // ── 翻訳モード 開始 / 停止 ──
    const startTranslationMode = useCallback(async () => {
        if (!isChromeDesktop) return;
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true } as DisplayMediaStreamOptions);

            // 音声トラックの無い共有（「画面全体」「ウィンドウ」選択時）は翻訳できない。
            // 従来はここを素通りして「翻訳中」表示のまま無言で失敗していた → 明示的に案内して中止する
            const audioTrack = stream.getAudioTracks()[0];
            if (!audioTrack) {
                stream.getTracks().forEach(t => t.stop());
                addFlow({ kind: 'notice', text: '⚠️ 共有に音声が含まれていません。共有画面で「Chromeタブ」を選び、下の「タブの音声も共有」にチェックを入れてから、生徒の声が流れるタブ（Zoom等）を選んでください。' });
                return;
            }

            // videoトラックは音声取得のために必要だが映像は不要なので即停止
            stream.getVideoTracks().forEach(t => t.stop());
            displayStreamRef.current = stream;

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/webm';

            // 1切れの音声を送る。直前の生徒発話が文の途中で終わっていれば、その原文を
            // 「文脈」として同送し、返ってきた結合訳で前の吹き出しを差し替える（B案）
            const sendChunk = async (blob: Blob) => {
                const prev = lastStudentRef.current;
                const canMerge = !!prev
                    && Date.now() - prev.at < 8000
                    && !/[.!?。！？]\s*$/.test(prev.original)
                    && prev.original.length < 300;
                const formData = new FormData();
                formData.append('audio', blob, 'chunk.webm');
                // 生徒の母国語をSTTの検出対象に使う（母国語+en-USの2言語検出）
                formData.append('language', studentNativeLangRef.current);
                formData.append('context', canMerge && prev ? prev.original : '');
                try {
                    const res = await fetch('/api/ai/transcribe', { method: 'POST', body: formData });
                    if (res.status === 429) {
                        // 利用上限到達 → 再送を止めるため翻訳モードごと停止（課金暴走の栓）
                        stopTranslationMode();
                        addFlow({ kind: 'notice', text: '⚠️ 翻訳の利用量が上限に達したため自動停止しました。1時間ほど置いてから再度お試しください。' });
                        return;
                    }
                    const data = await res.json();
                    const japanese = String(data.japanese ?? '').trim();
                    const original = String(data.original ?? '').trim();
                    if (!japanese) return;
                    // 生徒が日本語で話した時は原文＝訳なので、同じ文を2回出さない
                    const translation = original && original !== japanese ? original : '';
                    if (canMerge && prev && data.merged) {
                        patchFlow(prev.id, { text: japanese, translation });
                        lastStudentRef.current = { id: prev.id, original, at: Date.now() };
                    } else {
                        // 生徒の発話は流れに直接出す（2026-09-03 かずき指示）
                        const id = addFlow({ kind: 'student-said', text: japanese, translation });
                        lastStudentRef.current = { id, original, at: Date.now() };
                    }
                } catch (err) { console.error('Translation chunk error:', err); }
            };

            // 録音は「文の切れ目」で区切る（2026-09-06 かずき決定 A案。それまでは2.5秒固定で
            // 文の途中で切れ、文字起こしも翻訳も文脈を失っていた）。
            // 毎回 stop→新規起動する方式は維持する：連続録音を途中で分けると2個目以降に
            // コンテナヘッダが無く Google STT が拒否するため（2026-07-20 分割実験で実証）。
            const startSegmentRecorder = () => {
                if (!displayStreamRef.current) return;
                const recorder = new MediaRecorder(displayStreamRef.current, { mimeType });
                translationRecorderRef.current = recorder;
                let shouldSend = false;
                cutRecorderRef.current = (send: boolean) => {
                    shouldSend = send;
                    if (recorder.state === 'recording') recorder.stop();
                };
                recorder.ondataavailable = (e: BlobEvent) => {
                    if (!shouldSend || e.data.size < 500) return;
                    // 順番を守って1つずつ送る（結合の判定が直前の結果に依存するため）
                    sendChainRef.current = sendChainRef.current.then(() => sendChunk(e.data)).catch(() => {});
                };
                recorder.onstop = () => {
                    // stopTranslationMode 経由の停止（ref がnull化 or 差し替え済み）なら再起動しない
                    if (translationRecorderRef.current === recorder) startSegmentRecorder();
                };
                recorder.start();
            };

            // 音量を50msごとに測って判定器に渡し、区切りの指示が出たら録音を止める
            const audioCtx = new AudioContext();
            audioCtxRef.current = audioCtx;
            const source = audioCtx.createMediaStreamSource(new MediaStream([audioTrack]));
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            const samples = new Float32Array(analyser.fftSize);
            const segmenter = new SpeechSegmenter(performance.now());
            let fallbackLastCut = performance.now();
            vadTimerRef.current = setInterval(() => {
                const now = performance.now();
                if (audioCtx.state !== 'running') {
                    // 音量が測れない間（音声処理が始まっていない）は、旧方式に近い4秒区切りで送る。
                    // 無言で何も出ないより安全。通常は最初の数十msだけここを通る
                    void audioCtx.resume().catch(() => {});
                    if (now - fallbackLastCut >= 4000) {
                        cutRecorderRef.current?.(true);
                        fallbackLastCut = now;
                        segmenter.reset(now);
                    }
                    return;
                }
                analyser.getFloatTimeDomainData(samples);
                const action = segmenter.push(rmsOf(samples), now);
                if (action) {
                    cutRecorderRef.current?.(action === 'send');
                    segmenter.reset(now);
                    fallbackLastCut = now;
                }
            }, 50);

            startSegmentRecorder();
            setIsTranslationMode(true);
            // ヘッドホン推奨の案内（2026-09-06 かずき決定・運用案内）。スピーカー再生だと生徒の声を
            // 先生のマイクが拾い、「先生」の吹き出しとして出る（経路はかずきの実機で確認中）
            // （表示は画面の上の帯の下に常に出す：2026-09-11 画面案に合わせて流れへの差し込みはやめた）

            audioTrack.onended = () => stopTranslationMode();

            // 閉じ忘れ対策：連続90分で自動停止（STT課金が一晩中続く事故を防ぐ）
            translationTimerRef.current = setTimeout(() => {
                stopTranslationMode();
                addFlow({ kind: 'notice', text: '⏰ 連続90分が経過したため翻訳を自動停止しました。続ける場合はもう一度「翻訳を始める」を押してください。' });
            }, 90 * 60 * 1000);
        } catch (err) {
            // ユーザーがキャンセル or 権限拒否 → コンソールエラーを出さない
            if (err instanceof DOMException && err.name === 'NotAllowedError') return;
            console.error('getDisplayMedia error:', err);
        }
    }, [isChromeDesktop]); // eslint-disable-line react-hooks/exhaustive-deps

    const stopTranslationMode = useCallback(() => {
        if (translationTimerRef.current) {
            clearTimeout(translationTimerRef.current);
            translationTimerRef.current = null;
        }
        if (vadTimerRef.current) {
            clearInterval(vadTimerRef.current);
            vadTimerRef.current = null;
        }
        // 先に ref を null 化してから stop する（onstop による再起動を防ぐ）。
        // 録音中の最後の1切れは送ってから止める（話しかけの途中で止めても最後まで出る）
        const recorder = translationRecorderRef.current;
        translationRecorderRef.current = null;
        const cut = cutRecorderRef.current;
        cutRecorderRef.current = null;
        if (cut) cut(true);
        else if (recorder && recorder.state === 'recording') recorder.stop();
        audioCtxRef.current?.close().catch(() => {});
        audioCtxRef.current = null;
        lastStudentRef.current = null;
        displayStreamRef.current?.getTracks().forEach(t => t.stop());
        displayStreamRef.current = null;
        setIsTranslationMode(false);
    }, []);


    // アンマウント時にクリーンアップ（stopTranslationMode宣言の後に配置）
    useEffect(() => {
        return () => { stopListening(); stopTranslationMode(); };
    }, [stopListening, stopTranslationMode]);

    // 即興イラスト生成（案C）。先生は追加入力もモード選択もしない。
    // 速い絵（約8秒）と丁寧な絵（約35秒）を同時に作り始め、
    // 速い方を先に見せて、丁寧な方ができたら「差し替える？」と提案する。
    // 速い方は日本語の誤字が出ることがある（実機で確認済み）ための二段構え
    const requestIllust = async (mode: 'fast' | 'quality') => {
        const res = await fetch('/api/materials/illustrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                studentId,
                mode,
                masterMaterialId: selectedLessonId || undefined,
                transcript: recentConversation(),   // 先生＋生徒の直近の会話（2026-09-06）
                nativeLanguage: studentNativeLangRef.current,
            }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'イラストの生成に失敗しました。');
        return data as { dataUrl: string; elapsedMs?: number };
    };

    const generateIllustration = async () => {
        const run = ++illustRunRef.current;
        setIllustBusy(true);
        setIllustError('');
        // まず流れに「描いています…」のカードを置き、速い版・丁寧版の両方がそこへ届く
        const itemId = addFlow({ kind: 'illust', title: '🎨 絵を描いています…（約10秒）', img: '' });

        // 丁寧版は裏で静かに走らせる。失敗しても速い版があるので黙って諦める
        requestIllust('quality')
            .then(d => {
                if (illustRunRef.current !== run) return;
                // 万一こちらが先に完成したら（速い版の失敗時）そのまま本編として出す
                setFlow(prev => prev.map(it => {
                    if (it.id !== itemId) return it;
                    return it.img
                        ? { ...it, imgQuality: d.dataUrl }
                        : { ...it, img: d.dataUrl, title: '🎨 できた絵' };
                }));
            })
            .catch(() => { /* 速い版で続行 */ });

        try {
            const d = await requestIllust('fast');
            if (illustRunRef.current !== run) return;
            patchFlow(itemId, { img: d.dataUrl, title: `🎨 できた絵（${Math.round((d.elapsedMs ?? 0) / 1000)}秒）` });
        } catch (e) {
            if (illustRunRef.current === run) {
                setFlow(prev => prev.filter(it => it.id !== itemId || !!it.img));
                setIllustError(e instanceof Error ? e.message : 'イラストの生成に失敗しました。');
            }
        } finally {
            if (illustRunRef.current === run) setIllustBusy(false);
        }
    };

    // 例文・練習問題・やさしい言い換えをその場で作る（教科書の課＋生徒情報から）
    const MATERIAL_MODES = {
        examples: { label: '✏️ 例文', hint: 'この課×生徒に合う場面で5つ' },
        exercises: { label: '📝 練習問題', hint: 'いまの文法で3問' },
        explain: { label: '💡 やさしく言い換え', hint: '説明が伝わらない時に' },
    } as const;

    const makeMaterial = async (mode: keyof typeof MATERIAL_MODES) => {
        if (!selectedLessonId) {
            setIllustError('左の「きょうの進め方」で課を選ぶと、例文・問題・言い換えが作れます。');
            return;
        }
        setMaterialBusy(mode);
        setIllustError('');
        try {
            const res = await fetch('/api/materials/improvise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ masterMaterialId: selectedLessonId, mode, studentId, note: '', transcript: recentConversation() }),
            });
            const data = await res.json();
            if (!res.ok) {
                setIllustError(data.error ?? '生成に失敗しました。');
                return;
            }
            addFlow({ kind: 'material', title: MATERIAL_MODES[mode].label, text: data.text ?? '' });
        } catch {
            setIllustError('通信に失敗しました。もう一度お試しください。');
        } finally {
            setMaterialBusy(null);
        }
    };

    const finishLesson = () => {
        stopListening();
        stopTranslationMode();
        // 記録の自動下書き用に、授業全体の会話（先生と生徒の両方・誰が言ったか付き）を記録の画面へ渡す（2026-09-14）
        const conversation = recentConversation(200000);
        if (transcriptRef.current.trim() || conversation.trim()) {
            localStorage.setItem(`live_session_${studentId}`, JSON.stringify({
                transcript: transcriptRef.current,
                conversation,
                courseSuggestions: courseSuggestions.slice(0, 3),
            }));
        }
        const query = scheduledLessonId ? `?scheduledLessonId=${scheduledLessonId}` : '';
        router.push(`/students/${studentId}/lessons/new${query}`);
    };

    // ────────────────────────────────────────────
    // UI
    // ────────────────────────────────────────────
    // 見た目は画面案 strategy/デザイン案_色D書体E_2026-09-11/ライブ授業_色D書体E.html（2026-09-11 かずき決定：配置＝D）。
    // アプリの左のナビを使わない全画面。左の細いナビは「生徒」を選んだ状態（ライブ授業は生徒の中の画面のため）
    const timeOf = (d: Date) => d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    const RAIL = [
        { name: 'ホーム', href: '/', Icon: Home },
        { name: '生徒', href: '/students', Icon: GraduationCap },
        { name: '教材', href: '/materials', Icon: BookOpen },
        { name: '設定', href: '/settings', Icon: Settings },
    ];
    const ASK_BUTTONS = [
        { key: 'illust', title: '絵で見せる', hint: 'いまの内容を1枚の絵に', Icon: ImageIcon, tile: 'bg-[#ede8fa] text-[#6b5ca5] group-hover:bg-[#6b5ca5]',
          busy: illustBusy, disabled: illustBusy, onClick: generateIllustration, tip: 'いまの会話と課に合う絵を約10秒で作る。文字まできれいな版も自動で用意' },
        { key: 'examples', title: '例文', hint: MATERIAL_MODES.examples.hint, Icon: BookOpen, tile: 'bg-[#dff1ea] text-[#2a6f5a] group-hover:bg-[#2a6f5a]',
          busy: materialBusy === 'examples', disabled: materialBusy !== null, onClick: () => makeMaterial('examples'), tip: MATERIAL_MODES.examples.hint },
        { key: 'exercises', title: '練習問題', hint: MATERIAL_MODES.exercises.hint, Icon: PencilLine, tile: 'bg-[#efe9f8] text-[#55488a] group-hover:bg-[#55488a]',
          busy: materialBusy === 'exercises', disabled: materialBusy !== null, onClick: () => makeMaterial('exercises'), tip: MATERIAL_MODES.exercises.hint },
        { key: 'explain', title: 'やさしく言い換え', hint: MATERIAL_MODES.explain.hint, Icon: Repeat2, tile: 'bg-[#dff1ea] text-[#2a6f5a] group-hover:bg-[#2a6f5a]',
          busy: materialBusy === 'explain', disabled: materialBusy !== null, onClick: () => makeMaterial('explain'), tip: MATERIAL_MODES.explain.hint },
    ];

    return (
        <div className="fixed inset-0 z-50 flex flex-row overflow-hidden bg-[#f6f3fb] text-[#3a3350]">

            {/* 左の細いナビ */}
            <aside className="hidden md:flex w-20 bg-[#f8f1ff] border-r border-[#e4ddf0] flex-col justify-between items-center py-6 px-2 shrink-0">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-[20px] leading-[30px] font-semibold tracking-wider text-[#55488a]">ASTA</span>
                    <span className="w-4 h-px bg-[#6b5ca5] opacity-30 mt-0.5" />
                </div>
                <nav className="flex flex-col items-center gap-6 w-full">
                    {RAIL.map(({ name, href, Icon }) => {
                        const active = href === '/students';
                        return (
                            <Link
                                key={href}
                                href={href}
                                aria-current={active ? 'page' : undefined}
                                className={`w-full flex flex-col items-center justify-center py-2.5 rounded-lg transition-colors ${active
                                    ? 'text-[#55488a] bg-[#e7deff]/60 font-semibold'
                                    : 'text-[#484550] hover:text-[#55488a] hover:bg-[#efe9f8]'}`}
                            >
                                <Icon size={24} strokeWidth={1.6} />
                                <span className="text-[15px] mt-1">{name}</span>
                            </Link>
                        );
                    })}
                </nav>
                <div className="h-10" />
            </aside>

            <main className="flex-1 flex flex-col h-screen min-w-0 overflow-hidden">

                {/* 上の帯 */}
                <header className="h-16 px-6 bg-[#fbfaff] border-b border-[#e4ddf0] flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-4 min-w-0">
                        <button onClick={() => router.back()} title="戻る" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[#e4ddf0] text-[#3a3350] hover:bg-[#efe9f8] transition-colors shrink-0">
                            <ArrowLeft size={18} />
                        </button>
                        <h1 className="text-[26px] leading-[36px] font-semibold tracking-wide whitespace-nowrap">授業中</h1>
                        <div className="h-5 w-px bg-[#e4ddf0] mx-1 shrink-0" />

                        {/* 状態はこの信号1つに集約。押すと録音の一時停止/再開 */}
                        <button
                            onClick={isListening ? stopListening : startListening}
                            title={isListening ? '押すと録音を一時停止' : '押すと録音を再開'}
                            className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#ede8fa] border border-[#cfc6ea] text-[#6b5ca5] hover:bg-[#e7deff]/40 transition-colors whitespace-nowrap shrink-0"
                        >
                            <span className={`w-2.5 h-2.5 rounded-full ${isListening ? 'bg-[#6b5ca5] animate-pulse' : 'bg-[#cfc6ea]'}`} />
                            <span className="text-[14px] font-medium tracking-wide">{isListening ? '録音中' : '一時停止中'}</span>
                        </button>
                        {isListening && micLabel && (
                            <span
                                title="先生の音声認識が使っているマイク"
                                className={`flex items-center gap-1.5 text-[15px] whitespace-nowrap min-w-0 ${IPHONE_MIC.test(micLabel)
                                    ? 'px-2.5 py-1 rounded-md bg-amber-100 text-[#5a3d00] border border-amber-300'
                                    : 'text-[#3a3350]'}`}
                            >
                                <Mic size={15} className="shrink-0" />
                                <span className="truncate max-w-[200px]">{micLabel}</span>
                            </span>
                        )}
                        {isTranslationMode && (
                            <span className="px-2.5 py-1 rounded-md bg-[#dff1ea] text-[#2a6f5a] border border-[#bfe3d4] text-[13px] font-medium flex items-center gap-1 whitespace-nowrap shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2a6f5a]" />
                                生徒の画面に翻訳を表示中
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {isChromeDesktop && (
                            <button
                                onClick={isTranslationMode ? stopTranslationMode : startTranslationMode}
                                title={isTranslationMode ? '翻訳を止める' : '画面共有の音声から翻訳を始める'}
                                className={`px-3.5 py-1.5 rounded-lg border bg-white text-[15px] font-medium transition-colors whitespace-nowrap ${isTranslationMode
                                    ? 'border-[#bfe3d4] text-[#2a6f5a] hover:bg-[#dff1ea]'
                                    : 'border-[#cfc6ea] text-[#6b5ca5] hover:bg-[#ede8fa]'}`}
                            >
                                {isTranslationMode ? '翻訳を止める' : '翻訳を始める'}
                            </button>
                        )}

                        {/* 生徒の母国語（生徒の画面に出す翻訳の言語） */}
                        <div className="relative">
                            <select
                                value={studentNativeLanguage}
                                onChange={e => setStudentNativeLanguage(e.target.value)}
                                title="生徒の母国語（翻訳して見せる言語）"
                                className="appearance-none bg-white border border-[#e4ddf0] text-[#3a3350] text-[15px] font-medium rounded-lg pl-3.5 pr-8 py-1.5 focus:outline-none focus:border-[#6b5ca5] focus:ring-1 focus:ring-[#6b5ca5] cursor-pointer"
                            >
                                <option value="English">英語</option>
                                <option value="Spanish">スペイン語</option>
                                <option value="Portuguese">ポルトガル語</option>
                                <option value="Korean">韓国語</option>
                                <option value="Chinese">中国語</option>
                                <option value="French">フランス語</option>
                                <option value="German">ドイツ語</option>
                                <option value="Thai">タイ語</option>
                                <option value="Vietnamese">ベトナム語</option>
                                <option value="Indonesian">インドネシア語</option>
                            </select>
                            <ChevronDown size={16} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#3a3350]" />
                        </div>

                        {/* ASTAのヒント：オン＝ヒント（進め方・ことば・考え中）を出す。生徒に画面を見せるときはオフ（オフの間に出たヒントも、オンに戻すと見える） */}
                        <button
                            onClick={() => setShowHints(v => !v)}
                            role="switch"
                            aria-checked={showHints}
                            title={showHints ? '押すとASTAのヒントを隠す（生徒に画面を見せるとき）' : '押すとASTAのヒントを出す'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e4ddf0] bg-white text-[#3a3350] whitespace-nowrap"
                        >
                            <span className="text-[15px] font-medium">ASTAのヒント</span>
                            <span className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors ${showHints ? 'bg-[#6b5ca5] justify-end' : 'bg-[#cfc6ea] justify-start'}`}>
                                <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                            </span>
                        </button>

                        {/* 共有モード：オン＝生徒と見る画面（道具をしまう）。Zoomで画面共有するときはオン */}
                        <button
                            onClick={() => setToolsOut(v => !v)}
                            role="switch"
                            aria-checked={!toolsOut}
                            title={toolsOut
                                ? '押すと共有モード（生徒と見る画面）。Zoomで画面共有するときはこの状態で'
                                : '押すと準備モード（先生の道具を出す）'}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e4ddf0] bg-white text-[#3a3350] whitespace-nowrap"
                        >
                            <span className="text-[15px] font-medium">共有モード</span>
                            <span className={`w-9 h-5 rounded-full flex items-center p-0.5 transition-colors ${!toolsOut ? 'bg-[#6b5ca5] justify-end' : 'bg-[#cfc6ea] justify-start'}`}>
                                <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
                            </span>
                        </button>

                        <button
                            onClick={finishLesson}
                            className="px-4 py-2 rounded-lg bg-[#6b5ca5] hover:bg-[#55488a] text-white text-[15px] font-medium shadow-sm transition-colors active:scale-[0.98] whitespace-nowrap"
                        >
                            授業を終える
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">

                    {/* 左の列：きょうの進め方（台本） */}
                    <GuidePanel
                        studentId={studentId}
                        collapsed={!toolsOut}
                        prepContent={prepContent}
                        lessonId={selectedLessonId}
                        onLessonChange={handleLessonChange}
                        onStepOpen={pg => {
                            addFlow({
                                kind: 'textbook',
                                title: `${pg.lessonLabel}　${pg.stepTitle}`,
                                text: pg.body,
                                imgs: pg.imageUrls,
                            });
                        }}
                    />

                    {/* 右：授業の流れ（会話とASTAの提案・生成物が時系列で並ぶ） */}
                    <section className="flex-1 flex flex-col justify-between overflow-hidden bg-[#f6f3fb]">
                        {/* ヘッドホン推奨の案内（2026-09-06 かずき決定・運用案内）。画面案では常に上の帯の下に出す */}
                        <div className="px-6 py-2 bg-[#efe9f8] border-b border-[#e4ddf0] flex items-center justify-center gap-2 text-[13px] text-[#484550] shrink-0">
                            <Headphones size={15} />
                            <span>ヘッドホン推奨：スピーカーだと、生徒の声が先生の吹き出しに混ざることがあります</span>
                        </div>

                        {micError && (
                            <div className="mx-6 mt-3 p-3 bg-[#fff0f0] border border-[#f4b8b8] rounded-xl shrink-0">
                                <p className="text-[13px] font-bold text-[#ba1a1a] mb-0.5">マイクが使えません</p>
                                <p className="text-[13px] text-[#960000]">{micError}</p>
                                <button onClick={startListening} className="mt-1.5 text-[13px] text-[#ba1a1a] underline font-bold">
                                    再試行
                                </button>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {flow.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12 gap-2">
                                    <Mic size={32} className={isListening ? 'text-[#6b5ca5] animate-pulse' : 'text-[#cfc6ea]'} />
                                    <p className="text-[16px] font-bold text-[#3a3350]">
                                        {isListening ? '聞いています' : '生徒情報を読み込み中…'}
                                    </p>
                                    <p className="text-[13px] text-[#484550] max-w-sm leading-relaxed">
                                        授業の会話がここに流れます。困った場面ではASTAが自分から提案を出します。
                                        自分から頼みたい時は下のボタンを押してください。
                                    </p>
                                </div>
                            )}

                            {flow.map(item => (
                                <div key={item.id}>
                                    {/* 誰の言葉かを名前で示す：先生は左・生徒は右（共有画面では「自分＝右」の慣習が通じないため名前を主にする） */}
                                    {item.kind === 'said' && (
                                        <div className="flex flex-col items-start max-w-[85%]">
                                            <div className="flex items-center gap-1.5 mb-1 px-1">
                                                <span className="text-[13px] font-medium text-[#484550]">先生</span>
                                                <span className="text-[12px] text-[#635d70]">{timeOf(item.ts)}</span>
                                            </div>
                                            <div className="bg-[#fbfaff] border border-[#e4ddf0] rounded-2xl rounded-tl-sm p-4 shadow-sm">
                                                <p className={`${toolsOut ? 'text-[20px] leading-[32px]' : 'text-[24px] leading-[38px]'} font-medium text-[#3a3350]`}>{readable(item.text ?? '')}</p>
                                                {item.translation && (
                                                    <p className={`${toolsOut ? 'text-[14px]' : 'text-[18px]'} leading-relaxed text-[#2a6f5a] mt-1.5 border-t border-[#e4ddf0]/50 pt-1.5`}>{item.translation}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {item.kind === 'student-said' && (
                                        <div className="flex flex-col items-end ml-auto max-w-[85%]">
                                            <div className="flex items-center gap-1.5 mb-1 px-1">
                                                <span className="text-[12px] text-[#635d70]">{timeOf(item.ts)}</span>
                                                <span className="text-[13px] font-medium text-[#2a6f5a]">{studentName ? `${studentName}さん` : '生徒'}</span>
                                            </div>
                                            <div className="bg-[#dff1ea] border border-[#bfe3d4] rounded-2xl rounded-tr-sm p-4 shadow-sm">
                                                <p className={`${toolsOut ? 'text-[20px] leading-[32px]' : 'text-[24px] leading-[38px]'} font-medium text-[#3a3350]`}>{item.text}</p>
                                                {item.translation && (
                                                    <p className={`${toolsOut ? 'text-[14px]' : 'text-[18px]'} leading-relaxed text-[#484550] mt-1.5 border-t border-[#bfe3d4]/60 pt-1.5`}>{item.translation}</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {item.kind === 'notice' && (
                                        <div className="mx-auto max-w-[92%] bg-[#fdf6e7] border border-[#ecd9a8] rounded-xl px-4 py-2 text-[13px] text-[#8a6d1f] leading-relaxed">
                                            {item.text}
                                        </div>
                                    )}

                                    {showHints && (item.kind === 'suggest' || item.kind === 'translate-help') && (
                                        <div className="bg-[#fbfaff] border border-[#e4ddf0] border-l-4 border-l-[#6b5ca5] rounded-xl p-4 shadow-sm flex items-start gap-3">
                                            <div className="w-8 h-8 rounded-full bg-[#ede8fa] flex items-center justify-center shrink-0 text-[#6b5ca5] mt-0.5">
                                                <Lightbulb size={16} />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-[12px] font-bold text-[#6b5ca5] tracking-wider">ASTA</span>
                                                    <span className="text-[12px] text-[#635d70]">{item.title}</span>
                                                    <span className="text-[12px] text-[#635d70]">{timeOf(item.ts)}</span>
                                                </div>
                                                <p className="text-[16px] leading-[26px] text-[#3a3350] whitespace-pre-wrap">{readable(item.text ?? '')}</p>
                                            </div>
                                        </div>
                                    )}

                                    {item.kind === 'asked' && (
                                        <div className="w-fit ml-auto max-w-[75%] bg-[#6b5ca5] text-white rounded-2xl rounded-tr-sm px-4 py-2.5">
                                            <p className="text-[15px] leading-relaxed">{readable(item.text ?? '')}</p>
                                            <p className="text-[12px] text-white/85 mt-0.5">あなたの質問 · {timeOf(item.ts)}</p>
                                        </div>
                                    )}

                                    {(item.kind === 'answer' || item.kind === 'material') && (
                                        <div className="bg-white border border-[#e4ddf0] rounded-xl p-5 shadow-sm">
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-2 h-2 rounded-full bg-[#6b5ca5] shrink-0" />
                                                    <h3 className="text-[17px] font-bold text-[#3a3350] truncate">{item.title}</h3>
                                                </div>
                                                <span className="text-[12px] text-[#635d70] shrink-0">{timeOf(item.ts)}</span>
                                            </div>
                                            <div className="bg-[#f8f1ff]/50 p-4 rounded-lg border border-[#e4ddf0]/70">
                                                <p className="text-[16px] leading-[26px] text-[#3a3350] whitespace-pre-wrap">{readable(item.text ?? '')}</p>
                                            </div>
                                        </div>
                                    )}

                                    {item.kind === 'textbook' && (
                                        <div className="bg-white border border-[#e4ddf0] rounded-xl p-5 shadow-sm relative overflow-hidden">
                                            <div className="absolute top-0 right-8 w-6 h-8 bg-[#dff1ea] border-b border-x border-[#bfe3d4] rounded-b-sm" />
                                            <div className="flex items-center gap-2 mb-3 pr-12">
                                                <span className="w-2 h-2 rounded-full bg-[#6b5ca5] shrink-0" />
                                                <h3 className="text-[17px] font-bold text-[#3a3350]">{item.title}</h3>
                                            </div>
                                            {/* 教科書の原文は生徒向け（ふりがな付き）のまま、生徒も読める大きさで */}
                                            <div className="bg-[#f8f1ff]/50 p-4 rounded-lg border border-[#e4ddf0]/70">
                                                <p className={`${toolsOut ? 'text-[16px] leading-[26px]' : 'text-[20px] leading-[34px]'} text-[#3a3350] whitespace-pre-wrap`}>
                                                    {readable((item.text ?? '').split('\n').filter(l => !l.trim().startsWith('![')).join('\n')).trim().slice(0, 1200)}
                                                </p>
                                            </div>
                                            {(item.imgs ?? []).length > 0 && (
                                                <div className="grid grid-cols-2 gap-3 mt-4">
                                                    {(item.imgs ?? []).map((u, i) => (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img key={i} src={u} alt="" className="w-full rounded-lg" />
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {item.kind === 'illust' && (
                                        <div className="bg-white border border-[#e4ddf0] rounded-xl p-5 shadow-sm">
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="w-2 h-2 rounded-full bg-[#6b5ca5] shrink-0" />
                                                    <h3 className="text-[17px] font-bold text-[#3a3350] truncate">{item.title}</h3>
                                                </div>
                                                {item.img && (
                                                    <a href={item.img} download="asta-illustration.png"
                                                        className="inline-flex items-center gap-1 text-[13px] text-[#6b5ca5] hover:underline shrink-0">
                                                        <Download size={13} />保存
                                                    </a>
                                                )}
                                            </div>
                                            {!item.img && (
                                                <div className="flex items-center gap-2 py-4 justify-center text-[#6b5ca5]">
                                                    <Loader2 size={16} className="animate-spin" />
                                                    <span className="text-[13px]">授業を続けながらお待ちください</span>
                                                </div>
                                            )}
                                            {item.img && (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={item.img} alt="生成したイラスト" className="w-full rounded-lg" />
                                            )}
                                            {/* 案C：丁寧版ができたら差し替えを提案 */}
                                            {item.img && item.imgQuality && (
                                                <button
                                                    onClick={() => patchFlow(item.id, { img: item.imgQuality, imgQuality: undefined })}
                                                    className="w-full mt-2 text-left text-[13px] bg-[#fdf6e7] border border-[#ecd9a8] text-[#8a6d1f] rounded-lg px-3 py-2 hover:bg-[#fbefd2] transition-colors"
                                                >
                                                    <b className="text-[#6b5ca5]">文字まできれいな版</b>ができました → 押すと差し替えます
                                                </button>
                                            )}
                                            {item.img && !item.imgQuality && item.title?.includes('できた絵') && (
                                                <p className="text-[12px] text-[#484550] mt-2">
                                                    ※ AIが作った画像です。文字が正しいか目で確かめてから生徒さんに見せてください。
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* 認識途中の文字（うすく表示） */}
                            {interimText && (
                                <p className="text-[13px] text-[#635d70] italic px-1">{interimText}…</p>
                            )}
                            {showHints && (isAnalyzing || streamingText) && (
                                <div className="bg-[#fbfaff] border border-[#e4ddf0] border-l-4 border-l-[#6b5ca5] rounded-xl p-4 shadow-sm">
                                    <p className="text-[12px] font-bold text-[#6b5ca5] mb-1 flex items-center gap-1">
                                        <Sparkles size={12} /> ASTAが考えています…
                                    </p>
                                    {streamingText && (
                                        <p className="text-[15px] text-[#3a3350] whitespace-pre-wrap leading-relaxed">{streamingText}</p>
                                    )}
                                </div>
                            )}
                            <div ref={flowEndRef} />
                        </div>

                        {/* 下：自分から頼む4ボタン＋聞きたい時の入力欄（共有モードでは小さくし、入力欄はしまう） */}
                        <div className={`bg-[#fbfaff] border-t border-[#e4ddf0] shrink-0 flex flex-col gap-3 ${toolsOut ? 'p-4' : 'px-4 py-2'}`}>
                            {illustError && (
                                <p className="text-[13px] text-[#ba1a1a] bg-[#fff0f0] border border-[#f4b8b8] rounded-lg px-3 py-1.5">
                                    {illustError}
                                </p>
                            )}
                            <div className="grid grid-cols-4 gap-3">
                                {ASK_BUTTONS.map(b => {
                                    const Icon = b.Icon;
                                    return (
                                        <button
                                            key={b.key}
                                            onClick={b.onClick}
                                            disabled={b.disabled}
                                            title={b.tip}
                                            className={`group flex items-center gap-3 bg-white hover:bg-[#f8f1ff] border border-[#e4ddf0] rounded-xl text-left transition-colors shadow-sm active:scale-[0.99] disabled:opacity-50 ${toolsOut ? 'p-3' : 'px-3 py-1.5'}`}
                                        >
                                            <span className={`${toolsOut ? 'w-10 h-10' : 'w-8 h-8'} rounded-lg flex items-center justify-center shrink-0 transition-colors group-hover:text-white ${b.tile}`}>
                                                {b.busy ? <Loader2 size={18} className="animate-spin" /> : <Icon size={20} strokeWidth={1.8} />}
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[16px] font-bold text-[#3a3350]">{b.title}</span>
                                                {toolsOut && <span className="block text-[12px] text-[#5d5868] truncate">{b.hint}</span>}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>

                            {/* 聞きたい時だけ使う入力欄。授業中の入力は不要だが、
                                聞きたくなったらここで聞ける（2026-08-20 チャットタブを統合） */}
                            <form onSubmit={handleSendMessage} className={`${toolsOut ? 'flex' : 'hidden'} items-center gap-2`}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    placeholder="聞きたいことがあれば（画面共有中は生徒にも見えます）"
                                    className="flex-1 min-w-0 bg-[#f6f3fb] border border-[#e4ddf0] rounded-lg px-4 py-2.5 text-[15px] text-[#3a3350] placeholder:text-[#635d70] focus:outline-none focus:border-[#6b5ca5] focus:ring-1 focus:ring-[#6b5ca5]"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim() || isTyping}
                                    className="px-6 py-2.5 bg-[#6b5ca5] hover:bg-[#55488a] text-white text-[15px] font-medium rounded-lg shadow-sm transition-colors flex items-center gap-1.5 active:scale-[0.98] disabled:opacity-40 shrink-0"
                                >
                                    {isTyping ? <Loader2 size={15} className="animate-spin" /> : null}
                                    <span>送信</span>
                                    {!isTyping && <Send size={15} />}
                                </button>
                            </form>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
