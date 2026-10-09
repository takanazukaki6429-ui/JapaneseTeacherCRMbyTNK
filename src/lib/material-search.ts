/**
 * 教材の一覧の検索（2026-10-09）。前は検索欄に入れても絞り込まれなかった。
 * タイトル・タグ・内容に、入れた言葉がすべて入っている教材だけを残す（空白で区切ると「かつ」）。大文字と小文字は区別しない
 */
type Searchable = { title?: string | null; tags?: string[] | null; content?: string | null };

export function normalizeQuery(raw: unknown): string {
    return typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, 100) : '';
}

export function filterMaterials<T extends Searchable>(items: T[], query: string): T[] {
    const words = normalizeQuery(query).toLowerCase().split(' ').filter(Boolean);
    if (words.length === 0) return items;
    return items.filter(m => {
        const haystack = [m.title ?? '', ...(m.tags ?? []), m.content ?? ''].join('\n').toLowerCase();
        return words.every(w => haystack.includes(w));
    });
}
