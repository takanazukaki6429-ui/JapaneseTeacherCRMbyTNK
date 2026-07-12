'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, KeyRound, Copy, Check, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { showAppError } from '@/lib/error-handler';
import { isAdminEmail } from '@/lib/admin';

type InviteCode = {
    id: string;
    code: string;
    used_at: string | null;
    created_at: string;
};

export default function InviteCodesAdminPage() {
    const [codes, setCodes] = useState<InviteCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
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
        } catch (error) {
            console.error('Error fetching invite codes:', error);
            showAppError(error, '招待コードの取得に失敗しました');
        } finally {
            setLoading(false);
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
        };

        checkAccess();
    }, [fetchCodes, router, supabase.auth]);

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
            const res = await fetch('/api/admin/invite-codes', { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || '発行に失敗しました');

            toast.success('新しい招待コードを発行しました！');
            fetchCodes(); // Refresh list

        } catch (error) {
            console.error('Error generating code:', error);
            showAppError(error, 'コードの発行に失敗しました');
        } finally {
            setGenerating(false);
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

            <Card className="border-amber-100 shadow-sm">
                <CardHeader className="bg-amber-50/50 pb-4">
                    <CardTitle className="text-lg text-amber-900">新しい招待コードを発行</CardTitle>
                    <CardDescription>
                        生成したコードをコピーして、先生に送信してください。1つのコードにつき1回のアカウント作成のみ有効です。
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
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
                                        <th className="px-6 py-3">ステータス</th>
                                        <th className="px-6 py-3">発行日</th>
                                        <th className="px-6 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {codes.map((c) => (
                                        <tr key={c.id} className="bg-white border-b hover:bg-slate-50">
                                            <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                                {c.code}
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
