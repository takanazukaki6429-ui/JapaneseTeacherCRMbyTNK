'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, KeyRound } from 'lucide-react';
import { parseAppError, AppError } from '@/lib/error-handler';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<AppError | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                if (!inviteCode) throw new Error('招待コードを入力してください。');
                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, inviteCode }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || '登録に失敗しました。');
                setMessage(data.message || '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
                setIsSignUp(false);
            } else {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
                router.push('/');
                router.refresh();
            }
        } catch (err: unknown) {
            setError(parseAppError(err));
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (signup: boolean) => {
        setIsSignUp(signup);
        setError(null);
        setMessage(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9fd] p-4">
            {/* Ambient glow */}
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#c9a8e0]/20 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative">
                {/* Card */}
                <div className="bg-white/70 backdrop-blur-[24px] rounded-3xl shadow-[0_8px_48px_rgba(111,83,133,0.12)] border border-white/60 p-8">
                    {/* Tab switcher */}
                    <div className="flex gap-1 bg-[#f4f3f7] p-1 rounded-2xl mb-7">
                        <button
                            type="button"
                            onClick={() => switchMode(false)}
                            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${!isSignUp ? 'bg-white text-[#6f5385] shadow-sm' : 'text-[#4b454e] hover:text-[#1a1c1e]'}`}
                        >
                            ログイン
                        </button>
                        <button
                            type="button"
                            onClick={() => switchMode(true)}
                            className={`flex-1 py-2 text-sm font-bold rounded-xl transition-all ${isSignUp ? 'bg-white text-[#6f5385] shadow-sm' : 'text-[#4b454e] hover:text-[#1a1c1e]'}`}
                        >
                            新規登録
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-[#fff0f0] border border-[#f4b8b8] rounded-2xl p-4 text-sm">
                                <p className="font-bold text-[#ba1a1a] mb-1">{error.title}</p>
                                <p className="text-[#ba1a1a]/80">{error.message}</p>
                            </div>
                        )}
                        {message && (
                            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-2xl p-4 text-sm">
                                <p className="font-bold text-[#166534] mb-0.5">送信完了</p>
                                <p className="text-[#166534]/80">{message}</p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider">メールアドレス</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="teacher@example.com"
                                className="w-full px-4 py-3 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors placeholder:text-[#4b454e]/50"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-xs font-bold text-[#4b454e] uppercase tracking-wider">パスワード</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="w-full px-4 py-3 bg-[#f4f3f7] rounded-xl text-sm text-[#1a1c1e] outline-none focus:bg-[#f2daff] transition-colors placeholder:text-[#4b454e]/50"
                            />
                            {isSignUp && <p className="text-[11px] text-[#4b454e]">6文字以上で設定してください</p>}
                        </div>

                        {isSignUp && (
                            <div className="space-y-1.5">
                                <label className="block text-xs font-bold text-[#6f5385] uppercase tracking-wider flex items-center gap-1.5">
                                    <KeyRound size={12} />
                                    招待コード <span className="text-[#ba1a1a]">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={inviteCode}
                                    onChange={e => setInviteCode(e.target.value)}
                                    placeholder="例: A8F3-K9P2"
                                    className="w-full px-4 py-3 bg-[#f2daff] rounded-xl text-sm text-[#1a1c1e] font-mono tracking-wider outline-none focus:bg-[#eddcf4] transition-colors placeholder:text-[#6f5385]/40 border border-[#c9a8e0]/40"
                                />
                                <p className="text-[11px] text-[#6f5385]">コンサルタントから発行された招待コードを入力してください</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 mt-2 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold rounded-full hover:scale-[1.01] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading
                                ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} />処理中...</span>
                                : isSignUp ? 'アカウント作成' : 'ログイン'
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
