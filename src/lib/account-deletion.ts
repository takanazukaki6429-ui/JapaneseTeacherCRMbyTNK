/**
 * アカウントの削除と Stripe の契約（2026-10-09 かずき決定）
 *
 * 直す前：削除を止めるのは「契約中（有効）で、無料の印が無い」時だけだった。
 * お試し中・支払いが止まっている時・無料の印がある先生の契約は、契約が動いたままアカウントだけ消え、
 * お試しの8日目などに、消した先生のカードに課金される恐れがあった。
 *
 * 直した後：削除の時に、ASTA が Stripe の契約をその場で止めてから消す（お試し中は料金なし・
 * 契約中は残りの日数の返金なし＝規約 第6条どおり）。先に解約しなくても削除できる。
 * 止められなかった時は、削除をやめる（契約だけが残るのを防ぐ）。
 *
 * 消した後に届く Stripe の通知（契約が止まった知らせ）は、更新する先生の行が無いのが正しいので、
 * Stripe の客に「削除済み」の印を付けておき、通知の受け口はそれを見て失敗扱いにしない（app/api/stripe/webhook）。
 * ここは判定だけ（テスト対象）。
 */

/** まだ課金が起きうる契約の状態（Stripe の status） */
export const LIVE_SUBSCRIPTION_STATUSES = ['active', 'trialing', 'past_due', 'unpaid', 'incomplete'] as const;

/** Stripe の客に付ける「ASTA のアカウントは削除済み」の印（値は削除した日時） */
export const DELETED_ACCOUNT_METADATA_KEY = 'asta_account_deleted';

type BillingRow = {
    subscription_status?: string | null;
    stripe_subscription_id?: string | null;
} | null | undefined;

/** 削除の前に止める契約の番号。止める物が無ければ null */
export function subscriptionToCancel(row: BillingRow): string | null {
    const id = row?.stripe_subscription_id?.trim();
    if (!id) return null;
    const status = row?.subscription_status ?? '';
    return (LIVE_SUBSCRIPTION_STATUSES as readonly string[]).includes(status) ? id : null;
}

/** 止めようとした結果が「もう止まっている」か（止める時に失敗した後、契約を読み直して決める） */
export function isAlreadyStopped(status: string | null | undefined): boolean {
    return status === 'canceled' || status === 'incomplete_expired';
}

type CustomerLike = { deleted?: boolean; metadata?: Record<string, string> | null } | null | undefined;

/** Stripe の客が、ASTA で削除したアカウントの客か（Stripe で客ごと消してある時も含む） */
export function isDeletedAccountCustomer(customer: CustomerLike): boolean {
    if (!customer) return false;
    if (customer.deleted === true) return true;
    return Boolean(customer.metadata?.[DELETED_ACCOUNT_METADATA_KEY]);
}
