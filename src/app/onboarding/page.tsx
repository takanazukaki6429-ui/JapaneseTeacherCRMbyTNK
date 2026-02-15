"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, User, Check } from "lucide-react";

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
            if (!user) throw new Error("No user found");

            const { error: updateError } = await supabase
                .from("user_settings")
                .update({
                    display_name: name,
                    has_completed_onboarding: true,
                    updated_at: new Date().toISOString(),
                })
                .eq("user_id", user.id);

            if (updateError) throw updateError;

            // Force refresh/redirect to dashboard
            router.refresh();
            // Client-side router sometimes keeps old state, encourage full reload to re-run middleware checks
            window.location.href = "/";

        } catch (err: any) {
            console.error(err);
            setError(err.message || "プロフィールの保存に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50/30 p-4">
            <Card className="w-full max-w-md shadow-xl border-amber-100">
                <CardHeader className="text-center space-y-4 pb-8">
                    <div className="mx-auto w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mb-2">
                        <User size={40} />
                    </div>
                    <CardTitle className="text-2xl font-bold text-slate-800">
                        ASTAへようこそ！
                    </CardTitle>
                    <CardDescription className="text-base">
                        はじめに、あなたのお名前を教えてください。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label htmlFor="name" className="text-sm font-bold text-slate-700 block">
                                表示名 (必須)
                            </label>
                            <Input
                                id="name"
                                placeholder="例: 田中 太郎"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="text-lg py-6"
                                autoFocus
                            />
                            <p className="text-xs text-slate-500">
                                ※後から設定画面でいつでも変更できます。
                            </p>
                        </div>

                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
                                {error}
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="w-full py-6 text-lg font-bold bg-amber-500 hover:bg-amber-600 shadow-md hover:shadow-lg transition-all"
                            disabled={loading || !name.trim()}
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <Loader2 className="animate-spin" /> 保存中...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    ASTAを始める <Check size={20} />
                                </span>
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
