"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Loader2, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setError("ログイン情報が確認できませんでした。お手数ですが、一度ログインし直してからもう一度お試しください。");
                return;
            }

            const { error: updateError } = await supabase
                .from("user_settings")
                .upsert({
                    user_id: user.id,
                    display_name: name,
                    has_completed_onboarding: true,
                    updated_at: new Date().toISOString(),
                });

            if (updateError) {
                setError(`保存できませんでした。もう一度お試しいただくか、うまくいかない場合はこの文言をご連絡ください：${updateError.message}`);
                return;
            }

            // 保存できたことを実際に読み直して確かめてから次の画面へ進む。
            // 確認せずに進むと、保存に失敗していた場合に入力欄が空のまま
            // 登録画面へ戻され、利用者からは「何も起きない」ように見える
            // （2026-08-13 実クライアントの申告がこの見え方だった）
            const { data: saved } = await supabase
                .from("user_settings")
                .select("display_name")
                .eq("user_id", user.id)
                .single();

            if (!saved?.display_name) {
                setError("保存を確認できませんでした。通信状況をご確認のうえ、もう一度お試しください。");
                return;
            }

            router.refresh();
            window.location.href = "/";
        } catch (err: unknown) {
            const detail = err instanceof Error ? err.message : String(err);
            setError(`保存中に問題が起きました。もう一度お試しください。（${detail}）`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#efe9ff] p-4">
            <div className="w-full max-w-md">
                {/* フォームカード */}
                <div className="bg-white rounded-2xl shadow-[0_8px_48px_rgba(107,92,165,0.15)] overflow-hidden">
                    <div className="px-5 py-3.5 bg-[#f0ebf8] flex items-center gap-2">
                        <p className="text-xs font-bold text-[#6b5ca5]">STEP 1 / 1</p>
                        <p className="text-xs text-[#484550]">プロフィール設定</p>
                    </div>
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-1.5">
                                <label htmlFor="name" className="text-sm font-semibold text-[#3a3350]">
                                    表示名 <span className="text-[#ba1a1a]">*</span>
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="例: 田中 太郎"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    autoFocus
                                    className="w-full text-sm px-4 py-3 rounded-xl border border-[#ccbeff]/40 focus:outline-none focus:ring-2 focus:ring-[#ccbeff] bg-[#f0ebf8] placeholder:text-[#484550]/50"
                                />
                                <p className="text-xs text-[#484550]/70">※後から設定画面でいつでも変更できます</p>
                            </div>

                            {error && (
                                <div className="p-3 text-xs text-[#ba1a1a] bg-red-50 rounded-xl border border-red-100">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !name.trim()}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-[#6b5ca5] text-white font-bold text-sm rounded-xl hover:scale-[1.01] transition-transform shadow-[0_4px_20px_rgba(107,92,165,0.25)] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                            >
                                {loading ? (
                                    <><Loader2 size={16} className="animate-spin" /> 保存中...</>
                                ) : (
                                    <>ASTAを始める <ArrowRight size={16} /></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
