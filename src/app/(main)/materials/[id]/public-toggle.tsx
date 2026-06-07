'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Globe, Lock, Loader2 } from 'lucide-react';

type Props = {
    id: string;
    isPublic: boolean;
};

export function PublicToggleButton({ id, isPublic }: Props) {
    const [loading, setLoading] = useState(false);
    const [current, setCurrent] = useState(isPublic);
    const router = useRouter();

    const toggle = async () => {
        setLoading(true);
        const supabase = createClient();
        const next = !current;
        const { error } = await supabase
            .from('materials')
            .update({ is_public: next })
            .eq('id', id);

        if (!error) {
            setCurrent(next);
            router.refresh();
        }
        setLoading(false);
    };

    return (
        <button
            onClick={toggle}
            disabled={loading}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
                current
                    ? 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
        >
            {loading ? (
                <Loader2 size={15} className="animate-spin" />
            ) : current ? (
                <Globe size={15} />
            ) : (
                <Lock size={15} />
            )}
            {current ? '公開中' : '非公開'}
        </button>
    );
}
