'use client';

/**
 * 課の中の見出し一覧。1課あたり5〜17セクションあるため、
 * 授業中に目的の箇所へすぐ飛べるようにする。
 */
type Props = { sections: { id: string; label: string }[] };

export function SectionNav({ sections }: Props) {
    return (
        <div className="bg-white px-4 py-3 rounded-2xl shadow-[0_0_40px_rgba(107,92,165,0.06)]">
            <div className="flex flex-wrap gap-1.5">
                {sections.map(s => (
                    <button
                        key={s.id}
                        onClick={() => document.getElementById(s.id)?.scrollIntoView({ behavior: 'smooth' })}
                        className="px-3 py-1.5 text-xs font-medium text-[#484550] bg-[#f0ebf8] rounded-lg hover:bg-[#efe9ff] hover:text-[#6b5ca5] transition-colors"
                    >
                        {s.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
