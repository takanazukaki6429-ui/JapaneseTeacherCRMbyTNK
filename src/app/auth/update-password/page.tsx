'use client';

import { useMemo, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { checkPasswordStrength, getStrengthLabel } from '@/lib/password-policy';

export default function UpdatePasswordPage() {
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [sessionReady, setSessionReady] = useState<boolean | null>(null);
    const router = useRouter();
    const supabase = createClient();

    // リンクからのアクセス時、Supabase がリカバリセッションを付けてリダイレクトしてくる
    // セッションがあるか確認して、なければ「リンクが古い」旨を表示
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSessionReady(!!data.session);
        });
    }, [supabase]);

    const pwStrength = useMemo(() =>
        password ? checkPasswordStrength(password) : null,
    [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (password !== password2) {
            setError('入力した2つのパスワードが一致しません。');
            return;
        }
        const pwCheck = checkPasswordStrength(password);
        if (!pwCheck.valid) {
            setError(pwCheck.errors[0]);
            return;
        }

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            setError(error.message || 'パスワードの更新に失敗しました。');
            setLoading(false);
            return;
        }

        setMessage('パスワードを更新しました。ログイン画面に移動します...');
        setTimeout(() => {
            router.push('/login');
            router.refresh();
        }, 2000);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9fd] p-4">
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#c9a8e0]/20 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative">
                <div className="bg-white/70 backdrop-blur-[24px] rounded-3xl shadow-[0_8px_48px_rgba(111,83,133,0.12)] border border-white/60 p-8">
                    <h1 className="text-lg font-bold text-[#1a1c1e] mb-2">新しいパスワードの設定</h1>
                    <p className="text-xs text-[#4b454e] mb-6">
                        新しいパスワードを2回入力してください。
                    </p>

                    {sessionReady === false && (
                        <div className="bg-[#fff0f0] border border-[#f4b8b8] rounded-2xl p-4 text-sm mb-4">
                            <p className="font-bold text-[#ba1a1a] mb-1">リンクが無効か、期限切れです</p>
                            <p className="text-[#ba1a1a]/80">お手数ですが、もう一度「パスワードを忘れた場合」からやり直してください。</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-[#fff0f0] border border-[#f4b8b8] rounded-2xl p-4 text-sm">
                                <p className="text-[#ba1a1a]">{error}</p>
                            </div>
                        )}
                        {message && (
                            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 text-sm">
                                <p className="text-[#166534]">{message}</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider">新しいパスワード</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors placeholder:text-[#4b454e]/50"
                            />
                            {pwStrength && password.length > 0 && (
                                <div className="flex items-center gap-2 pt-1">
                                    <div className="flex-1 h-1.5 bg-[#f4f3f7] rounded-full overflow-hidden">
                                        <div
                                            className="h-full transition-all duration-200"
                                            style={{
                                                width: `${(pwStrength.score / 4) * 100}%`,
                                                backgroundColor: getStrengthLabel(pwStrength.score).color,
                                            }}
                                        />
                                    </div>
                                    <span
                                        className="text-[10px] font-bold tabular-nums"
                                        style={{ color: getStrengthLabel(pwStrength.score).color }}
                                    >
                                        {getStrengthLabel(pwStrength.score).label}
                                    </span>
                                </div>
                            )}
                            {!password && (
                                <p className="text-[11px] text-[#4b454e] pt-0.5">8文字以上、英大文字・小文字・数字・記号から3種類以上</p>
                            )}
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider">新しいパスワード（確認）</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={password2}
                                onChange={e => setPassword2(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors placeholder:text-[#4b454e]/50"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !!message || sessionReady === false}
                            className="w-full py-3 mt-2 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold rounded-full hover:scale-[1.01] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading
                                ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} />処理中...</span>
                                : 'パスワードを更新'
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
