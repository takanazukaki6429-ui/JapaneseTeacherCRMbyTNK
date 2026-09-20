'use client';

/**
 * 授業の流れの中身を並べる部分（見出しの出し方・絵の出し方）
 *
 * 記録の画面（1授業ぶん）と、生徒の1枚（過去の授業の一覧）の両方から使う。
 * 同じ見え方にするため、並べる処理はここ1か所にまとめる。
 */
import type { SavedFlowItem } from '@/lib/lesson-flow';

/** 種類ごとの見出しと色。ライブ授業の画面と同じ言葉づかいに合わせる */
const KIND_LABEL: Record<string, { label: string; tone: string }> = {
    said: { label: '先生', tone: 'bg-[#f4f1fb] text-[#3a3350]' },
    'student-said': { label: '生徒', tone: 'bg-[#e8f6ef] text-[#1f5c45]' },
    suggest: { label: 'ASTAの提案', tone: 'bg-[#fdf6e7] text-[#8a6d1f]' },
    'translate-help': { label: 'ことばの補助', tone: 'bg-[#fdf6e7] text-[#8a6d1f]' },
    illust: { label: '絵', tone: 'bg-[#fbeef5] text-[#8a3f68]' },
    material: { label: '作った教材', tone: 'bg-[#efe9ff] text-[#5a4c94]' },
    asked: { label: '先生の質問', tone: 'bg-[#f4f1fb] text-[#3a3350]' },
    answer: { label: '質問への答え', tone: 'bg-[#efe9ff] text-[#5a4c94]' },
    textbook: { label: '教科書', tone: 'bg-[#eef3fb] text-[#2f4a72]' },
};

export function timeOf(ts: string): string {
    const d = new Date(ts);
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' });
}

export function dateOf(ts: string): string {
    const d = new Date(ts);
    return Number.isNaN(d.getTime())
        ? ''
        : d.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Tokyo' });
}

/** 絵の住所 → 見るための期限つきの住所 の対応表を受け取って並べる */
export function LessonFlowItems({ items, signed }: { items: SavedFlowItem[]; signed: Record<string, string> }) {
    return (
        <div className="space-y-3">
            {items.map((item, i) => {
                const meta = KIND_LABEL[item.kind] ?? { label: item.kind, tone: 'bg-[#f2f2f4] text-[#484550]' };
                const url = item.imgPath ? signed[item.imgPath] : undefined;

                return (
                    <div key={i} className="rounded-lg border border-[#efeaf8] p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                            <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${meta.tone}`}>
                                {meta.label}
                            </span>
                            {item.title && <span className="text-[13px] font-bold text-[#3a3350]">{item.title}</span>}
                            <span className="ml-auto text-[12px] text-[#807a8d]">{timeOf(item.ts)}</span>
                        </div>

                        {item.text && (
                            <p className="text-[14px] leading-relaxed text-[#3a3350] whitespace-pre-wrap">{item.text}</p>
                        )}
                        {item.translation && (
                            <p className="mt-1 text-[13px] text-[#484550] whitespace-pre-wrap">{item.translation}</p>
                        )}

                        {item.imgPath && (
                            <div className="mt-2 space-y-2">
                                <div>
                                    <p className="text-[12px] text-[#807a8d] mb-1">
                                        {item.imgShown === 'quality' ? '授業で見せた絵（きれいな版）' : '授業で見せた絵（速い版）'}
                                    </p>
                                    {url
                                        // eslint-disable-next-line @next/next/no-img-element
                                        ? <img src={url} alt="授業で見せた絵" className="w-full max-w-md rounded-lg" />
                                        : <p className="text-[13px] text-[#807a8d]">絵を読み込めませんでした</p>}
                                </div>

                                {/* もう一方の絵。押した時点で2枚とも作られているので、見せなかったほうも残している */}
                                {item.imgAltPath && (
                                    <div>
                                        <p className="text-[12px] text-[#807a8d] mb-1">
                                            {item.imgShown === 'quality' ? 'もう一方（速い版）' : 'もう一方（きれいな版）'}
                                        </p>
                                        {signed[item.imgAltPath]
                                            // eslint-disable-next-line @next/next/no-img-element
                                            ? <img src={signed[item.imgAltPath]} alt="もう一方の絵" className="w-full max-w-md rounded-lg opacity-90" />
                                            : <p className="text-[13px] text-[#807a8d]">絵を読み込めませんでした</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        {item.imgs && item.imgs.length > 0 && (
                            <div className="mt-2 space-y-2">
                                {item.imgs.map((src, k) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img key={k} src={src} alt="教科書のページ" className="w-full max-w-md rounded-lg" />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
