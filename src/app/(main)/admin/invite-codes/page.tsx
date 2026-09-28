'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, Copy, Check, Plus, Users, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { showAppError } from '@/lib/error-handler';
import { isAdminEmail } from '@/lib/admin';
import { PLAN_TIERS, PLAN_TIER_KEYS } from '@/lib/pricing';
import { CONSULTANT_MAX_LENGTH, type ConsultantReport } from '@/lib/consultant-report';

type InviteCode = {
    id: string;
    code: string;
    used_at: string | null;
    created_at: string;
    /** 渡した相手（コンサルタントの呼び名）。紹介の取り分を数えるため（2026-09-29） */
    consultant?: string | null;
};

const yenOrDash = (n: number | null) => (n === null ? '金額未設定' : `¥${n.toLocaleString('ja-JP')}`);

export default function InviteCodesAdminPage() {
    const [codes, setCodes] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
    // 渡した相手（2026-09-29）
    const [consultantInput, setConsultantInput] = useState('');
    const [consultantColumn, setConsultantColumn] = useState<boolean | null>(null);
    const [edits, setEdits] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);
    const [report, setReport] = useState<ConsultantReport | null>(null);
    const [reportLoading, setReportLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    const fetchCodes = useCallback(async () => {
        try {
            setLoading(true);
            // データ口への直接アクセスは廃止（管理者権限接続のAPI経由に一本化）
            const res = await fetch('/api/admin/invite-codes');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '取得に失敗しました');
            setCodes(data.codes || []);
            setConsultantColumn(data.consultantColumn !== false);
        } catch (error) {
            console.error('Error fetching invite codes:', error);
            showAppError(error, '招待コードの取得に失敗しました');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchReport = useCallback(async () => {
        try {
            setReportLoading(true);
            const res = await fetch('/api/admin/consultant-report');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '取得に失敗しました');
            setReport(data);
        } catch (error) {
            console.error('Error fetching consultant report:', error);
            showAppError(error, 'コンサルタント別の数を取得できませんでした');
        } finally {
            setReportLoading(false);
        }
    }, []);

    useEffect(() => {
        const checkAccess = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || !isAdminEmail(user.email)) {
                router.replace('/');
                return;
            }

            setIsAdmin(true);
            fetchCodes();
            fetchReport();
        };

        checkAccess();
    }, [fetchCodes, fetchReport, router, supabase.auth]);

    // 入力の候補（これまでに使った呼び名）。同じ人を別の書き方で記録しないように
    const consultantNames = useMemo(
        () => [...new Set(codes.map(c => c.consultant?.trim()).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b, 'ja')),
        [codes],
    );

    if (isAdmin === null) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
        );
    }

    const generateCode = async () => {
        try {
            setGenerating(true);
            // コード生成・登録はサーバ側（管理者権限接続）で行う
            const res = await fetch('/api/admin/invite-codes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ consultant: consultantInput }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '発行に失敗しました');

            toast.success(consultantInput.trim()
                ? `「${consultantInput.trim()}」に渡すコードを発行しました`
                : '新しい招待コードを発行しました！');
            fetchCodes(); // Refresh list

        } catch (error) {
            console.error('Error generating code:', error);
            showAppError(error, 'コードの発行に失敗しました');
        } finally {
            setGenerating(false);
        }
    };

    const saveConsultant = async (c: InviteCode) => {
        try {
            setSavingId(c.id);
            const res = await fetch('/api/admin/invite-codes', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: c.id, consultant: edits[c.id] ?? '' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '記録に失敗しました');
            toast.success('渡した相手を記録しました');
            setEdits(prev => {
                const next = { ...prev };
                delete next[c.id];
                return next;
            });
            fetchCodes();
            fetchReport();
        } catch (error) {
            console.error('Error saving consultant:', error);
            showAppError(error, '渡した相手の記録に失敗しました');
        } finally {
            setSavingId(null);
        }
    };

    const copyToClipboard = async (code: string, id: string) => {
        try {
            await navigator.clipboard.writeText(code);
            setCopiedId(id);
            toast.success('クリップボードにコピーしました');
            setTimeout(() => setCopiedId(null), 2000);
        } catch (err) {
            console.error('Failed to copy', err);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-4xl space-y-6">
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
                    <KeyRound className="w-6 h-6 text-amber-500" />
                    招待コード管理
                </h1>
                <p className="text-slate-500 mt-2">
                    新規の契約教師にアプリを使わせるための「1回使いきり」の招待コードを発行・管理します。
                </p>
            </div>

            {consultantColumn === false && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                        保管庫に「渡した相手」の列がまだありません。Supabase Studio で
                        <span className="font-mono"> sql_2026-09-29_招待コードに渡した相手.sql </span>
                        を流すまで、渡した相手は記録できません（相手なしの発行はできます）。
                    </p>
                </div>
            )}

            <Card className="border-amber-100 shadow-sm">
                <CardHeader className="bg-amber-50/50 pb-4">
                    <CardTitle className="text-lg text-amber-900">新しい招待コードを発行</CardTitle>
                    <CardDescription>
                        生成したコードをコピーして、先生に送信してください。1つのコードにつき1回のアカウント作成のみ有効です。
                        コンサルタント経由の先生に渡すコードは、<strong>渡す相手の名前を入れてから</strong>発行してください（紹介の取り分を数えるため）。
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6 flex flex-col sm:flex-row gap-3 sm:items-end">
                    <label className="flex-1 text-sm text-slate-700">
                        <span className="block mb-1">渡す相手（コンサルタントの呼び名・直接渡すときは空のまま）</span>
                        <input
                            type="text"
                            list="consultant-names"
                            value={consultantInput}
                            maxLength={CONSULTANT_MAX_LENGTH}
                            onChange={e => setConsultantInput(e.target.value)}
                            placeholder="例：あいちゃん"
                            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                        />
                        <datalist id="consultant-names">
                            {consultantNames.map(name => <option key={name} value={name} />)}
                        </datalist>
                    </label>
                    <Button
                        onClick={generateCode}
                        disabled={generating}
                        className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        {generating ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> 発行中...</>
                        ) : (
                            <><Plus className="w-4 h-4 mr-2" /> 招待コードを発行する</>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" />
                        コンサルタント別の契約（今の時点）
                    </CardTitle>
                    <CardDescription>
                        渡した相手が記録されたコードで登録した先生を、相手ごとに数えます。有料＝契約中（お試し中は含めない）。
                        金額は段の月額の合計（税込・目安）で、実際の入金額とは違います。毎月1日 9:00（日本時間）に同じ内容を運営者のメールへ自動で送ります。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {reportLoading ? (
                        <div className="flex justify-center p-8 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : !report || report.summaries.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">
                            渡した相手が記録されたコードで登録した先生は、まだいません
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-700 bg-slate-50">
                                    <tr>
                                        <th className="px-3 py-3">渡した相手</th>
                                        <th className="px-3 py-3 text-right">登録</th>
                                        {PLAN_TIER_KEYS.map(t => (
                                            <th key={t} className="px-3 py-3 text-right">有料・{PLAN_TIERS[t].label}</th>
                                        ))}
                                        <th className="px-3 py-3 text-right">お試し中</th>
                                        <th className="px-3 py-3 text-right">支払い遅れ</th>
                                        <th className="px-3 py-3 text-right">解約</th>
                                        <th className="px-3 py-3 text-right">無料の先生</th>
                                        <th className="px-3 py-3 text-right">月額の合計</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.summaries.map(s => (
                                        <tr key={s.consultant} className="bg-white border-b">
                                            <td className="px-3 py-3 font-medium text-slate-900">{s.consultant}</td>
                                            <td className="px-3 py-3 text-right">{s.registered}</td>
                                            {PLAN_TIER_KEYS.map(t => (
                                                <td key={t} className="px-3 py-3 text-right">{s.paid[t]}</td>
                                            ))}
                                            <td className="px-3 py-3 text-right">{s.trialing}</td>
                                            <td className="px-3 py-3 text-right">{s.pastDue}</td>
                                            <td className="px-3 py-3 text-right">{s.canceled}</td>
                                            <td className="px-3 py-3 text-right">{s.free}</td>
                                            <td className="px-3 py-3 text-right">{yenOrDash(s.monthlyYen)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {report && report.unattributedSinceStart > 0 && (
                        <p className="mt-4 flex items-start gap-2 text-sm text-amber-800">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            10/1以降に、渡した相手が空のコードで登録した先生が {report.unattributedSinceStart}人 います。下の一覧で相手を入れ忘れていないか確かめてください。
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">発行済みコード一覧</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8 text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin" />
                        </div>
                    ) : codes.length === 0 ? (
                        <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">
                            まだ招待コードは発行されていません
                        </div>
                    ) : (
                        <div className="relative overflow-x-auto">
                            <table className="w-full text-sm text-left text-slate-600">
                                <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3">招待コード</th>
                                        <th className="px-6 py-3">渡した相手</th>
                                        <th className="px-6 py-3">ステータス</th>
                                        <th className="px-6 py-3">発行日</th>
                                        <th className="px-6 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codes.map((c) => {
                                        const current = c.consultant ?? '';
                                        const draft = edits[c.id] ?? current;
                                        const changed = draft.trim() !== current.trim();
                                        return (
                                            <tr key={c.id} className="bg-white border-b hover:bg-slate-50">
                                                <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                                    {c.code}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="text"
                                                            list="consultant-names"
                                                            value={draft}
                                                            maxLength={CONSULTANT_MAX_LENGTH}
                                                            disabled={consultantColumn === false}
                                                            onChange={e => setEdits(prev => ({ ...prev, [c.id]: e.target.value }))}
                                                            placeholder="（なし）"
                                                            aria-label={`${c.code} の渡した相手`}
                                                            className="w-32 rounded-md border border-slate-200 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:bg-slate-50"
                                                        />
                                                        {changed && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                disabled={savingId === c.id}
                                                                onClick={() => saveConsultant(c)}
                                                            >
                                                                {savingId === c.id ? <Loader2 className="w-4 h-4 animate-spin" /> : '保存'}
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {c.used_at ? (
                                                        <span className="px-2.5 py-1 text-xs font-medium bg-slate-100 text-slate-600 rounded-full">
                                                            使用済み ({new Date(c.used_at).toLocaleDateString()})
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                                                            未使用 (有効)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {new Date(c.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={!!c.used_at}
                                                        onClick={() => copyToClipboard(c.code, c.id)}
                                                        className={!!c.used_at ? 'opacity-50' : 'text-slate-600 hover:text-amber-600'}
                                                    >
                                                        {copiedId === c.id ? (
                                                            <Check className="w-4 h-4 text-emerald-500" />
                                                        ) : (
                                                            <Copy className="w-4 h-4" />
                                                        )}
                                                        <span className="ml-2 hidden sm:inline">
                                                            {copiedId === c.id ? 'コピー済' : 'コピー'}
                                                        </span>
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
