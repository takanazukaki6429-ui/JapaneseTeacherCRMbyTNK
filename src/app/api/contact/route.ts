import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRequestIdentifier } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * 料金ページの「個別に相談する」フォームの送信先（2026-09-24 かずき指示「お問い合わせはボタン→フォーム→メールに飛んでくる」）。
 * ログイン前でも送れる（料金ページは公開）。送信内容を運営者（かずき）にメールで送る。
 * 返信しやすいよう、メールの返信先（reply_to）を送信者のアドレスにする。
 *
 * 迷惑送信の対策：
 *  - 同じ接続元から10分に3回まで
 *  - 人には見えない入力欄（website）に何か入っていたら機械とみなし、成功のふりをして捨てる
 *  - 文字数の上限・メールアドレスの形の確認
 * 送り先は CONTACT_EMAIL（未設定なら ADMIN_NOTIFY_EMAIL＝運営者への通知と同じ宛先）。
 * RESEND_API_KEY が無い環境では送れないので 503 を返し、画面にメールアドレスでの連絡を案内する。
 */

const TOPICS: Record<string, string> = {
    more: 'プロより多く使いたい',
    image: '画像生成を使いたい',
    other: 'その他',
};

const MAX = { name: 80, email: 200, message: 2000, count: 20 };

export async function POST(req: NextRequest) {
    const rate = checkRateLimit(getRequestIdentifier(req), { scope: 'contact', limit: 3, windowMs: 10 * 60_000 });
    if (!rate.allowed) {
        return NextResponse.json(
            { error: '短い時間に何度も送信されています。少し時間をおいてからお試しください。' },
            { status: 429, headers: { 'Retry-After': String(rate.retryAfterSec) } }
        );
    }

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: '送信内容を読み取れませんでした。' }, { status: 400 });
    }

    // 機械の送信（人には見えない欄が埋まっている）→ 成功のふりをして何もしない
    if (String(body.website ?? '').trim()) {
        return NextResponse.json({ ok: true });
    }

    const name = String(body.name ?? '').trim().slice(0, MAX.name);
    const email = String(body.email ?? '').trim().slice(0, MAX.email);
    const topic = TOPICS[String(body.topic ?? '')] ?? TOPICS.other;
    const students = String(body.students ?? '').trim().slice(0, MAX.count);
    const lessons = String(body.lessons ?? '').trim().slice(0, MAX.count);
    const message = String(body.message ?? '').trim().slice(0, MAX.message);

    if (!name || !email || !message) {
        return NextResponse.json({ error: 'お名前・メールアドレス・ご相談の内容を入力してください。' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json({ error: 'メールアドレスの形が正しくありません。' }, { status: 400 });
    }

    const key = process.env.RESEND_API_KEY;
    const to = process.env.CONTACT_EMAIL || process.env.ADMIN_NOTIFY_EMAIL;
    const from = process.env.RESEND_FROM || 'ASTA <onboarding@resend.dev>';
    if (!key || !to) {
        console.error('[contact] RESEND_API_KEY or destination is not set');
        return NextResponse.json({ error: 'not_configured' }, { status: 503 });
    }

    const text = [
        '料金ページの「個別に相談する」から送信がありました。',
        '',
        `お名前：${name}`,
        `メール：${email}`,
        `ご相談：${topic}`,
        `生徒の人数：${students || '（未記入）'}`,
        `週の授業数：${lessons || '（未記入）'}`,
        '',
        '--- 内容 ---',
        message,
        '',
        '--',
        '返信すると、送信者のメールアドレスに届きます。',
        new Date().toISOString(),
    ].join('\n');

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from,
                to: [to],
                reply_to: email,
                subject: `[ASTA/相談] ${topic}（${name}様）`,
                text,
            }),
        });
        if (!res.ok) {
            console.error('[contact] Resend failed:', res.status, await res.text());
            return NextResponse.json({ error: 'send_failed' }, { status: 502 });
        }
    } catch (e) {
        console.error('[contact] unexpected error:', e);
        return NextResponse.json({ error: 'send_failed' }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
}
