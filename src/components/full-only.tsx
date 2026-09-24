'use client';

import { useReadOnly } from '@/lib/plan-access';

/** 「見るだけ」の先生には中身を出さない（2026-09-25 案B）。書き換える操作のボタン・入力欄を包む */
export function FullOnly({ children }: { children: React.ReactNode }) {
    const { readOnly } = useReadOnly();
    if (readOnly) return null;
    return <>{children}</>;
}
