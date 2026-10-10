import Link from 'next/link';

/**
 * 見つからない画面（2026-10-09）。前は Next.js の英語の画面が出ていた。
 * 存在しない住所・消した生徒やテキストを開いた時に出る
 */
export const metadata = { title: 'ページが見つかりません | ASTA' };

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#f5f2fa] flex items-center justify-center px-6">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.08)] p-8 text-center space-y-4">
                <p className="text-[20px] font-bold text-[#6b5ca5]">ASTA</p>
                <h1 className="text-lg font-bold text-[#3a3350]">ページが見つかりません</h1>
                <p className="text-sm text-[#484550] leading-relaxed">
                    住所が間違っているか、消した生徒・テキストのページかもしれません。
                </p>
                <Link href="/" className="inline-block px-6 py-2.5 rounded-full bg-[#6b5ca5] text-white text-sm font-bold hover:bg-[#5a4c94] transition-colors">
                    ホームへ戻る
                </Link>
            </div>
        </div>
    );
}
