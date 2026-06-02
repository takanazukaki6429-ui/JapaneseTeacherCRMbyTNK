/**
 * v1.0 工程表 4.9: ステータスページ（公開）
 *
 * 認証不要の公開ページ。/api/health を叩いて各サービスの死活を表示する。
 * middleware.ts の公開ルートに /status を追加すること。
 */
'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

type CheckResult = {
    name: string;
    status: 'ok' | 'degraded' | 'down';
    latencyMs?: number;
    detail?: string;
};

type HealthResponse = {
    status: 'ok' | 'degraded' | 'down';
    timestamp: string;
    checks: CheckResult[];
};

const STATUS_META = {
    ok:       { label: '正常稼働中',   color: '#1a7f37', bg: '#f0fdf4', Icon: CheckCircle2 },
    degraded: { label: '一部劣化',     color: '#bf8700', bg: '#fffbeb', Icon: AlertTriangle },
    down:     { label: '障害発生中',   color: '#ba1a1a', bg: '#fff0f0', Icon: XCircle },
};

const SERVICE_LABELS: Record<string, string> = {
    supabase: 'データベース・認証',
    env: 'アプリ構成',
};

export default function StatusPage() {
    const [data, setData] = useState<HealthResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastChecked, setLastChecked] = useState<Date | null>(null);

    const fetchHealth = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/health', { cache: 'no-store' });
            const json = await res.json();
            setData(json);
            setLastChecked(new Date());
        } catch {
            setData({ status: 'down', timestamp: new Date().toISOString(), checks: [] });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();
        const interval = setInterval(fetchHealth, 60_000); // 1分ごと自動更新
        return () => clearInterval(interval);
    }, []);

    const overall = data?.status ?? 'down';
    const meta = STATUS_META[overall];

    return (
        <div className="min-h-screen bg-[#faf9fd] flex flex-col items-center py-16 px-4">
            <div className="w-full max-w-2xl">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-2xl font-bold text-[#1a1c1e]">ASTA ステータス</h1>
                    <button
                        onClick={fetchHealth}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 text-xs text-[#6f5385] hover:text-[#1a1c1e] transition-colors disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                        更新
                    </button>
                </div>

                {/* 全体ステータス */}
                <div
                    className="rounded-2xl p-6 mb-6 flex items-center gap-4"
                    style={{ backgroundColor: meta.bg }}
                >
                    {loading && !data ? (
                        <Loader2 size={28} className="animate-spin" style={{ color: meta.color }} />
                    ) : (
                        <meta.Icon size={28} style={{ color: meta.color }} />
                    )}
                    <div>
                        <p className="text-lg font-bold" style={{ color: meta.color }}>{meta.label}</p>
                        {lastChecked && (
                            <p className="text-xs text-[#4b454e] mt-0.5">
                                最終確認: {lastChecked.toLocaleString('ja-JP')}
                            </p>
                        )}
                    </div>
                </div>

                {/* 個別サービス */}
                <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] overflow-hidden">
                    {data?.checks.map((check, i) => {
                        const cMeta = STATUS_META[check.status];
                        return (
                            <div
                                key={check.name}
                                className={`flex items-center justify-between px-5 py-4 ${i > 0 ? 'border-t border-[#f4f3f7]' : ''}`}
                            >
                                <div className="flex items-center gap-3">
                                    <cMeta.Icon size={18} style={{ color: cMeta.color }} />
                                    <span className="text-sm font-medium text-[#1a1c1e]">
                                        {SERVICE_LABELS[check.name] || check.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    {check.latencyMs != null && (
                                        <span className="text-xs text-[#4b454e] tabular-nums">{check.latencyMs}ms</span>
                                    )}
                                    <span className="text-xs font-bold" style={{ color: cMeta.color }}>
                                        {cMeta.label}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {(!data || data.checks.length === 0) && !loading && (
                        <div className="px-5 py-8 text-center text-sm text-[#4b454e]">
                            ステータス情報を取得できませんでした
                        </div>
                    )}
                </div>

                <p className="text-xs text-[#4b454e]/60 text-center mt-6">
                    このページは1分ごとに自動更新されます
                </p>
            </div>
        </div>
    );
}
