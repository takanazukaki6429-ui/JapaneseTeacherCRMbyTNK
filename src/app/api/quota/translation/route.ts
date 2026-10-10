import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getTranslationQuota } from '@/lib/translation-quota';

export const dynamic = 'force-dynamic';

/** 今月の翻訳モードの使用量と上限（設定の「プランとお支払い」の画面が表示する・2026-09-23） */
export async function GET() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (!user || error) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // パックの行と丸める前の数は、計算のための物なので画面には返さない（2026-10-11）
    const q = await getTranslationQuota(supabase, user.id);
    return NextResponse.json({ tier: q.tier, capMin: q.capMin, planCapMin: q.planCapMin, packMin: q.packMin, usedMin: q.usedMin, remainingMin: q.remainingMin });
}
