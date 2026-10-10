'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { User, Database, Loader2, Download, Eye, EyeOff, AlertTriangle, Trash2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { MfaSection } from '@/components/settings/mfa-section';
import { checkPasswordStrength } from '@/lib/password-policy';
import { todayJst } from '@/lib/course';
import { DISPLAY_NAME_EVENT, DISPLAY_NAME_MAX, normalizeDisplayName } from '@/lib/display-name';

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

/**
 * 設定の画面の枠と行（2026-10-10：画面の外に出した）。
 * 前は画面の中で作っていたので、文字を1つ入れる・消すたびに作り直され、入力欄から文字を入れる場所が外れていた
 * （表示名・パスワードの欄で、1文字ずつしか操作できなかった）
 */
function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
    return (
        <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] overflow-hidden">
            <div className="px-5 py-3.5 bg-[#f0ebf8] flex items-center gap-2.5">
                {icon}
                <h2 className="font-bold text-sm text-[#3a3350]">{title}</h2>
            </div>
            <div className="p-6">{children}</div>
        </div>
    );
}

function RowItem({ label, desc, action }: { label: string; desc: string; action: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-[#f0ebf8] last:border-0">
            <div>
                <p className="text-sm font-semibold text-[#3a3350]">{label}</p>
                <p className="text-xs text-[#484550] mt-0.5">{desc}</p>
            </div>
            {action}
        </div>
    );
}

export default function SettingsPage() {
    const supabase = createClient();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    // 管理者の画面から「二段階認証が必要」で案内されてきたか（2026-09-30・門番が ?mfa=required を付ける）
    const [mfaRequired, setMfaRequired] = useState(false);
    useEffect(() => {
        setMfaRequired(new URLSearchParams(window.location.search).get('mfa') === 'required');
    }, []);

    // 表示名（2026-10-09 かずき決定：最初の登録画面の「後から設定画面でいつでも変更できます」のとおりにする）
    const [displayName, setDisplayName] = useState('');
    const [nameOpen, setNameOpen] = useState(false);
    const [nameDraft, setNameDraft] = useState('');
    const [nameSaving, setNameSaving] = useState(false);
    const [nameError, setNameError] = useState('');

    // パスワード変更
    const [pwOpen, setPwOpen] = useState(false);
    const [pwCurrent, setPwCurrent] = useState('');
    const [pwNew, setPwNew] = useState('');
    const [pwConfirm, setPwConfirm] = useState('');
    const [pwLoading, setPwLoading] = useState(false);
    const [pwError, setPwError] = useState('');
    const [pwSuccess, setPwSuccess] = useState(false);
    const [showPw, setShowPw] = useState(false);

    // アカウント削除（v1.0 §4.16 個人情報削除機能）
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [deleteError, setDeleteError] = useState('');

    const handleAccountDelete = async () => {
        setDeleteError('');
        setDeleteLoading(true);
        try {
            const res = await fetch('/api/account/delete', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) {
                setDeleteError(data.error || 'アカウントの削除に失敗しました');
                return;
            }
            alert('アカウントを削除しました。ご利用ありがとうございました。');
            router.push('/login');
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : '通信エラーが発生しました');
        } finally {
            setDeleteLoading(false);
        }
    };

    useEffect(() => {
        const load = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('user_settings').select('display_name').eq('user_id', user.id).maybeSingle();
                setDisplayName((data?.display_name as string | null) ?? '');
            }
        };
        load().finally(() => setLoading(false));
    }, [supabase]);

    const handleNameSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setNameError('');
        const name = normalizeDisplayName(nameDraft);
        if (!name) { setNameError(`表示名を1〜${DISPLAY_NAME_MAX}文字で入れてください`); return; }
        setNameSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('ログインし直してから、もう一度お試しください');
            const { error } = await supabase.from('user_settings').update({ display_name: name }).eq('user_id', user.id);
            if (error) throw error;
            setDisplayName(name);
            setNameOpen(false);
            // 左の並びの先生の名前も、その場で変える
            window.dispatchEvent(new CustomEvent(DISPLAY_NAME_EVENT, { detail: name }));
        } catch (err) {
            setNameError(err instanceof Error ? err.message : '表示名を保存できませんでした');
        } finally {
            setNameSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError('');
        // 登録・再設定の時と同じ決まり（8文字以上・英大文字・英小文字・数字・記号のうち3種類以上 など）で確かめる（2026-10-09）
        const strength = checkPasswordStrength(pwNew);
        if (!strength.valid) { setPwError(strength.errors[0] ?? 'このパスワードは使えません'); return; }
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

            const date = todayJst();   // ファイル名の日付は日本時間（世界標準時だと朝9時より前は前日になっていた）
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
                <Loader2 className="animate-spin text-[#6b5ca5]" size={28} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto space-y-5 pb-12">
            <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#3a3350]">設定</h1>
                <p className="text-sm text-[#484550] mt-0.5">アプリケーションの各種設定を行います</p>
            </div>

            {mfaRequired && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    <p>管理者の画面を使うには、二段階認証が必要です。下の「二段階認証」を有効にしてから、もう一度開いてください。</p>
                </div>
            )}

            <SectionCard icon={<User size={16} className="text-[#6b5ca5]" />} title="アカウント設定">
                <RowItem label="表示名" desc={displayName ? `${displayName}（ホームの見出しと左の並びに出ます）` : 'ホームの見出しと左の並びに出ます'}
                    action={<button onClick={() => { setNameDraft(displayName); setNameError(''); setNameOpen(true); }} className="text-xs bg-[#f0ebf8] text-[#484550] px-3 py-1.5 rounded-lg hover:bg-[#efe9ff] hover:text-[#6b5ca5] transition-colors">変更</button>} />
                {nameOpen && (
                    <div className="my-3 bg-[#f0ebf8] rounded-2xl p-5">
                        <form onSubmit={handleNameSave} className="space-y-3">
                            <input
                                type="text"
                                value={nameDraft}
                                onChange={e => setNameDraft(e.target.value)}
                                maxLength={DISPLAY_NAME_MAX}
                                placeholder="例: 田中 太郎"
                                aria-label="表示名"
                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#ccbeff]/40 focus:outline-none focus:ring-2 focus:ring-[#ccbeff] bg-white"
                                required
                            />
                            {nameError && <p className="text-xs text-[#ba1a1a]">{nameError}</p>}
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setNameOpen(false)} className="text-xs px-4 py-2 rounded-xl bg-white text-[#484550] border border-[#ccbeff]/30 hover:bg-[#efe9ff] transition-colors">キャンセル</button>
                                <button type="submit" disabled={nameSaving} className="text-xs px-4 py-2 rounded-xl bg-[#6b5ca5] text-white font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-1.5">
                                    {nameSaving && <Loader2 size={12} className="animate-spin" />}
                                    {nameSaving ? '保存中...' : '保存する'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                <MfaSection />
                <RowItem label="パスワード変更" desc="ログインパスワードの更新"
                    action={<button onClick={() => { setPwOpen(true); setPwError(''); setPwSuccess(false); }} className="text-xs bg-[#f0ebf8] text-[#484550] px-3 py-1.5 rounded-lg hover:bg-[#efe9ff] hover:text-[#6b5ca5] transition-colors">変更</button>} />

                {pwOpen && (
                    <div className="mt-4 bg-[#f0ebf8] rounded-2xl p-5">
                        <form onSubmit={handlePasswordChange} className="space-y-3">
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    placeholder="新しいパスワード（8文字以上・3種類以上の文字）"
                                    value={pwNew}
                                    onChange={e => setPwNew(e.target.value)}
                                    className="w-full text-sm px-3 py-2.5 pr-10 rounded-xl border border-[#ccbeff]/40 focus:outline-none focus:ring-2 focus:ring-[#ccbeff] bg-white"
                                    required
                                />
                                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#484550]/60">
                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                            <input
                                type={showPw ? 'text' : 'password'}
                                placeholder="新しいパスワード（確認）"
                                value={pwConfirm}
                                onChange={e => setPwConfirm(e.target.value)}
                                className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#ccbeff]/40 focus:outline-none focus:ring-2 focus:ring-[#ccbeff] bg-white"
                                required
                            />
                            {pwError && <p className="text-xs text-[#ba1a1a]">{pwError}</p>}
                            {pwSuccess && <p className="text-xs text-green-600 font-semibold">パスワードを変更しました</p>}
                            <div className="flex gap-2 pt-1">
                                <button type="button" onClick={() => setPwOpen(false)} className="text-xs px-4 py-2 rounded-xl bg-white text-[#484550] border border-[#ccbeff]/30 hover:bg-[#efe9ff] transition-colors">キャンセル</button>
                                <button type="submit" disabled={pwLoading || pwSuccess} className="text-xs px-4 py-2 rounded-xl bg-[#6b5ca5] text-white font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-1.5">
                                    {pwLoading && <Loader2 size={12} className="animate-spin" />}
                                    {pwLoading ? '変更中...' : '変更する'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </SectionCard>

            <SectionCard icon={<Database size={16} className="text-[#2a6f5a]" />} title="データ管理">
                <RowItem
                    label="データのエクスポート"
                    desc="生徒データ・レッスン記録を2つのCSVファイルでダウンロード"
                    action={
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="inline-flex items-center gap-1.5 text-xs bg-[#f0ebf8] text-[#484550] px-3 py-1.5 rounded-lg hover:bg-[#efe9ff] hover:text-[#6b5ca5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                            {exporting ? '処理中...' : 'ダウンロード'}
                        </button>
                    }
                />
            </SectionCard>

            {/* 左のナビから外した「プラン」の入口（2026-09-11 ナビを4つにした） */}
            <SectionCard icon={<CreditCard size={16} className="text-[#6b5ca5]" />} title="プランとお支払い">
                <RowItem
                    label="プランとお支払い"
                    desc="ご利用中のプランの確認・お支払い方法の変更"
                    action={<Link href="/settings/billing" className="text-xs bg-[#f0ebf8] text-[#484550] px-3 py-1.5 rounded-lg hover:bg-[#efe9ff] hover:text-[#6b5ca5] transition-colors">開く</Link>}
                />
            </SectionCard>

            {/* 危険ゾーン: アカウント削除 */}
            <SectionCard icon={<AlertTriangle size={16} className="text-[#ba1a1a]" />} title="危険な操作">
                <RowItem
                    label="アカウントを削除"
                    desc="すべての生徒情報・レッスン記録・テキストデータが削除されます。元に戻せません。契約中・お試し中の契約も、その場で止まります"
                    action={
                        <button
                            onClick={() => { setDeleteOpen(true); setDeleteError(''); setDeleteConfirm(''); }}
                            className="inline-flex items-center gap-1.5 text-xs bg-[#fff0f0] text-[#ba1a1a] px-3 py-1.5 rounded-lg hover:bg-[#ffe0e0] transition-colors border border-[#f4b8b8]"
                        >
                            <Trash2 size={12} />
                            削除する
                        </button>
                    }
                />

                {deleteOpen && (
                    <div className="mt-4 bg-[#fff0f0] border border-[#f4b8b8] rounded-2xl p-5">
                        <p className="text-sm font-bold text-[#ba1a1a] mb-2">本当に削除しますか？</p>
                        <p className="text-xs text-[#ba1a1a]/80 mb-3 leading-relaxed">
                            この操作は<strong>元に戻せません</strong>。以下のデータがすべて削除されます：
                        </p>
                        <ul className="text-xs text-[#ba1a1a]/80 mb-4 list-disc pl-5 space-y-0.5">
                            <li>登録生徒のすべての情報</li>
                            <li>レッスン記録・宿題履歴</li>
                            <li>作成したテキスト・AI生成データ</li>
                            <li>個人プロフィール・設定情報</li>
                        </ul>
                        <p className="text-xs text-[#ba1a1a]/80 mb-3 leading-relaxed">
                            契約中・無料お試し中の時は、Stripe の契約もその場で止まります（残りの日数の返金はありません）。
                        </p>
                        <p className="text-xs text-[#484550] mb-2">
                            続行するには下の入力欄に <code className="bg-white px-1.5 py-0.5 rounded text-[#ba1a1a] font-bold">DELETE</code> と入力してください
                        </p>
                        <input
                            type="text"
                            value={deleteConfirm}
                            onChange={e => setDeleteConfirm(e.target.value)}
                            placeholder="DELETE"
                            className="w-full text-sm px-3 py-2.5 rounded-xl border border-[#f4b8b8] focus:outline-none focus:ring-2 focus:ring-[#ba1a1a] bg-white font-mono"
                        />
                        {deleteError && <p className="text-xs text-[#ba1a1a] mt-2">{deleteError}</p>}
                        <div className="flex gap-2 pt-3">
                            <button
                                type="button"
                                onClick={() => setDeleteOpen(false)}
                                className="text-xs px-4 py-2 rounded-xl bg-white text-[#484550] border border-[#ccbeff]/30 hover:bg-[#efe9ff] transition-colors"
                            >
                                キャンセル
                            </button>
                            <button
                                type="button"
                                onClick={handleAccountDelete}
                                disabled={deleteConfirm !== 'DELETE' || deleteLoading}
                                className="text-xs px-4 py-2 rounded-xl bg-[#ba1a1a] text-white font-bold hover:bg-[#960000] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                            >
                                {deleteLoading && <Loader2 size={12} className="animate-spin" />}
                                {deleteLoading ? '削除中...' : 'アカウントを完全に削除'}
                            </button>
                        </div>
                    </div>
                )}
            </SectionCard>
        </div>
    );
}
