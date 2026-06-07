/**
 * v1.0 工程表 4.7: 管理者ダッシュボード
 *
 * - システムヘルス（/api/health）表示
 * - 監査ログ一覧（直近100件）
 * - エラーログのAI解析（/api/admin/error-analysis）ワンクリック
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { isAdminEmail } from '@/lib/admin';
import { Loader2, Activity, ShieldAlert, Sparkles, RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

type AuditLog = {
    id: string;
    action: string;
    outcome: 'success' | 'failure';
    actor_email: string | null;
    ip: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
};

type HealthCheck = { name: string; status: 'ok' | 'degraded' | 'down'; latencyMs?: number };

const STATUS_ICON = {
    ok: { Icon: CheckCircle2, color: '#1a7f37' },
    degraded: { Icon: AlertTriangle, color: '#bf8700' },
    down: { Icon: XCircle, color: '#ba1a1a' },
};

export default function AdminDashboardPage() {
    const router = useRouter();
    const supabase = createClient();
    const [authChecked, setAuthChecked] = useState(false);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [health, setHealth] = useState<HealthCheck[]>([]);
    const [loading, setLoading] = useState(true);
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);

    const loadData = useCallback(async () => {
        setLoading(true);
        const [logsRes, healthRes] = await Promise.all([
            supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(100),
            fetch('/api/health', { cache: 'no-store' }).then(r => r.json()).catch(() => null),
        ]);
        if (logsRes.data) setLogs(logsRes.data as AuditLog[]);
        if (healthRes?.checks) setHealth(healthRes.checks);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        const check = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!isAdminEmail(user?.email)) {
                router.replace('/');
                return;
            }
            setAuthChecked(true);
            loadData();
        };
        check();
    }, [supabase, router, loadData]);

    const runAnalysis = async () => {
        setAnalyzing(true);
        setAiSummary(null);
        try {
            const res = await fetch('/api/admin/error-analysis', { method: 'POST' });
            const data = await res.json();
            setAiSummary(data.summary || data.error || '解析結果が空でした');
        } catch {
            setAiSummary('解析リクエストに失敗しました');
        } finally {
            setAnalyzing(false);
        }
    };

    if (!authChecked) {
        return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-[#6f5385]" size={28} /></div>;
    }

    const failureCount = logs.filter(l => l.outcome === 'failure').length;

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[#1a1c1e]">管理ダッシュボード</h1>
                    <p className="text-sm text-[#4b454e] mt-0.5">システム監視・監査ログ・エラー解析</p>
                </div>
                <button onClick={loadData} disabled={loading}
                    className="inline-flex items-center gap-1.5 text-xs text-[#6f5385] hover:text-[#1a1c1e] disabled:opacity-50">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> 更新
                </button>
            </div>

            {/* システムヘルス */}
            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] overflow-hidden">
                <div className="px-5 py-3.5 bg-[#f4f3f7] flex items-center gap-2.5">
                    <Activity size={16} className="text-[#6f5385]" />
                    <h2 className="font-bold text-sm text-[#1a1c1e]">システムヘルス</h2>
                </div>
                <div className="p-5 flex flex-wrap gap-4">
                    {health.length === 0 && <p className="text-sm text-[#4b454e]">取得中…</p>}
                    {health.map(c => {
                        const m = STATUS_ICON[c.status];
                        return (
                            <div key={c.name} className="flex items-center gap-2">
                                <m.Icon size={16} style={{ color: m.color }} />
                                <span className="text-sm text-[#1a1c1e]">{c.name}</span>
                                {c.latencyMs != null && <span className="text-xs text-[#4b454e]">{c.latencyMs}ms</span>}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* エラーAI解析 */}
            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] overflow-hidden">
                <div className="px-5 py-3.5 bg-[#f4f3f7] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Sparkles size={16} className="text-[#6f5385]" />
                        <h2 className="font-bold text-sm text-[#1a1c1e]">エラーログAI解析</h2>
                        {failureCount > 0 && (
                            <span className="text-[10px] bg-[#ba1a1a] text-white rounded-full px-2 py-0.5 font-bold">
                                失敗 {failureCount}件
                            </span>
                        )}
                    </div>
                    <button onClick={runAnalysis} disabled={analyzing}
                        className="inline-flex items-center gap-1.5 text-xs bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold px-3 py-1.5 rounded-full disabled:opacity-50">
                        {analyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        {analyzing ? '解析中…' : 'AIで解析'}
                    </button>
                </div>
                {aiSummary && (
                    <div className="p-5 text-sm text-[#1a1c1e] whitespace-pre-wrap leading-relaxed">{aiSummary}</div>
                )}
            </div>

            {/* 監査ログ */}
            <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] overflow-hidden">
                <div className="px-5 py-3.5 bg-[#f4f3f7] flex items-center gap-2.5">
                    <ShieldAlert size={16} className="text-[#655a6f]" />
                    <h2 className="font-bold text-sm text-[#1a1c1e]">監査ログ（直近100件）</h2>
                </div>
                <div className="max-h-[480px] overflow-y-auto">
                    {logs.length === 0 && <p className="p-5 text-sm text-[#4b454e]">ログがありません</p>}
                    {logs.map(log => (
                        <div key={log.id} className="flex items-center gap-3 px-5 py-2.5 border-t border-[#f4f3f7] text-xs">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${log.outcome === 'failure' ? 'bg-[#ba1a1a]' : 'bg-[#1a7f37]'}`} />
                            <span className="font-mono text-[#6f5385] w-44 shrink-0">{log.action}</span>
                            <span className="text-[#4b454e] flex-1 truncate">{log.actor_email || '—'}</span>
                            <span className="text-[#4b454e]/60 shrink-0">{new Date(log.created_at).toLocaleString('ja-JP')}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
