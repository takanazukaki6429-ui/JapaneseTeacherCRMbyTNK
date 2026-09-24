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

// 2026-09-23 以降は3段（下の PLAN_TIERS）。旧・単一価格の NEXT_PUBLIC_PLAN_PRICE_JPY は「レギュラー」の代わりとして読む（互換）
const raw = process.env.NEXT_PUBLIC_PLAN_PRICE_JPY_REGULAR ?? process.env.NEXT_PUBLIC_PLAN_PRICE_JPY;
const parsed = raw ? Number(raw) : NaN;

/** レギュラーの月額（税込・円）。未確定なら null（旧コードとの互換のため残す） */
export const PLAN_PRICE_JPY: number | null =
    Number.isFinite(parsed) && parsed > 0 ? parsed : null;

/** 画面に出す料金表記（レギュラー）。未確定なら「準備中」 */
export const PLAN_PRICE_LABEL: string =
    PLAN_PRICE_JPY === null ? '準備中' : `¥${PLAN_PRICE_JPY.toLocaleString('ja-JP')}`;

/** 初回の申込みからの無料期間（日）。2026-09-22 かずき決定＝7日（あいちゃんとの打ち合わせ。以前は2026-08-14決定の30日）。画面の表示と申込みの処理は必ずここを見る */
export const TRIAL_DAYS = 7;

/** 申込み前に出す説明の一文（定期購入の表示・2026-09-17） */
export const PLAN_TRIAL_SENTENCE = `最初の${TRIAL_DAYS}日間は無料です。${TRIAL_DAYS + 1}日目に最初の課金が始まります`;

/**
 * プランの段（2026-09-23 かずき決定・案B）。段の差は「翻訳モードの月の分数」だけ（機能は同じ・絵は0）。
 * 分数は「毎回60分つけっぱなし × 生徒のめやす × 月4.3回」で置く＝ふつうの使い方なら届かない。
 * 金額はここに書かない（環境変数から。上の注意のとおり）
 */
export type PlanTier = 'light' | 'regular' | 'pro';
export const PLAN_TIER_KEYS: PlanTier[] = ['light', 'regular', 'pro'];

/** 段ごとの月額（税込・円）。環境変数 NEXT_PUBLIC_PLAN_PRICE_JPY_LIGHT / _REGULAR / _PRO。未設定なら null＝準備中 */
function priceFromEnv(raw: string | undefined): number | null {
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n > 0 ? n : null;
}
export const PLAN_TIERS: Record<PlanTier, { label: string; students: number; translationMinutes: number; priceJpy: number | null }> = {
    light:   { label: 'ライト',   students: 10, translationMinutes: 2580,  priceJpy: priceFromEnv(process.env.NEXT_PUBLIC_PLAN_PRICE_JPY_LIGHT) },
    regular: { label: 'レギュラー', students: 20, translationMinutes: 5160,  priceJpy: priceFromEnv(process.env.NEXT_PUBLIC_PLAN_PRICE_JPY_REGULAR) },
    pro:     { label: 'プロ',     students: 40, translationMinutes: 10320, priceJpy: priceFromEnv(process.env.NEXT_PUBLIC_PLAN_PRICE_JPY_PRO) },
};
export const isPlanTier = (v: unknown): v is PlanTier => typeof v === 'string' && (PLAN_TIER_KEYS as string[]).includes(v);

export const yen = (n: number) => `¥${n.toLocaleString('ja-JP')}`;
/** 段の月額の表記（「¥2,980」／未設定なら「準備中」） */
export const tierPriceLabel = (tier: PlanTier): string => {
    const p = PLAN_TIERS[tier].priceJpy;
    return p === null ? '準備中' : yen(p);
};
/** 授業1回あたりの金額（月額 ÷ 生徒のめやす × 月4.3回）。全プランに併記する＝かずき指示 2026-09-23 */
export const tierPerLessonLabel = (tier: PlanTier): string | null => {
    const p = PLAN_TIERS[tier].priceJpy;
    if (p === null) return null;
    return yen(Math.round(p / (PLAN_TIERS[tier].students * 4.3)));
};
/** 3段がすべて確定しているか（1つでも未設定なら画面・規約は「準備中」） */
export const ALL_TIER_PRICES_SET = PLAN_TIER_KEYS.every(t => PLAN_TIERS[t].priceJpy !== null);

/** 無料お試し（7日）の間の翻訳モードの上限（分）。2026-09-23 かずき決定 */
export const TRIAL_TRANSLATION_MINUTES = 180;
/** 既存の先生（is_free）の翻訳モードの月の上限（分）。⚠️ 仮の値＝ライトと同じ。数字はかずき未決（2026-09-22「翻訳と絵に月の上限」のみ決定） */
export const FREE_LEGACY_TRANSLATION_MINUTES = 2580;

/**
 * 追加パック（2026-09-23 かずき決定）：翻訳モード＋500分・1回買い・買った日から90日で失効・何回でも買える。
 * 金額は環境変数 NEXT_PUBLIC_PACK_PRICE_JPY（税込）。未設定なら売らない（ボタンを出さない）
 */
export const PACK_MINUTES = 500;
export const PACK_VALID_DAYS = 90;
export const PACK_PRICE_JPY: number | null = priceFromEnv(process.env.NEXT_PUBLIC_PACK_PRICE_JPY);
export const PACK_PRICE_LABEL: string = PACK_PRICE_JPY === null ? '準備中' : yen(PACK_PRICE_JPY);
export const PACK_SENTENCE: string = PACK_PRICE_JPY === null
    ? '追加パックは準備中です'
    : `追加パック（翻訳モード ${PACK_MINUTES}分・${PACK_VALID_DAYS}日間有効）1回 ${PACK_PRICE_LABEL}（消費税込み）`;

/** 3段の料金の一文（規約 第5条・特商法の「販売価格」で使う）。1つでも未設定なら準備中 */
export const PLAN_PRICE_SENTENCE: string = ALL_TIER_PRICES_SET
    ? PLAN_TIER_KEYS.map(t => `${PLAN_TIERS[t].label}プラン 月額 ${tierPriceLabel(t)}（翻訳モード ${PLAN_TIERS[t].translationMinutes.toLocaleString('ja-JP')}分/月まで）`).join('／') + '（いずれも消費税込み）'
    : '料金は準備中です（確定次第、事前にご案内します）';

/** 規約・特商法表記の施行日。課金開始に合わせて更新する */
export const LEGAL_EFFECTIVE_DATE = process.env.NEXT_PUBLIC_LEGAL_EFFECTIVE_DATE || '2026年10月1日';

/** 事業者の連絡先（特定商取引法に基づく表記で使う） */
export const BUSINESS_CONTACT_EMAIL =
    process.env.NEXT_PUBLIC_BUSINESS_EMAIL || 'takanazukaki6429@gmail.com';
