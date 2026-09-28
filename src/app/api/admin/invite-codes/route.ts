/**
 * 招待コードの一覧・発行・渡した相手の記録（管理者専用API）
 *
 * これまで画面側がデータ口を直接叩いていた（RLSで全教師に開放）のを、
 * サーバ側の管理者チェック＋管理者権限接続に寄せる。
 * データ層の匿名・一般ポリシーは廃止済みのため、この経路が唯一の操作口。
 *
 * 2026-09-29：コードごとに「渡した相手（consultant＝コンサルタントの呼び名）」を記録する。
 * 紹介の取り分を数えるため（lib/consultant-report.ts）。保管庫に列が無い間（SQL を流す前）も
 * 一覧と相手なしの発行は動くようにし、相手を記録しようとしたときだけ分かる言葉で止める。
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isAdminEmail } from '@/lib/admin';
import { logAudit } from '@/lib/audit';
import { randomInt } from 'crypto';
import { isMissingConsultantColumn, normalizeConsultant } from '@/lib/consultant-report';

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
    const withConsultant = await admin
        .from('invite_codes')
        .select('id, code, used_at, created_at, consultant')
        .order('created_at', { ascending: false });

    if (!withConsultant.error) {
        return NextResponse.json({ codes: withConsultant.data ?? [], consultantColumn: true });
    }
    if (!isMissingConsultantColumn(withConsultant.error)) {
        console.error('invite_codes list failed:', withConsultant.error);
        return NextResponse.json({ error: '招待コードの取得に失敗しました' }, { status: 500 });
    }

    // 列が無い保管庫（SQL を流す前）：相手なしで一覧を出す
    const { data, error } = await admin
        .from('invite_codes')
        .select('id, code, used_at, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('invite_codes list failed:', error);
        return NextResponse.json({ error: '招待コードの取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ codes: data ?? [], consultantColumn: false });
}

const MISSING_COLUMN_MESSAGE =
    '保管庫に「渡した相手」の列がまだありません。sql_2026-09-29_招待コードに渡した相手.sql を Supabase Studio で流してください';

export async function POST(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const consultant = normalizeConsultant((body as { consultant?: unknown }).consultant);

    const admin = createAdminClient();

    // code列はUNIQUEのため、万一の衝突は再生成でリトライ
    let lastError: string | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
        const codeStr = generateCodeString();
        const { data, error } = await admin
            .from('invite_codes')
            .insert(consultant ? { code: codeStr, created_by: user.id, consultant } : { code: codeStr, created_by: user.id })
            .select(consultant ? 'id, code, used_at, created_at, consultant' : 'id, code, used_at, created_at')
            .single();

        if (!error && data) {
            const created = data as unknown as { id: string };
            await logAudit({
                action: 'invite_code.create',
                actorUserId: user.id,
                actorEmail: user.email,
                resourceType: 'invite_code',
                resourceId: created.id,
                outcome: 'success',
                metadata: consultant ? { consultant } : {},
                req,
            });
            return NextResponse.json({ code: data });
        }

        if (isMissingConsultantColumn(error)) {
            return NextResponse.json({ error: MISSING_COLUMN_MESSAGE }, { status: 409 });
        }
        lastError = error?.message ?? 'unknown';
        if (!/duplicate|unique/i.test(lastError)) break;
    }

    console.error('invite_codes create failed:', lastError);
    return NextResponse.json({ error: 'コードの発行に失敗しました' }, { status: 500 });
}

/** 発行済みのコードの「渡した相手」を記録・直す（空にすると記録を消す） */
export async function PATCH(req: NextRequest) {
    const user = await requireAdmin();
    if (!user) {
        return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 });
    }

    const body = (await req.json().catch(() => null)) as { id?: unknown; consultant?: unknown } | null;
    const id = typeof body?.id === 'string' ? body.id : null;
    if (!id) {
        return NextResponse.json({ error: 'コードの指定がありません' }, { status: 400 });
    }
    const consultant = normalizeConsultant(body?.consultant);

    const admin = createAdminClient();
    const { data, error } = await admin
        .from('invite_codes')
        .update({ consultant })
        .eq('id', id)
        .select('id, code, used_at, created_at, consultant')
        .maybeSingle();

    if (error) {
        if (isMissingConsultantColumn(error)) {
            return NextResponse.json({ error: MISSING_COLUMN_MESSAGE }, { status: 409 });
        }
        console.error('invite_codes consultant update failed:', error);
        return NextResponse.json({ error: '渡した相手の記録に失敗しました' }, { status: 500 });
    }
    if (!data) {
        return NextResponse.json({ error: 'コードが見つかりません' }, { status: 404 });
    }

    // 監査ログの操作種別は保管庫の側で決まった値しか入らないため、管理者の操作として残し、中身は metadata に書く
    await logAudit({
        action: 'admin.access',
        actorUserId: user.id,
        actorEmail: user.email,
        resourceType: 'invite_code',
        resourceId: id,
        outcome: 'success',
        metadata: { op: 'invite_code.set_consultant', consultant },
        req,
    });

    return NextResponse.json({ code: data });
}
