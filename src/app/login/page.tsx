'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isSignUp) {
                // Sign Up Flow (Custom API with Invite Code)
                if (!inviteCode) {
                    throw new Error('招待コードを入力してください。');
                }

                const res = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, inviteCode })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || '登録に失敗しました。');
                }

                setMessage(data.message || '確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
                setIsSignUp(false); // Switch back to login view
            } else {
                // Login Flow
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (error) {
                    throw error;
                }

                router.push('/');
                router.refresh();
            }
        } catch (err: unknown) {
            console.error('Login/Signup Error:', err);
            const parsedError = parseAppError(err);
            setError(parsedError);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md shadow-lg border-amber-100">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto w-24 h-24 relative mb-4">
                        <Image
                            src="/logo.png"
                            alt="ASTA Logo"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                    <CardTitle className="text-xl font-bold text-amber-800">
                        {isSignUp ? 'アカウント作成' : '講師ログイン'}
                    </CardTitle>
                    <p className="text-slate-500 text-sm">
                        {isSignUp ? 'メールアドレスとパスワードを入力してください' : '講師用アカウントでログインしてください'}
                    </p>
                </CardHeader>
                <CardContent>
                    {/* Mode Toggles */}
                    <div className="flex p-1 bg-slate-100 rounded-lg mb-6">
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(false);
                                setError(null);
                                setMessage(null);
                            }}
                            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${!isSignUp
                                ? 'bg-white text-amber-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            ログイン
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setIsSignUp(true);
                                setError(null);
                                setMessage(null);
                            }}
                            className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${isSignUp
                                ? 'bg-white text-amber-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                                }`}
                        >
                            新規登録
                        </button>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="bg-rose-50 p-4 rounded-lg border border-rose-200 shadow-sm animate-in fade-in zoom-in duration-200">
                                <h3 className="text-rose-800 font-bold text-sm mb-1">{error.title}</h3>
                                <p className="text-rose-700 text-sm mb-2">{error.message}</p>
                                <div className="bg-white/60 rounded p-2 text-xs text-rose-800/80">
                                    <span className="font-semibold block mb-0.5">💡 対処方法:</span>
                                    {error.action}
                                </div>
                            </div>
                        )}
                        {message && (
                            <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg border border-green-100">
                                <p className="font-bold mb-1">送信完了</p>
                                <p>{message}</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <label htmlFor="email" className="text-sm font-medium text-slate-700">
                                メールアドレス
                            </label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="teacher@example.com"
                                value={email}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                                required
                                className="h-12 border-slate-200 focus-visible:ring-amber-500"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                                    パスワード
                                </label>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="h-12 border-slate-200 focus-visible:ring-amber-500"
                            />
                            {isSignUp && (
                                <p className="text-xs text-slate-500">※6文字以上のパスワードを設定してください</p>
                            )}
                        </div>

                        {/* Invite Code Field (Only shown during Sign Up) */}
                        {isSignUp && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label htmlFor="inviteCode" className="text-sm font-bold text-amber-700">
                                    招待コード <span className="text-rose-500">*</span>
                                </label>
                                <Input
                                    id="inviteCode"
                                    type="text"
                                    placeholder="例: A8F3-K9P2"
                                    value={inviteCode}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInviteCode(e.target.value)}
                                    required={isSignUp}
                                    className="h-12 border-amber-200 bg-amber-50 focus-visible:ring-amber-500 font-mono tracking-wider"
                                />
                                <p className="text-xs text-amber-600/80">
                                    ※登録にはコンサルタントから発行された招待コードが必要です。
                                </p>
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 rounded-full shadow-md transition-all hover:shadow-lg mt-6"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={18} />
                                    処理中...
                                </span>
                            ) : (
                                isSignUp ? 'アカウント作成' : 'ログイン'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
