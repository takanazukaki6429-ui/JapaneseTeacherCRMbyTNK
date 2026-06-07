/**
 * v1.0 工程表 4.10: MFA（二要素認証）
 *
 * Supabase Auth の TOTP（認証アプリ）ベースMFA。
 * settings ページに埋め込む。
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ShieldCheck, Loader2, Trash2 } from 'lucide-react';

export function MfaSection() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);
    const [enrolled, setEnrolled] = useState(false);
    const [factorId, setFactorId] = useState<string | null>(null);

    // エンロール中の状態
    const [enrolling, setEnrolling] = useState(false);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [secret, setSecret] = useState<string | null>(null);
    const [newFactorId, setNewFactorId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.auth.mfa.listFactors();
        const totp = data?.totp?.[0];
        if (totp && totp.status === 'verified') {
            setEnrolled(true);
            setFactorId(totp.id);
        } else {
            setEnrolled(false);
            setFactorId(null);
        }
        setLoading(false);
    }, [supabase]);

    useEffect(() => { refresh(); }, [refresh]);

    const startEnroll = async () => {
        setError('');
        setBusy(true);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
            if (error) throw error;
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
            setNewFactorId(data.id);
            setEnrolling(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'MFA登録の開始に失敗しました');
        } finally {
            setBusy(false);
        }
    };

    const verifyEnroll = async () => {
        if (!newFactorId || code.length < 6) return;
        setError('');
        setBusy(true);
        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId: newFactorId });
            if (challenge.error) throw challenge.error;
            const verify = await supabase.auth.mfa.verify({
                factorId: newFactorId,
                challengeId: challenge.data.id,
                code,
            });
            if (verify.error) throw verify.error;
            setEnrolling(false);
            setQrCode(null);
            setSecret(null);
            setCode('');
            await refresh();
        } catch (e) {
            setError(e instanceof Error ? e.message : '認証コードが正しくありません');
        } finally {
            setBusy(false);
        }
    };

    const unenroll = async () => {
        if (!factorId) return;
        if (!confirm('二要素認証を解除しますか？セキュリティが低下します。')) return;
        setBusy(true);
        try {
            await supabase.auth.mfa.unenroll({ factorId });
            await refresh();
        } finally {
            setBusy(false);
        }
    };

    if (loading) {
        return <div className="flex items-center gap-2 text-sm text-[#4b454e]"><Loader2 size={14} className="animate-spin" />読み込み中…</div>;
    }

    return (
        <div className="py-3 border-b border-[#f4f3f7] last:border-0">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold text-[#1a1c1e] flex items-center gap-1.5">
                        <ShieldCheck size={14} className={enrolled ? 'text-[#1a7f37]' : 'text-[#4b454e]'} />
                        二要素認証（MFA）
                        {enrolled && <span className="text-[10px] bg-[#f0fdf4] text-[#1a7f37] px-2 py-0.5 rounded-full font-bold">有効</span>}
                    </p>
                    <p className="text-xs text-[#4b454e] mt-0.5">認証アプリ（Google Authenticator等）で保護</p>
                </div>
                {!enrolled && !enrolling && (
                    <button onClick={startEnroll} disabled={busy}
                        className="text-xs bg-[#f4f3f7] text-[#4b454e] px-3 py-1.5 rounded-lg hover:bg-[#f2daff] hover:text-[#6f5385] transition-colors disabled:opacity-50 flex items-center gap-1">
                        {busy && <Loader2 size={12} className="animate-spin" />}有効にする
                    </button>
                )}
                {enrolled && (
                    <button onClick={unenroll} disabled={busy}
                        className="text-xs bg-[#fff0f0] text-[#ba1a1a] px-3 py-1.5 rounded-lg hover:bg-[#ffe0e0] transition-colors disabled:opacity-50 flex items-center gap-1 border border-[#f4b8b8]">
                        <Trash2 size={12} />解除
                    </button>
                )}
            </div>

            {enrolling && (
                <div className="mt-4 bg-[#f4f3f7] rounded-2xl p-5">
                    <p className="text-sm font-bold text-[#1a1c1e] mb-3">認証アプリで登録</p>
                    <ol className="text-xs text-[#4b454e] space-y-1.5 mb-4 list-decimal pl-4">
                        <li>Google Authenticator等のアプリでQRコードをスキャン</li>
                        <li>表示された6桁のコードを下に入力</li>
                    </ol>
                    {qrCode && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={qrCode} alt="MFA QRコード" className="w-44 h-44 mx-auto bg-white rounded-xl p-2 mb-3" />
                    )}
                    {secret && (
                        <p className="text-[11px] text-[#4b454e] text-center mb-3">
                            手入力用キー: <code className="bg-white px-1.5 py-0.5 rounded font-mono">{secret}</code>
                        </p>
                    )}
                    <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="6桁のコード"
                        className="w-full text-center text-lg tracking-[0.3em] font-mono px-3 py-2.5 rounded-xl border border-[#c9a8e0]/40 focus:outline-none focus:ring-2 focus:ring-[#c9a8e0] bg-white mb-2"
                    />
                    {error && <p className="text-xs text-[#ba1a1a] mb-2">{error}</p>}
                    <div className="flex gap-2">
                        <button onClick={() => { setEnrolling(false); setError(''); setCode(''); }}
                            className="text-xs px-4 py-2 rounded-xl bg-white text-[#4b454e] border border-[#c9a8e0]/30 hover:bg-[#f2daff] transition-colors">
                            キャンセル
                        </button>
                        <button onClick={verifyEnroll} disabled={code.length < 6 || busy}
                            className="text-xs px-4 py-2 rounded-xl bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold hover:scale-[1.02] transition-transform disabled:opacity-50 flex items-center gap-1.5">
                            {busy && <Loader2 size={12} className="animate-spin" />}確認して有効化
                        </button>
                    </div>
                </div>
            )}
            {error && !enrolling && <p className="text-xs text-[#ba1a1a] mt-2">{error}</p>}
        </div>
    );
}
