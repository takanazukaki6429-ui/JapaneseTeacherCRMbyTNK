'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

// URLの末尾が #contact か（共有用の料金表から飛んできた時にフォームを開いておく）
const subscribeHash = (cb: () => void) => { window.addEventListener('hashchange', cb); return () => window.removeEventListener('hashchange', cb); };
const hashIsContact = () => window.location.hash === '#contact';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { BUSINESS_CONTACT_EMAIL } from '@/lib/pricing';

/**
 * 「個別に相談する」のフォーム（2026-09-24 かずき指示）。送ると運営者にメールが届く（/api/contact）。
 * 料金ページのURLの末尾が #contact のときは、開いた時点でフォームを出す（共有用の料金表から飛んでくる入口）
 */
export function ContactButton({ label = '個別に相談する', topic, className }: { label?: string; topic?: 'more' | 'image' | 'other'; className?: string }) {
    const [manual, setManual] = useState<boolean | null>(null);   // null＝まだ押していない（#contact なら開いた状態で始める）
    const fromHash = useSyncExternalStore(subscribeHash, hashIsContact, () => false);
    const open = manual ?? fromHash;
    const setOpen = (v: boolean) => {
        setManual(v);
        if (!v && window.location.hash === '#contact') history.replaceState(null, '', window.location.pathname + window.location.search);
    };
    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                className={className ?? 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-[14px] bg-[#6b5ca5] text-white font-bold text-[14px] hover:scale-[1.02] transition-transform'}
            >
                {label}
            </button>
            {open && <ContactDialog defaultTopic={topic} onClose={() => setOpen(false)} />}
        </>
    );
}

function ContactDialog({ defaultTopic = 'more', onClose }: { defaultTopic?: 'more' | 'image' | 'other'; onClose: () => void }) {
    const [form, setForm] = useState({ name: '', email: '', topic: defaultTopic as string, students: '', lessons: '', message: '', website: '' });
    const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
    const [error, setError] = useState('');
    const firstRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstRef.current?.focus();
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose]);

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setState('sending');
        setError('');
        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const msg = data.error === 'not_configured' || data.error === 'send_failed'
                    ? `送信できませんでした。お手数ですが ${BUSINESS_CONTACT_EMAIL} へメールでお送りください。`
                    : (data.error || '送信できませんでした。');
                throw new Error(msg);
            }
            setState('sent');
        } catch (err) {
            setError(err instanceof Error ? err.message : '送信できませんでした。');
            setState('idle');
        }
    };

    const input = 'w-full rounded-xl border border-[#e4ddf0] bg-white px-3 py-2.5 text-[15px] text-[#3a3350] focus:outline-none focus:ring-2 focus:ring-[#6b5ca5]/40';
    const labelCls = 'block text-[13px] font-bold text-[#3a3350] mb-1';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="contact-title" onClick={onClose}>
            <div className="w-full max-w-[520px] max-h-[90vh] overflow-y-auto rounded-[22px] bg-white p-6 text-left text-[#3a3350] shadow-xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                        <h2 id="contact-title" className="text-[20px] font-black">個別に相談する</h2>
                        <p className="text-[13px] text-[#6f6884] mt-1">内容を確認して、メールでご連絡します。</p>
                    </div>
                    <button type="button" onClick={onClose} aria-label="閉じる" className="p-1 rounded-lg text-[#6f6884] hover:bg-[#f0ebf8]"><X size={20} /></button>
                </div>

                {state === 'sent' ? (
                    <div className="py-8 text-center">
                        <CheckCircle size={40} className="mx-auto text-[#2a6f5a] mb-3" />
                        <p className="font-bold text-[16px]">送信しました。</p>
                        <p className="text-[14px] text-[#6f6884] mt-1">ご入力のメールアドレスあてにご連絡します。</p>
                        <button type="button" onClick={onClose} className="mt-6 px-6 py-2.5 rounded-[14px] bg-[#efe9ff] font-bold">閉じる</button>
                    </div>
                ) : (
                    <form onSubmit={submit} className="grid gap-3.5">
                        <div>
                            <label htmlFor="contact-name" className={labelCls}>お名前</label>
                            <input id="contact-name" ref={firstRef} required maxLength={80} value={form.name} onChange={set('name')} className={input} autoComplete="name" />
                        </div>
                        <div>
                            <label htmlFor="contact-email" className={labelCls}>メールアドレス</label>
                            <input id="contact-email" type="email" required maxLength={200} value={form.email} onChange={set('email')} className={input} autoComplete="email" />
                        </div>
                        <div>
                            <label htmlFor="contact-topic" className={labelCls}>ご相談の種類</label>
                            <select id="contact-topic" value={form.topic} onChange={set('topic')} className={input}>
                                <option value="more">プロより多く使いたい</option>
                                <option value="image">画像生成を使いたい</option>
                                <option value="other">その他</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label htmlFor="contact-students" className={labelCls}>生徒の人数（任意）</label>
                                <input id="contact-students" maxLength={20} value={form.students} onChange={set('students')} className={input} placeholder="例：50人" />
                            </div>
                            <div>
                                <label htmlFor="contact-lessons" className={labelCls}>週の授業数（任意）</label>
                                <input id="contact-lessons" maxLength={20} value={form.lessons} onChange={set('lessons')} className={input} placeholder="例：60回" />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="contact-message" className={labelCls}>ご相談の内容</label>
                            <textarea id="contact-message" required maxLength={2000} rows={5} value={form.message} onChange={set('message')} className={input} placeholder="使いたい機能や、今の授業のやり方などをお書きください" />
                        </div>
                        {/* 人には見えない欄（機械の送信を見分ける） */}
                        <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
                            <label htmlFor="contact-website">website</label>
                            <input id="contact-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
                        </div>
                        {error && <p className="text-[13px] text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
                        <button type="submit" disabled={state === 'sending'} className="mt-1 w-full py-3 rounded-[14px] bg-[#6b5ca5] text-white font-bold disabled:opacity-60 flex items-center justify-center gap-2">
                            {state === 'sending' ? <><Loader2 size={18} className="animate-spin" />送信しています…</> : '送信する'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
