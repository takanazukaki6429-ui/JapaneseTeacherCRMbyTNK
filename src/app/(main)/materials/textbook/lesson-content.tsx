/**
 * マスター教材の本文表示
 *
 * 投入時のMarkdownは実物docxから機械生成したもので、使われている書式は
 * 見出し・箇条書き・表・画像の4つに限られる（2026-07-26 全94課の実測）。
 * 汎用のMarkdown表示部品を入れるより、この4つだけを直接描くほうが
 * 依存も表示崩れも少ないため、ここで処理する。
 */

type Props = {
    contentMd: string;
    /** 画像の相対参照（/images/N5/01/xxx.webp）をStorageの公開URLに変換する接頭辞 */
    imageBaseUrl: string;
};

const IMAGE_LINE = /^!\[\]\((.+)\)$/;
const TABLE_DIVIDER = /^\|[\s\-|]+\|$/;

export function LessonContent({ contentMd, imageBaseUrl }: Props) {
    const lines = contentMd.split('\n');
    const blocks: React.ReactNode[] = [];
    let tableRows: string[][] = [];

    const flushTable = (key: string) => {
        if (tableRows.length === 0) return;
        const [head, ...body] = tableRows;
        blocks.push(
            <div key={key} className="overflow-x-auto my-3">
                <table className="min-w-full text-sm border-collapse">
                    <tbody>
                        {[head, ...body].map((row, ri) => (
                            <tr key={ri} className={ri === 0 ? 'bg-[#f4f3f7]' : ''}>
                                {row.map((cell, ci) => (
                                    <td
                                        key={ci}
                                        className={`border border-[#cdc3ce]/40 px-3 py-2 align-top ${
                                            ri === 0 ? 'font-bold text-[#1a1c1e]' : 'text-[#4b454e]'
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
        tableRows = [];
    };

    lines.forEach((raw, i) => {
        const line = raw.trim();

        if (!line) {
            flushTable(`t${i}`);
            return;
        }

        // 表：区切り行（|---|---|）は描画しない
        if (TABLE_DIVIDER.test(line)) return;

        if (line.startsWith('|')) {
            tableRows.push(line.replace(/^\||\|$/g, '').split('|').map(c => c.trim()));
            return;
        }
        flushTable(`t${i}`);

        // 画像
        const img = line.match(IMAGE_LINE);
        if (img) {
            const src = img[1].startsWith('/images/')
                ? imageBaseUrl + img[1].replace('/images/', '/')
                : img[1];
            blocks.push(
                // 教材画像は縦横比がまちまちなので、next/image ではなく素の img で自然な高さに任せる
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    key={`i${i}`}
                    src={src}
                    alt=""
                    loading="lazy"
                    className="my-4 w-full max-w-2xl rounded-xl border border-[#cdc3ce]/30 mx-auto"
                />
            );
            return;
        }

        // 「1. 見出し」「2-1. 小見出し」形式は見出しとして扱う
        if (/^[0-9０-９]{1,2}([\.．\-][0-9０-９]{0,2})?[\.．]?\s*\S/.test(line) && line.length <= 40) {
            blocks.push(
                <h3 key={`h${i}`} className="text-sm font-bold text-[#6f5385] mt-5 mb-1.5">
                    {line}
                </h3>
            );
            return;
        }

        // 箇条書き
        if (/^[・･]/.test(line)) {
            blocks.push(
                <p key={`l${i}`} className="text-sm text-[#4b454e] leading-relaxed pl-4 -indent-4">
                    {line}
                </p>
            );
            return;
        }

        blocks.push(
            <p key={`p${i}`} className="text-sm text-[#1a1c1e] leading-relaxed whitespace-pre-wrap">
                {line}
            </p>
        );
    });

    flushTable('t-last');

    return <div className="space-y-1">{blocks}</div>;
}
