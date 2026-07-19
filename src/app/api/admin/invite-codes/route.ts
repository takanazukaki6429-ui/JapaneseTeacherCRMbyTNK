/**
 * 招待コードの一覧・発行（管理者専用API）
 *
 * これまで画面側がデータ口を直接叩いていた（RLSで全教師に開放）のを、
 * サーバ側の管理者チェック＋管理者権限接続に寄せる。
 * データ層の匿名・一般ポリシーは廃止済みのため、この経路が唯一の操作口。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/admin';
import { logAudit } from '@/lib/audit';
import { randomInt } from 'crypto';

export const dynamic = 'force-dynamic';

async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
        return null;
    }
    return user;
}

// 紛らわしい文字（I, 1, O, 0）を除いた8文字コード: A8F3-K9P2 形式
function generateCodeString(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let codeStr = '';
    for (let i = 0; i < 8; i++) {
        if (i === 4) codeStr += '-';
        codeStr += chars.charAt(randomInt(chars.length));
    }
    return codeStr;
}

export async function GET() {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('invite_codes')
        .select('id, code, used_at, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('invite_codes list failed:', error);
        return NextResponse.json({ error: '招待コードの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ codes: data ?? [] });
}

export async function POST(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const admin = createAdminClient();

    // code列はUNIQUEのため、万一の衝突は再生成でリトライ
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        const codeStr = generateCodeString();
        const { data, error } = await admin
            .from('invite_codes')
            .insert({ code: codeStr, created_by: user.id })
            .select('id, code, used_at, created_at')
            .single();

        if (!error && data) {
            await logAudit({
                action: 'invite_code.create',
                actorUserId: user.id,
                actorEmail: user.email,
                resourceType: 'invite_code',
                resourceId: data.id,
                outcome: 'success',
                req,
            });
            return NextResponse.json({ code: data });
        }

        lastError = error?.message ?? 'unknown';
        if (!/duplicate|unique/i.test(lastError)) break;
    }

    console.error('invite_codes create failed:', lastError);
    return NextResponse.json({ error: 'コードの発行に失敗しました' }, { status: 500 });
}
