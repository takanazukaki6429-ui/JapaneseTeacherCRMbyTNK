/**
 * 法的文書の表示部品
 *
 * 本文は src/content/legal/*.md に置き、価格・施行日・連絡先だけを
 * 差し込む。価格が確定していない間も、規約と実際の請求額が食い違わないよう
 * 「準備中」と表示される（src/lib/pricing.ts）。
 *
 * 使っている書式は見出し・段落・箇条書き・表・区切り線の5つだけなので、
 * 教科書表示と同様、Markdown表示ライブラリを入れずにここで描く。
 */
import {
    PLAN_PRICE_LABEL,
    PLAN_PRICE_SENTENCE,
    LEGAL_EFFECTIVE_DATE,
    BUSINESS_CONTACT_EMAIL,
} from '@/lib/pricing';

const TABLE_DIVIDER = /^\|[\s\-:|]+\|$/;

function fillPlaceholders(text: string) {
    return text
        .replaceAll('{{PRICE_SENTENCE}}', PLAN_PRICE_SENTENCE)
        .replaceAll('{{PRICE}}', PLAN_PRICE_LABEL)
        .replaceAll('{{EFFECTIVE_DATE}}', LEGAL_EFFECTIVE_DATE)
        .replaceAll('{{CONTACT_EMAIL}}', BUSINESS_CONTACT_EMAIL);
}

export function LegalDocument({ markdown }: { markdown: string }) {
    const lines = fillPlaceholders(markdown).split('\n');
    const blocks: React.ReactNode[] = [];
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
        if (!tableRows.length) return;
        const rows = tableRows;
        tableRows = [];
        blocks.push(
            <div key={key} className="overflow-x-auto my-4">
                <table className="min-w-full text-sm border-collapse">
                    <tbody>
                        {rows.map((row, ri) => (
                            <tr key={ri} className={ri === 0 ? 'bg-[#f4f3f7]' : ''}>
                                {row.map((cell, ci) => (
                                    <td
                                        key={ci}
                                        className={`border border-[#cdc3ce]/40 px-3 py-2 align-top ${
                                            ri === 0 || ci === 0
                                                ? 'font-bold text-[#1a1c1e]'
                                                : 'text-[#4b454e]'
                                        }`}
                                    >
                                        {cell}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    lines.forEach((raw, i) => {
        const line = raw.trim();

        if (!line) { flushTable(`t${i}`); return; }
        if (TABLE_DIVIDER.test(line)) return;

        if (line.startsWith('|')) {
            tableRows.push(line.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
            return;
        }
        flushTable(`t${i}`);

        if (line === '---') {
            blocks.push(<hr key={`hr${i}`} className="my-6 border-[#f4f3f7]" />);
            return;
        }
        if (line.startsWith('### ')) {
            blocks.push(
                <h3 key={i} className="text-sm font-bold text-[#1a1c1e] mt-5 mb-1.5">
                    {line.slice(4)}
                </h3>
            );
            return;
        }
        if (line.startsWith('## ')) {
            blocks.push(
                <h2 key={i} className="text-base font-bold text-[#6f5385] mt-7 mb-2">
                    {line.slice(3)}
                </h2>
            );
            return;
        }
        if (line.startsWith('# ')) {
            blocks.push(
                <h1 key={i} className="text-xl font-bold text-[#1a1c1e] mt-8 mb-3 first:mt-0">
                    {line.slice(2)}
                </h1>
            );
            return;
        }
        if (/^[-*]\s/.test(line)) {
            blocks.push(
                <p key={i} className="text-sm text-[#4b454e] leading-relaxed pl-4 -indent-3">
                    ・{line.slice(2)}
                </p>
            );
            return;
        }
        // 「1. 〜」の番号付き箇条書き
        if (/^\d+\.\s/.test(line)) {
            blocks.push(
                <p key={i} className="text-sm text-[#4b454e] leading-relaxed pl-5 -indent-5">
                    {line}
                </p>
            );
            return;
        }

        blocks.push(
            <p key={i} className="text-sm text-[#1a1c1e] leading-relaxed my-2">
                {line.replace(/\*\*/g, '')}
            </p>
        );
    });

    flushTable('t-last');

    return <div className="max-w-3xl">{blocks}</div>;
}
