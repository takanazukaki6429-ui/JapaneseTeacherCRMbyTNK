'use client';

/**
 * 本番へ入れた時の、既存の先生へのお知らせの帯（2026-10-10 かずき決定）。ホームの一番上に出す。
 * 出す相手・期間の決め方は lib/release-notice.ts（既存の無料の先生・閉じるまで・施行日から30日で自動で消す）。
 * 閉じたことは、その端末の中に覚える（別の端末では、もう一度出る）
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, X } from 'lucide-react';
import { useIsFreeTeacher } from '@/lib/plan-access';
import { FREE_LEGACY_TRANSLATION_MINUTES, LEGAL_EFFECTIVE_DATE, TRIAL_DAYS } from '@/lib/pricing';
import { releaseNoticeDismissKey, showReleaseNotice } from '@/lib/release-notice';

function readDismissed(): boolean {
    try {
        return localStorage.getItem(releaseNoticeDismissKey()) === '1';
    } catch {
        return false;
    }
}

export function ReleaseNotice() {
    const { loading, isFree } = useIsFreeTeacher();
    // 閉じたかどうかは、画面を開いた後にその端末から読む（読むまでは出さない）
    const [dismissed, setDismissed] = useState<boolean | null>(null);
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDismissed(readDismissed());
    }, []);

    if (loading || dismissed === null) return null;
    if (!showReleaseNotice({ isFree, effectiveDate: LEGAL_EFFECTIVE_DATE, dismissed })) return null;

    const close = () => {
        try {
            localStorage.setItem(releaseNoticeDismissKey(), '1');
        } catch {
            /* 覚えられない時も、この画面では閉じる */
        }
        setDismissed(true);
    };

    return (
        <div className="mb-6 rounded-2xl border border-[#d9cff5] bg-[#f6f2ff] px-5 py-4 text-[14px] text-[#3a3350]">
            <div className="flex items-start justify-between gap-3">
                <p className="flex items-start gap-2 font-bold leading-relaxed">
                    <Megaphone size={16} className="mt-1 flex-shrink-0 text-[#6b5ca5]" />
                    ASTA を新しくしました（{LEGAL_EFFECTIVE_DATE}）
                </p>
                <button type="button" onClick={close} aria-label="お知らせを閉じる" title="閉じる" className="p-1 rounded-lg text-[#484550] hover:bg-[#efe9ff] transition-colors">
                    <X size={16} />
                </button>
            </div>
            <ul className="mt-2 ml-6 space-y-1 leading-relaxed list-disc">
                <li>今まで使えていた機能は、これまでどおり無料です。</li>
                <li>翻訳モードは、1か月{FREE_LEGACY_TRANSLATION_MINUTES.toLocaleString('ja-JP')}分までになりました（毎月1日に元に戻ります）。</li>
                <li>新しく使えるもの：旅行のテキスト（20場面）・使い方のページ（各画面の右上の「この画面の使い方」）・予約した授業の一覧と取り消し・表示名の変更（設定）。</li>
                <li>プランをお申し込みいただくと使える新しい機能もあります（最初の{TRIAL_DAYS}日間は無料）：授業前の1枚の自動作成・授業中に作った物の保存 など。</li>
                <li>呼び名が変わりました：「教材」は「テキスト」、「生徒の1枚」は「生徒情報」になりました。</li>
                <li>利用規約を変えました（料金とプラン、アカウントを削除した時の契約 など）。</li>
            </ul>
            <div className="mt-3 ml-6 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-semibold">
                <Link href="/manual" className="text-[#6b5ca5] hover:underline">使い方を見る</Link>
                <Link href="/legal/terms" className="text-[#6b5ca5] hover:underline">利用規約を読む</Link>
                <Link href="/settings/billing" className="text-[#6b5ca5] hover:underline">プランとお支払い</Link>
                <button type="button" onClick={close} className="text-[#484550] hover:underline">閉じる</button>
            </div>
        </div>
    );
}
