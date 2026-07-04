'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const supabase = createClient();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${origin}/auth/update-password`,
        });

        if (error) {
            setError('メールの送信に失敗しました。時間をおいて再度お試しください。');
        } else {
            setMessage('パスワード再設定用のメールを送信しました。メール内のリンクを開いて新しいパスワードを設定してください。');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#faf9fd] p-4">
            <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[#c9a8e0]/20 blur-[120px] pointer-events-none" />

            <div className="w-full max-w-md relative">
                <div className="bg-white/70 backdrop-blur-[24px] rounded-3xl shadow-[0_8px_48px_rgba(111,83,133,0.12)] border border-white/60 p-8">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1 text-xs text-[#6f5385] hover:underline mb-4"
                    >
                        <ArrowLeft size={12} />
                        ログイン画面に戻る
                    </Link>

                    <h1 className="text-lg font-bold text-[#1a1c1e] mb-2">パスワード再設定</h1>
                    <p className="text-xs text-[#4b454e] mb-6">
                        登録時のメールアドレスを入力してください。<br />
                        再設定用のリンクをメールでお送りします。
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <div className="bg-[#fff0f0] border border-[#f4b8b8] rounded-2xl p-4 text-sm">
                                <p className="text-[#ba1a1a]">{error}</p>
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

                        <button
                            type="submit"
                            disabled={loading || !!message}
                            className="w-full py-3 mt-2 bg-gradient-to-br from-[#6f5385] to-[#c9a8e0] text-white font-bold rounded-full hover:scale-[1.01] transition-transform shadow-[0_4px_20px_rgba(111,83,133,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading
                                ? <span className="flex items-center justify-center gap-2"><Loader2 className="animate-spin" size={18} />処理中...</span>
                                : '再設定メールを送信'
                            }
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
