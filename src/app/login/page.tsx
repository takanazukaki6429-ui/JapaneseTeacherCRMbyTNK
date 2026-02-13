'use native';
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Loader2, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const supabase = createClient();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setError(error.message);
                return;
            }

            router.push('/');
            router.refresh();
        } catch (err) {
            setError('予期せぬエラーが発生しました。');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#fdfaf6] p-4">
            <Card className="w-full max-w-md shadow-lg border-teal-100">
                <CardHeader className="text-center space-y-2">
                    <div className="mx-auto bg-teal-50 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                        <LogIn className="text-teal-500" size={32} />
                    </div>
                    <CardTitle className="text-2xl font-bold text-teal-800">
                        Nihongo Teacher CRM
                    </CardTitle>
                    <p className="text-slate-500 text-sm">
                        教師用アカウントでログインしてください
                    </p>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        {error && (
                            <div className="bg-rose-50 text-rose-600 text-sm p-3 rounded-lg border border-rose-100">
                                {error}
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
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
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
                                className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all"
                                required
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 rounded-full shadow-md transition-all hover:shadow-lg mt-6"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin" size={18} />
                                    ログイン中...
                                </span>
                            ) : (
                                'ログイン'
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
