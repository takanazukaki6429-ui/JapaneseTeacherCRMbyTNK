'use native';
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
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
                // Sign Up Flow
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    },
                });

                if (error) throw error;

                setMessage('確認メールを送信しました。メール内のリンクをクリックして登録を完了してください。');
                setIsSignUp(false); // Switch back to login view or keep displaying message
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
        } catch (err: any) {
            console.error(err);
            let msg = err.message || '予期せぬエラーが発生しました。';

            if (msg.includes('Invalid login credentials')) {
                msg = 'メールアドレスまたはパスワードが間違っています。アカウントをお持ちでない場合は「新規登録」タブから作成してください。';
            } else if (msg.includes('User already registered')) {
                msg = 'このメールアドレスは既に登録されています。「ログイン」タブからログインしてください。';
            } else if (msg.includes('Email not confirmed')) {
                msg = 'メールアドレスの確認が完了していません。Supabaseから届いた確認メール内のリンクをクリックしてください。';
            }

            setError(msg);
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
                            <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg border border-rose-100">
                                <p className="font-bold mb-1">エラーが発生しました</p>
                                <p>{error}</p>
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
                            <input
                                id="email"
                                type="email"
                                placeholder="teacher@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium text-slate-700">
                                パスワード
                            </label>
                            <input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                                required
                                minLength={6}
                            />
                            {isSignUp && (
                                <p className="text-xs text-slate-500">※6文字以上のパスワードを設定してください</p>
                            )}
                        </div>

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
