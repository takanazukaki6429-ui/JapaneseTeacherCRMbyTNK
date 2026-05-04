'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, Database, Loader2, Download, Eye, EyeOff } from 'lucide-react';

function toCSV(rows: Record<string, unknown>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const escape = (v: unknown) => {
        const s = v == null ? '' : String(v);
        return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

function downloadCSV(csv: string, filename: string) {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

export default function SettingsPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);

    // パスワード変更
    const [pwOpen, setPwOpen] = useState(false);
    const [pwCurrent, setPwCurrent] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);
    const [showPw, setShowPw] = useState(false);

    useEffect(() => {
        supabase.auth.getUser().finally(() => setLoading(false));
    }, [supabase.auth]);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError('');
        if (pwNew.length < 8) { setPwError('新しいパスワードは8文字以上にしてください'); return; }
        if (pwNew !== pwConfirm) { setPwError('新しいパスワードが一致しません'); return; }
        setPwLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({ password: pwNew });
            if (error) throw error;
            setPwSuccess(true);
            setTimeout(() => { setPwOpen(false); setPwSuccess(false); setPwCurrent(''); setPwNew(''); setPwConfirm(''); }, 1500);
        } catch (err) {
            setPwError(err instanceof Error ? err.message : 'パスワードの変更に失敗しました');
        } finally {
            setPwLoading(false);
        }
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [{ data: students }, { data: lessons }] = await Promise.all([
                supabase.from('students').select('id, name, jlpt_level, goal_text, textbook, current_phase, memo, created_at').eq('user_id', user.id).order('created_at', { ascending: false }),
                supabase.from('lessons').select('id, student_id, date, topics, vocabulary, mistakes, understanding_level, homework, next_goal, content, status, created_at').order('date', { ascending: false }),
            ]);

            const date = new Date().toISOString().slice(0, 10);
            if (students?.length) downloadCSV(toCSV(students as Record<string, unknown>[]), `asta_students_${date}.csv`);
            if (lessons?.length) downloadCSV(toCSV(lessons as Record<string, unknown>[]), `asta_lessons_${date}.csv`);
        } catch (e) {
            console.error(e);
            alert('エクスポートに失敗しました');
        } finally {
            setExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="animate-spin text-[#6f5385]" size={28} />
            </div>
        );
    }

    const SectionCard = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
        <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#f4f3f7] flex items-center gap-2.5">
                {icon}
                <h2 className="font-bold text-sm text-[#1a1c1e]">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );

    const RowItem = ({ label, desc, action }: { label: string; desc: string; action: React.ReactNode }) => (
        <div className="flex items-center justify-between py-3 border-b border-[#f4f3f7] last:border-0">
            <div>
                <p className="text-sm font-semibold text-[#1a1c1e]">{label}</p>
                <p className="text-xs text-[#4b454e] mt-0.5">{desc}</p>
            </div>
            {action}
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto space-y-5 pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">設定</h1>
                <p className="text-sm text-[#4b454e] mt-0.5">アプリケーションの各種設定を行います</p>
            </div>

            <SectionCard icon={<User size={16} className="text-[#6f5385]" />} title="アカウント設定">
                <RowItem label="パスワード変更" desc="ログインパスワードの更新"
                    action={<button onClick={() => { setPwOpen(true); setPwError(''); setPwSuccess(false); }} className="text-xs bg-[#f4f3f7] text-[#4b454e] px-3 py-1.5 rounded-lg hover:bg-[#f2daff] hover:text-[#6f5385] transition-colors">変更</button>} />

                {pwOpen && (
                    <div className="mt-4 bg-[#f4f3f7] rounded-2xl p-5">
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="新しいパスワード（8文字以上）"
                                    value={pwNew}
                                    onChange={e => setPwNew(e.target.value)}
                                    className="w-full text-sm px-3 py-2.5 pr-10 rounded-xl border border-[#c9a8e0]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a8e0] bg-white"
                                    required
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4b454e]/60">
                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <input
                                type={showPw ? 'text' : 'password'}
                                placeholder="新しいパスワード（確認）"
                                value={pwConfirm}
                                onChange={e => setPwConfirm(e.target.value)}
                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#c9a8e0]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a8e0] bg-white"
                                required
                            />
                            {pwError && <p className="text-xs text-[#ba1a1a]">{pwError}</p>}
                            {pwSuccess && <p className="text-xs text-green-600 font-semibold">パスワードを変更しました</p>}
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setPwOpen(false)} className="text-xs px-4 py-2 rounded-xl bg-white text-[#4b454e] border border-[#c9a8e0]/30 hover:bg-[#f2daff] transition-colors">キャンセル</button>
                                <button type="submit" disabled={pwLoading || pwSuccess} className="text-xs px-4 py-2 rounded-xl bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-1.5">
                                    {pwLoading && <Loader2 size={12} className="animate-spin" />}
                                    {pwLoading ? '変更中...' : '変更する'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </SectionCard>

            <SectionCard icon={<Database size={16} className="text-[#655a6f]" />} title="データ管理">
                <RowItem
                    label="データのエクスポート"
                    desc="生徒データ・レッスン記録を2つのCSVファイルでダウンロード"
                    action={
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="inline-flex items-center gap-1.5 text-xs bg-[#f4f3f7] text-[#4b454e] px-3 py-1.5 rounded-lg hover:bg-[#f2daff] hover:text-[#6f5385] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                            {exporting ? '処理中...' : 'ダウンロード'}
                        </button>
                    }
                />
            </SectionCard>
        </div>
    );
}
