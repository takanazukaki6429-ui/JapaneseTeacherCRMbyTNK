/**
 * 料金の一元管理
 *
 * 価格は「料金ページ」「プラン画面」「利用規約」「特定商取引法に基づく表記」の
 * 4箇所に出る。2026-08-13 時点で料金ページとプラン画面は ¥3,980、
 * 規約の下書きは ¥9,800 と食い違っていた。請求額と表示・規約がずれるのは
 * 重大な問題（法的にも信用面でも）なので、ここ1箇所から配る。
 *
 * 価格は 2026-09末までに実運用データを見て確定する予定（あいちゃん合意済みのレンジは
 * 月¥8,000〜10,000）。確定したら環境変数 NEXT_PUBLIC_PLAN_PRICE_JPY を設定する。
 * 未設定のときは「準備中」として扱い、数字を出さない。
 *
 * ⚠️ かずきの指示（2026-08-13）：**アプリ内にはまだ価格を出さない**。
 * 環境変数を設定するのは、かずきが明示的に「出してよい」と判断したときだけ。
 * ここにも他のファイルにも、金額を直接書かないこと。
 */

const raw = process.env.NEXT_PUBLIC_PLAN_PRICE_JPY;
const parsed = raw ? Number(raw) : NaN;

/** 月額（税込・円）。未確定なら null */
export const PLAN_PRICE_JPY: number | null =
    Number.isFinite(parsed) && parsed > 0 ? parsed : null;

/** 画面に出す料金表記。未確定なら「準備中」 */
export const PLAN_PRICE_LABEL: string =
    PLAN_PRICE_JPY === null ? '準備中' : `¥${PLAN_PRICE_JPY.toLocaleString('ja-JP')}`;

/** 「¥9,800／月（税込）」のような一文。規約・特商法表記でも使う */
export const PLAN_PRICE_SENTENCE: string =
    PLAN_PRICE_JPY === null
        ? '料金は準備中です（確定次第、事前にご案内します）'
        : `月額 ${PLAN_PRICE_LABEL}（消費税込み）`;

/** 初回の申込みからの無料期間（日）。2026-09-22 かずき決定＝7日（あいちゃんとの打ち合わせ。以前は2026-08-14決定の30日）。画面の表示と申込みの処理は必ずここを見る */
export const TRIAL_DAYS = 7;

/** 申込み前に出す説明の一文（定期購入の表示・2026-09-17） */
export const PLAN_TRIAL_SENTENCE = `最初の${TRIAL_DAYS}日間は無料です。${TRIAL_DAYS + 1}日目に最初の課金が始まります`;

/** 規約・特商法表記の施行日。課金開始に合わせて更新する */
export const LEGAL_EFFECTIVE_DATE = process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || '2026年10月1日';

/** 事業者の連絡先（特定商取引法に基づく表記で使う） */
export const BUSINESS_CONTACT_EMAIL =
    process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'takanazukaki6429@gmail.com';
