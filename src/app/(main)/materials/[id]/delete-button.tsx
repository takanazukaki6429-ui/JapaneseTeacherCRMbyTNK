'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trash2 } from 'lucide-react';

export function DeleteMaterialButton({ id }: { id: string }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm('本当にこの資産を削除しますか？')) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('materials').delete().eq('id', id);
            if (error) throw error;
            router.push('/materials');
            router.refresh();
        } catch (error) {
            console.error('Error deleting material:', error);
            alert('削除に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="削除する"
        >
            <Trash2 size={20} />
        </button>
    );
}
