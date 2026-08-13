import fs from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { LegalDocument } from '../legal-document';

export const metadata = { title: '利用規約 | ASTA' };

export default async function TermsPage() {
    const markdown = await fs.readFile(
        path.join(process.cwd(), 'src/content/legal/terms-of-service.md'),
        'utf-8'
    );

    return (
        <div className="min-h-screen bg-[#faf9fd] px-4 py-8">
            <div className="max-w-3xl mx-auto">
                <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm text-[#6f5385] hover:underline mb-6"
                >
                    <ArrowLeft size={15} />
                    ASTAに戻る
                </Link>
                <div className="bg-white rounded-2xl shadow-[0_0_40px_rgba(111,83,133,0.06)] px-6 py-8">
                    <LegalDocument markdown={markdown} />
                </div>
                <p className="text-center text-xs text-[#4b454e] mt-6">
                    <Link href="/legal/privacy" className="text-[#6f5385] hover:underline">
                        プライバシーポリシー
                    </Link>
                </p>
            </div>
        </div>
    );
}
