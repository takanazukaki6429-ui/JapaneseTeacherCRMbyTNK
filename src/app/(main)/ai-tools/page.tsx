"use client";

import { useState } from 'react';
import { Sparkles, Send, Loader2, Copy, Check, Save, X } from "lucide-react";
import { createClient } from '@/lib/supabase/client';

export default function AIToolsPage() {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveTitle, setSaveTitle] = useState('');
    const [savingLoading, setSavingLoading] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        setLoading(true);
        setResponse('');
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.details || data.error || 'Failed');
            setResponse(data.text);
        } catch (error) {
            setResponse(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(response);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        if (!saveTitle.trim() || !response) return;
        setSavingLoading(true);
        try {
            const { error } = await supabase.from('materials').insert([{
                title: saveTitle,
                content: response,
                type: 'content',
                is_public: false,
                tags: ['AI生成'],
            }]);
            if (error) throw error;
            setSaveSuccess(true);
            setTimeout(() => { setIsSaving(false); setSaveTitle(''); setSaveSuccess(false); }, 1500);
        } catch (error) {
            console.error('Error saving material:', error);
        } finally {
            setSavingLoading(false);
        }
    };

    const hints = [
        'N3文法の例文を3つ作って',
        'この文章を自然な日本語に直して',
        '日本のアニメについて簡単な説明文を書いて',
        '〜ている と 〜てある の違いを説明して',
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-5 pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">AIツール</h1>
                <p className="text-sm text-[#4b454e] mt-0.5">授業準備・例文作成・フィードバック文章など自由に依頼できます</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* サイドバー */}
                <div className="space-y-4">
                    <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] overflow-hidden">
                        <div className="px-4 py-3 bg-[#f4f3f7] flex items-center gap-2">
                            <Sparkles size={14} className="text-[#6f5385]" />
                            <p className="text-xs font-bold text-[#1a1c1e]">使い方のヒント</p>
                        </div>
                        <div className="p-4 space-y-2">
                            {hints.map((h, i) => (
                                <button
                                    key={i}
                                    onClick={() => setPrompt(h)}
                                    className="w-full text-left text-xs text-[#4b454e] bg-[#f4f3f7] hover:bg-[#f2daff] hover:text-[#6f5385] px-3 py-2 rounded-xl transition-colors leading-relaxed"
                                >
                                    「{h}」
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* メインエリア */}
                <div className="md:col-span-2 space-y-4">
                    <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] overflow-hidden">
                        <div className="px-5 py-3.5 bg-[#f4f3f7] flex items-center gap-2">
                            <Sparkles size={14} className="text-[#6f5385]" />
                            <h2 className="font-bold text-sm text-[#1a1c1e]">AIアシスタント</h2>
                        </div>
                        <div className="p-5 space-y-4">
                            <form onSubmit={handleSubmit} className="space-y-3">
                                <textarea
                                    placeholder="ここに依頼内容を入力してください..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    disabled={loading}
                                    rows={5}
                                    className="w-full text-sm px-4 py-3 rounded-xl border border-[#c9a8e0]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a8e0] bg-[#f4f3f7] resize-none placeholder:text-[#4b454e]/50"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading || !prompt.trim()}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold text-sm rounded-full hover:scale-[1.02] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                                    >
                                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                                        {loading ? '生成中...' : '送信する'}
                                    </button>
                                </div>
                            </form>

                            {response && (
                                <div className="border-t border-[#f4f3f7] pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-bold text-[#6f5385] flex items-center gap-1.5">
                                            <Sparkles size={12} />
                                            AIからの回答
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setIsSaving(v => !v)}
                                                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-[#f4f3f7] text-[#4b454e] rounded-lg hover:bg-[#f2daff] hover:text-[#6f5385] transition-colors"
                                            >
                                                <Save size={11} />
                                                保存
                                            </button>
                                            <button
                                                onClick={handleCopy}
                                                className="inline-flex items-center gap-1 text-xs px-3 py-1.5 bg-[#f4f3f7] text-[#4b454e] rounded-lg hover:bg-[#f2daff] hover:text-[#6f5385] transition-colors"
                                            >
                                                {copied ? <Check size={11} className="text-green-600" /> : <Copy size={11} />}
                                                {copied ? 'コピー済み' : 'コピー'}
                                            </button>
                                        </div>
                                    </div>

                                    {isSaving && (
                                        <div className="bg-[#f4f3f7] rounded-2xl p-4 space-y-2">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    placeholder="教材タイトル（例: N3文法例文）"
                                                    value={saveTitle}
                                                    onChange={e => setSaveTitle(e.target.value)}
                                                    className="flex-1 text-sm px-3 py-2 rounded-xl border border-[#c9a8e0]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a8e0] bg-white"
                                                />
                                                <button
                                                    onClick={handleSave}
                                                    disabled={savingLoading || !saveTitle.trim() || saveSuccess}
                                                    className="text-xs px-4 py-2 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold rounded-xl hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-1"
                                                >
                                                    {savingLoading ? <Loader2 size={11} className="animate-spin" /> : saveSuccess ? <Check size={11} /> : null}
                                                    {saveSuccess ? '保存済み' : '保存する'}
                                                </button>
                                                <button onClick={() => setIsSaving(false)} className="p-2 text-[#4b454e]/60 hover:text-[#4b454e] transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                            <p className="text-xs text-[#4b454e]/60">「教材・資産管理」ページに保存されます</p>
                                        </div>
                                    )}

                                    <div className="bg-[#f4f3f7] rounded-2xl p-4 text-sm text-[#1a1c1e] whitespace-pre-wrap leading-relaxed">
                                        {response}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
