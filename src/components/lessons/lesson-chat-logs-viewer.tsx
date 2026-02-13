'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MessageCircle, Sparkles, User, Clock } from 'lucide-react';

type ChatLog = {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    created_at: string;
};

export function LessonChatLogsViewer({ lessonId }: { lessonId: string | null }) {
    const [logs, setLogs] = useState<ChatLog[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!lessonId) return;

        const fetchLogs = async () => {
            setLoading(true);
            const supabase = createClient();
            const { data, error } = await supabase
                .from('lesson_chat_logs')
                .select('*')
                .eq('lesson_id', lessonId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching chat logs:', error);
            } else {
                setLogs(data as ChatLog[]);
            }
            setLoading(false);
        };

        fetchLogs();
    }, [lessonId]);

    if (!lessonId) return null;
    if (loading) return <div className="text-sm text-slate-400 py-4 text-center">ログを読み込み中...</div>;
    if (logs.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 mt-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <MessageCircle size={20} className="text-teal-600" />
                Liveレッスン中のチャット履歴
            </h2>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                {logs.map((log) => (
                    <div key={log.id} className={`flex flex-col ${log.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm relative ${log.role === 'user'
                                ? 'bg-teal-50 text-teal-900 rounded-tr-none border border-teal-100'
                                : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200'
                            }`}>
                            <div className="flex items-center gap-2 mb-1 opacity-70">
                                {log.role === 'user' ? (
                                    <>
                                        <span className="text-xs">先生</span>
                                        <User size={12} />
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={12} />
                                        <span className="text-xs">AI Assistant</span>
                                    </>
                                )}
                            </div>
                            <p className="whitespace-pre-wrap leading-relaxed">{log.content}</p>
                            <p className="text-[10px] text-right mt-1 opacity-50">
                                {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
