'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Trash2 } from 'lucide-react';

export function DeleteStudentButton({ id }: { id: string }) {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);

    const handleDelete = async () => {
        if (!confirm('本当にこの生徒を削除しますか？\nこの操作は取り消せません。')) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (error) throw error;
            router.push('/students');
            router.refresh();
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('削除に失敗しました。');
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDelete}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200 text-sm font-medium"
        >
            <Trash2 size={16} />
            {loading ? '削除中...' : '削除'}
        </button>
    );
}
