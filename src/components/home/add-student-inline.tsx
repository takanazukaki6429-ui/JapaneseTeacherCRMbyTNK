'use client';

/**
 * ホームの「生徒を追加」：画面を移動せずに、名前・国・レベル・目的を入れて登録する
 * （画面の要素一覧_2026-09-10.md 画面1）。登録の書き方は生徒の新規登録画面（students/new）と同じ。
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusCircle, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { ja } from '@/app/(main)/roadmap/ja';

const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

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

    const field = 'w-full text-[15px] px-3 py-2.5 rounded-xl border border-[#dccfc4] bg-white text-[#3b2e2a] focus:outline-none focus:ring-2 focus:ring-[#d9a7ae]';

    return (
        <div className="rounded-3xl border-2 border-dashed border-[#dccfc4] bg-white/60">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left"
            >
                <span className="flex items-center gap-2 text-[15px] font-bold text-[#9c4f5a]">
                    <PlusCircle size={18} /> 生徒を追加
                </span>
                <span className="flex items-center gap-2 text-xs text-[#534344]">
                    この画面のまま登録できます <ChevronDown size={16} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
                </span>
            </button>
            {open && (
                <form onSubmit={submit} className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="space-y-1">
                        <span className="text-xs font-bold text-[#534344]">名前（必須）</span>
                        <input value={name} onChange={e => setName(e.target.value)} required placeholder="例：マリア" className={field} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold text-[#534344]">国</span>
                        <input value={nationality} onChange={e => setNationality(e.target.value)} placeholder="例：ブラジル" className={field} />
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold text-[#534344]">レベル</span>
                        <select value={level} onChange={e => setLevel(e.target.value)} className={field}>
                            <option value="">まだ分からない</option>
                            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </label>
                    <label className="space-y-1">
                        <span className="text-xs font-bold text-[#534344]">日本語を学ぶ目的</span>
                        <select value={purpose} onChange={e => setPurpose(e.target.value)} className={field}>
                            <option value="">まだ分からない</option>
                            {(Object.entries(ja.purposes) as [string, { label: string }][]).map(([key, p]) => (
                                <option key={key} value={key}>{p.label}</option>
                            ))}
                        </select>
                    </label>
                    <div className="sm:col-span-2 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving || !name.trim()}
                            className="bg-[#9c4f5a] hover:bg-[#8a434d] disabled:opacity-50 text-white text-[15px] font-bold px-6 py-2.5 rounded-full flex items-center gap-2 transition-colors"
                        >
                            {saving && <Loader2 size={16} className="animate-spin" />} 登録する
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}
