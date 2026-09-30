'use client';

/**
 * 二段階認証の6桁のコードを入れる画面（2026-09-30）
 *
 * 二段階認証を登録した人は、パスワードでログインした後にここへ案内される（ログインの画面と門番の両方から）。
 * 認証アプリの今のコードを入れると、ログインが「コードまで済んだ状態（aal2）」になり、元の画面へ戻る。
 * 手順は Supabase の説明のとおり（listFactors → challenge → verify）。判定の決まりは lib/mfa.ts
 */

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { needsMfaCode, safeNextPath } from '@/lib/mfa';
import { BUSINESS_CONTACT_EMAIL } from '@/lib/pricing';

function MfaVerify() {
    const router = useRouter();
    const params = useSearchParams();
    const next = safeNextPath(params.get('next'));
    const [supabase] = useState(() => createClient());
    const [checking, setChecking] = useState(true);
    const [factorId, setFactorId] = useState<string | null>(null);
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        (async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.replace('/login');
                return;
            }
            // コードが要らない人（二段階認証を登録していない・もう済んだ）は元の画面へ
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (!needsMfaCode(aal)) {
                router.replace(next);
                return;
            }
            const { data } = await supabase.auth.mfa.listFactors();
            const totp = data?.totp?.find(f => f.status === 'verified');
            if (!totp) {
                router.replace(next);
                return;
            }
            setFactorId(totp.id);
            setChecking(false);
        })();
    }, [supabase, router, next]);

    const verify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!factorId || code.length !== 6) return;
        setBusy(true);
        setError('');
        try {
            const challenge = await supabase.auth.mfa.challenge({ factorId });
            if (challenge.error) throw challenge.error;
            const result = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.data.id, code });
            if (result.error) throw result.error;
            router.replace(next);
            router.refresh();
        } catch {
            setError('コードが正しくないか、時間が切れています。認証アプリに今出ている6桁のコードを入れてください。');
            setCode('');
        } finally {
            setBusy(false);
        }
    };

    const switchAccount = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
        router.refresh();
    };

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f6f3fb]">
                <Loader2 className="w-8 h-8 animate-spin text-[#6b5ca5]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f6f3fb] p-4">
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#ccbeff]/20 blur-[120px] pointer-events-none" />
            <div className="w-full max-w-md relative">
                <div className="bg-white/70 backdrop-blur-[24px] rounded-3xl shadow-[0_8px_48px_rgba(107,92,165,0.12)] border border-white/60 p-8">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="text-[#6b5ca5]" size={20} />
                        <h1 className="text-lg font-bold text-[#3a3350]">二段階認証</h1>
                    </div>
                    <p className="text-sm text-[#484550] mb-6">
                        認証アプリ（Google Authenticator など）に出ている6桁のコードを入れてください。
                    </p>

                    <form onSubmit={verify} className="space-y-4">
                        <input
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            autoFocus
                            maxLength={6}
                            value={code}
                            onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                            placeholder="6桁のコード"
                            aria-label="6桁のコード"
                            className="w-full text-center text-2xl tracking-[0.4em] font-mono px-4 py-3 bg-[#f0ebf8] rounded-xl text-[#3a3350] outline-none focus:bg-[#efe9ff] transition-colors placeholder:text-[#484550]/40 placeholder:text-base placeholder:tracking-normal"
                        />
                        {error && <p className="text-sm text-[#ba1a1a]">{error}</p>}
                        <button
                            type="submit"
                            disabled={busy || code.length !== 6}
                            className="w-full py-3 bg-[#6b5ca5] text-white font-bold rounded-full hover:scale-[1.01] transition-transform shadow-[0_4px_20px_rgba(107,92,165,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {busy
                                ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} />確認中...</span>
                                : '確認してログイン'}
                        </button>
                    </form>

                    <div className="mt-6 space-y-2 text-center text-[12px] text-[#6f6884]">
                        <p>
                            認証アプリを使えなくなった場合は、{BUSINESS_CONTACT_EMAIL} までご連絡ください。
                        </p>
                        <button type="button" onClick={switchAccount} className="underline hover:text-[#6b5ca5]">
                            別のアカウントでログインする
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function MfaVerifyPage() {
    return (
        <Suspense fallback={null}>
            <MfaVerify />
        </Suspense>
    );
}
