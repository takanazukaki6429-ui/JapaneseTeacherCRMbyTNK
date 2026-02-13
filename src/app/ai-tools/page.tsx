"use client";

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Copy, Check } from "lucide-react";

export default function AIToolsPage() {
    const [prompt, setPrompt] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prompt.trim()) return;

        setLoading(true);
        setResponse(''); // Clear previous response
        try {
            const res = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.details || data.error || 'Failed to generate content');
            }

            setResponse(data.text);
        } catch (error) {
            console.error('Error:', error);
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

    const tools = [
        { id: 'chat', name: 'AIアシスタント', icon: Sparkles, desc: '自由に質問や相談ができます' },
        // Future tools can be added here
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto p-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-teal-100 rounded-xl">
                    <Sparkles className="w-8 h-8 text-teal-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">AIツール (Beta)</h1>
                    <p className="text-slate-500">授業準備や生徒へのフィードバック作成をサポートします</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Tools Sidebar (Placeholder for now) */}
                <div className="space-y-4">
                    <Card className="bg-teal-50 border-teal-200">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-teal-900">利用可能なツール</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {tools.map((tool) => (
                                <button
                                    key={tool.id}
                                    className="w-full flex items-center gap-3 p-3 bg-white rounded-lg border border-teal-100 shadow-sm text-left hover:bg-teal-50 transition-colors"
                                >
                                    <tool.icon className="w-4 h-4 text-teal-600" />
                                    <div>
                                        <p className="font-medium text-sm text-slate-900">{tool.name}</p>
                                        <p className="text-xs text-slate-500">{tool.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">使用のヒント</h3>
                            <ul className="text-sm text-slate-600 space-y-2 list-disc pl-4">
                                <li>「N3文法の例文を3つ作って」</li>
                                <li>「この文章を自然な日本語に直して」</li>
                                <li>「日本のアニメについて簡単な説明文を書いて」</li>
                            </ul>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Chat Area */}
                <div className="md:col-span-2 space-y-6">
                    <Card className="min-h-[500px] flex flex-col">
                        <CardContent className="flex-1 p-6 flex flex-col gap-4">
                            {/* Input Area */}
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Textarea
                                    placeholder="ここに依頼内容を入力してください..."
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    className="resize-none h-32 text-base"
                                    disabled={loading}
                                />
                                <div className="flex justify-end">
                                    <Button type="submit" disabled={loading || !prompt.trim()}>
                                        {loading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                生成中...
                                            </>
                                        ) : (
                                            <>
                                                <Send className="mr-2 h-4 w-4" />
                                                送信する
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </form>

                            {/* Response Area */}
                            {response && (
                                <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-2">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-teal-500" />
                                            AIからの回答
                                        </h3>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={handleCopy}
                                            className="text-slate-500"
                                        >
                                            {copied ? (
                                                <Check className="w-4 h-4 text-green-500 mr-1" />
                                            ) : (
                                                <Copy className="w-4 h-4 mr-1" />
                                            )}
                                            {copied ? 'コピー完了' : 'コピー'}
                                        </Button>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-lg text-slate-800 whitespace-pre-wrap leading-relaxed border border-slate-200">
                                        {response}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
