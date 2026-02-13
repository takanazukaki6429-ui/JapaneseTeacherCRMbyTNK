'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Sparkles, Database, Save, Loader2, Coins } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // User Settings State
    const [userId, setUserId] = useState<string | null>(null);
    const [lessonPrice, setLessonPrice] = useState<number>(3000);
    const [aiModel, setAiModel] = useState<string>('gemini-1.5-flash');

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            setUserId(user.id);

            const { data, error } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setLessonPrice(data.default_lesson_price || 3000);
                setAiModel(data.ai_model || 'gemini-1.5-flash');
            } else if (!error || error.code === 'PGRST116') {
                // No settings found, use defaults
                console.log('No settings found, using defaults');
            } else {
                console.error('Error fetching settings:', error);
            }
        } catch (error) {
            console.error('Error in fetchSettings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!userId) return;
        setSaving(true);

        try {
            const { error } = await supabase
                .from('user_settings')
                .upsert({
                    user_id: userId,
                    default_lesson_price: lessonPrice,
                    ai_model: aiModel,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            // Simple alert for now as sonner might not be fully set up in layout
            alert('設定を保存しました');

        } catch (error) {
            console.error('Error saving settings:', error);
            alert('保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="animate-spin text-teal-600" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">設定</h1>
                <p className="text-slate-500 text-sm mt-1">アプリケーションの各種設定を行います</p>
            </div>

            <div className="grid gap-6">
                {/* 1. Account Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <User className="text-slate-500" size={18} />
                        <h2 className="font-bold text-slate-700">アカウント設定</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <div>
                                <p className="text-sm font-medium text-slate-800">プロフィール情報</p>
                                <p className="text-xs text-slate-500">Supabase Authで管理されています</p>
                            </div>
                            <button disabled className="text-xs bg-slate-100 text-slate-400 px-3 py-1.5 rounded-lg cursor-not-allowed">変更不可</button>
                        </div>
                        {/* Restored Mock Item */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <div>
                                <p className="text-sm font-medium text-slate-800">パスワード変更</p>
                                <p className="text-xs text-slate-500">ログインパスワードの更新</p>
                            </div>
                            <button className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">変更</button>
                        </div>
                    </div>
                </div>

                {/* 2. Business Settings (New) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Coins className="text-yellow-500" size={18} />
                        <h2 className="font-bold text-slate-700">ビジネス設定</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="price" className="block text-sm font-medium text-slate-800 mb-2">
                                レッスン単価 (概算用)
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 font-bold">¥</span>
                                <input
                                    type="number"
                                    id="price"
                                    value={lessonPrice}
                                    onChange={(e) => setLessonPrice(Number(e.target.value))}
                                    className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                                />
                                <span className="text-sm text-slate-500">/ 1レッスン</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                ダッシュボードの概算売上計算に使用されます。実際の各レッスン料金を変更するものではありません。
                            </p>
                        </div>
                    </div>
                </div>

                {/* 3. AI Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Sparkles className="text-purple-500" size={18} />
                        <h2 className="font-bold text-slate-700">AI・プロンプト設定</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Restored Mock Item */}
                        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <div>
                                <p className="text-sm font-medium text-slate-800">デフォルトプロンプトの調整</p>
                                <p className="text-xs text-slate-500">フィードバック生成時の「教師のトーン」などをカスタム</p>
                            </div>
                            <button className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition-colors">設定</button>
                        </div>

                        <label className="block text-sm font-medium text-slate-800 mb-2">
                            使用モデル (Plan: Pro / Standard / Free)
                        </label>
                        <div className="space-y-3">
                            {/* Gemini 3.0 Flash (Pro Plan) - Disabled */}
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-not-allowed opacity-60">
                                <input
                                    type="radio"
                                    name="ai_model"
                                    value="gemini-3.0-flash"
                                    checked={aiModel === 'gemini-3.0-flash'}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="mt-1"
                                    disabled
                                />
                                <div>
                                    <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        Gemini 3 Flash
                                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold shadow-sm">Pro Plan</span>
                                        <span className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold">Latest</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">2026年現在の最強モデル。圧倒的な速度と推論能力。</p>
                                </div>
                            </label>

                            {/* Gemini 2.5 Flash (Standard Plan) - Disabled */}
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-not-allowed opacity-60">
                                <input
                                    type="radio"
                                    name="ai_model"
                                    value="gemini-2.5-flash"
                                    checked={aiModel === 'gemini-2.5-flash'}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="mt-1"
                                    disabled
                                />
                                <div>
                                    <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        Gemini 2.5 Flash
                                        <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold shadow-sm">Standard</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">日常業務に最適なバランスの良いモデル。</p>
                                </div>
                            </label>

                            {/* Gemini 2.0 Flash Legacy/Preview - Disabled */}
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-not-allowed opacity-60">
                                <input
                                    type="radio"
                                    name="ai_model"
                                    value="gemini-2.0-flash-exp"
                                    checked={aiModel === 'gemini-2.0-flash-exp'}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="mt-1"
                                    disabled
                                />
                                <div>
                                    <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        Gemini 2.0 Flash (Preview)
                                        <span className="bg-slate-100 text-slate-600 text-[10px] px-1.5 py-0.5 rounded-full uppercase border border-slate-200">Experimental</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">次世代機能のプレビュー版。</p>
                                </div>
                            </label>

                            {/* Gemini 1.5 Pro (Pro Plan) - Disabled */}
                            <label className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50 cursor-not-allowed opacity-60">
                                <input
                                    type="radio"
                                    name="ai_model"
                                    value="gemini-1.5-pro"
                                    checked={aiModel === 'gemini-1.5-pro'}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="mt-1"
                                    disabled
                                />
                                <div>
                                    <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        Gemini 1.5 Pro
                                        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold shadow-sm">Pro Plan</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">複雑な推論が可能な高品質モデル。</p>
                                </div>
                            </label>

                            {/* Gemini 1.5 Flash (Free Plan) */}
                            <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${aiModel === 'gemini-1.5-flash'
                                ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500'
                                : 'border-slate-200 hover:bg-slate-50'
                                }`}>
                                <input
                                    type="radio"
                                    name="ai_model"
                                    value="gemini-1.5-flash"
                                    checked={aiModel === 'gemini-1.5-flash'}
                                    onChange={(e) => setAiModel(e.target.value)}
                                    className="mt-1"
                                />
                                <div>
                                    <p className="font-bold text-sm text-slate-800 flex items-center gap-2">
                                        Gemini 1.5 Flash
                                        <span className="bg-teal-500 text-white text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold shadow-sm">Free Data</span>
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">軽量・高速な基本モデル。コストを抑えたい場合に。</p>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                {/* 4. Data Management (Restored) */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <Database className="text-blue-500" size={18} />
                        <h2 className="font-bold text-slate-700">データ管理</h2>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                            <div>
                                <p className="text-sm font-medium text-slate-800">データのエクスポート</p>
                                <p className="text-xs text-slate-500">生徒データ・レッスン記録をCSVでダウンロード</p>
                            </div>
                            <button className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">ダウンロード</button>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        設定を保存する
                    </button>
                </div>
            </div>
        </div>
    );
}
