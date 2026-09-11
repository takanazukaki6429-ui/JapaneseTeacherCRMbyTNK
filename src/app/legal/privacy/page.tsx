import fs from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LegalDocument } from '../legal-document';

export const metadata = { title: 'プライバシーポリシー | ASTA' };

export default async function PrivacyPage() {
    const markdown = await fs.readFile(
        path.join(process.cwd(), 'src/content/legal/privacy-policy.md'),
        'utf-8'
    );

    return (
        <div className="min-h-screen bg-[#f6f3fb] px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm text-[#6b5ca5] hover:underline mb-6"
                >
                    <ArrowLeft size={15} />
                    ASTAに戻る
                </Link>
                <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)] px-6 py-8">
                    <LegalDocument markdown={markdown} />
                </div>
                <p className="text-center text-xs text-[#484550] mt-6">
                    <Link href="/legal/terms" className="text-[#6b5ca5] hover:underline">
                        利用規約・特定商取引法に基づく表記
                    </Link>
                </p>
            </div>
        </div>
    );
}
