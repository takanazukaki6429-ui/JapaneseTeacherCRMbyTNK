'use client';

/**
 * ホームの「生徒を追加」：画面を移動せずに、名前・国・レベル・目的を入れて登録する
 * （画面の要素一覧_2026-09-10.md 画面1／見た目は画面案 ホーム_色D書体E.html）。
 * 登録の書き方は生徒の新規登録画面（students/new）と同じ。
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ja } from '@/app/(main)/roadmap/ja';

const LEVELS = [
    { value: 'N5', label: '初級（N5）' },
    { value: 'N4', label: '初中級（N4）' },
    { value: 'N3', label: '中級（N3）' },
    { value: 'N2', label: '上級（N2）' },
    { value: 'N1', label: '最上級（N1）' },
];

const FIELD = 'w-full h-[46px] rounded-xl border border-[#6b5ca5]/20 bg-[#fdf7ff] px-3.5 text-[15px] text-[#3a3350] placeholder:text-[#7d7789] focus:outline-none focus:ring-2 focus:ring-[#6b5ca5]/20 focus:border-[#6b5ca5]';
const LABEL = 'block text-[12px] leading-[18px] text-[#484550] mb-1 font-medium';

export function AddStudentInline({ openByDefault = false }: { openByDefault?: boolean }) {
    const router = useRouter();
    const [open, setOpen] = useState(openByDefault);
    const [name, setName] = useState('');
    const [nationality, setNationality] = useState('');
    const [level, setLevel] = useState('');
    const [purpose, setPurpose] = useState('');
    const [saving, setSaving] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSaving(true);
        try {
            const supabase = createClient();
            const row = {
                name: name.trim(),
                nationality: nationality.trim() || null,
                jlpt_level: level || null,
                purposes: purpose || null,
            };
            const { error } = await supabase.from('students').insert([row] as never);
            if (error) throw error;
            toast.success(`${row.name}さんを登録しました`);
            setName(''); setNationality(''); setLevel(''); setPurpose('');
            router.refresh();
        } catch (err) {
            console.error('[home] add student failed', err);
            toast.error('生徒を登録できませんでした。もう一度お試しください');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-2 bg-white/80 rounded-3xl border-2 border-dashed border-[#6b5ca5]/20 p-5 transition-all">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                aria-expanded={open}
                className="w-full flex items-center justify-between text-[#6b5ca5] select-none font-semibold text-[15px] leading-[22px]"
            >
                <span className="flex items-center gap-2">
                    <PlusCircle size={20} strokeWidth={1.6} /> 生徒を追加
                </span>
                {!open && <span className="text-[12px] leading-[18px] font-normal text-[#484550]">その場で登録できます</span>}
                <ChevronDown size={20} strokeWidth={1.6} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <form onSubmit={submit} className="pt-5 mt-4 border-t border-[#e8ddff]/40 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className={LABEL} htmlFor="add-name">お名前（必須）</label>
                            <input id="add-name" value={name} onChange={e => setName(e.target.value)} required placeholder="例：アンナ" className={FIELD} />
                        </div>
                        <div>
                            <label className={LABEL} htmlFor="add-country">国・地域</label>
                            <input id="add-country" value={nationality} onChange={e => setNationality(e.target.value)} placeholder="例：フランス" className={FIELD} />
                        </div>
                        <div>
                            <label className={LABEL} htmlFor="add-level">日本語レベル</label>
                            <select id="add-level" value={level} onChange={e => setLevel(e.target.value)} className={FIELD}>
                                <option value="">まだ分からない</option>
                                {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row md:items-end gap-3">
                        <div className="flex-1">
                            <label className={LABEL} htmlFor="add-purpose">日本語を学ぶ目的</label>
                            <select id="add-purpose" value={purpose} onChange={e => setPurpose(e.target.value)} className={FIELD}>
                                <option value="">まだ分からない</option>
                                {(Object.entries(ja.purposes) as [string, { label: string }][]).map(([key, p]) => (
                                    <option key={key} value={key}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="bg-[#6b5ca5] text-white px-6 py-2.5 rounded-xl text-[15px] leading-[22px] font-semibold hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />} 登録する
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
