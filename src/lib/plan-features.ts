/**
 * プランごとに使える機能（2026-10-04 かずき決定・あいちゃんとの MTG）
 *
 * ライトでは次の機能を使えない（レギュラー・プロは使える）：
 *   - 授業前の1枚（開いた時に自動で作る・ボタンで作る・準備の画面の「今日のテキスト」）
 *   - 例文・練習問題・言い換え（授業中に作る）
 *   - ASTAに聞く（ホーム・生徒情報・授業中）
 *   - みんなのテキスト（自分のテキストだけ見られる）
 * お試し7日間はレギュラーと同じ（全部使える）。プロはレギュラーと同じ機能＋翻訳の分数。
 *
 * 既存の無料の先生（is_free・33人）は、今の本番にある機能をそのまま無料で使える（9/24 の約束・10/4 かずき確認）。
 * ライトを申し込んでも、今の本番にある機能は残す：
 *   授業前の準備をボタンで作る／今日のテキスト／例文・練習問題・言い換え／ASTAに聞く／みんなのテキスト
 * 開いた時に自動で作る「授業前の1枚」は10月からの有料の機能なので、無料の先生には出さない（9/24 案A のまま）。
 * フリートークのネタ（2026-10-09・9-3）も10月からの機能。レギュラー以上（2026-10-05 かずき決定）で、無料の先生には出さない。
 *
 * ここは判定だけの純粋な関数（テスト対象）。画面は lib/plan-access.ts、サーバーは lib/plan-access-server.ts から使う。
 */
import { isPlanTier, type PlanTier } from '@/lib/pricing';
import { isInCourse } from '@/lib/course';

export type GatedFeature =
    | 'prep_sheet'        // 授業前の1枚を開いた時に自動で作る（生徒情報の「本日の授業指針」も）
    | 'prep_manual'       // 授業前の1枚をボタンで作る（準備の画面）
    | 'prep_material'     // 準備の画面の「今日のテキスト」（穴埋め・会話・単語カード）
    | 'free_talk'         // 授業前の1枚の「フリートークのネタ」（2026-10-05 かずき決定：レギュラー以上・10月からの機能）
    | 'improvise'         // 授業中の例文・練習問題・言い換え
    | 'ask'               // ASTAに聞く
    | 'shared_materials'; // みんなのテキスト

/** ライトでは使えない機能 */
const LIGHT_LOCKED: ReadonlySet<GatedFeature> = new Set<GatedFeature>([
    'prep_sheet', 'prep_manual', 'prep_material', 'free_talk', 'improvise', 'ask', 'shared_materials',
]);

/** 既存の無料の先生が、申し込まなくても（ライトでも）使える機能＝今の本番にある機能 */
const LEGACY_FREE: ReadonlySet<GatedFeature> = new Set<GatedFeature>([
    'prep_manual', 'prep_material', 'improvise', 'ask', 'shared_materials',
]);

export type FeatureInput = {
    isFree?: boolean | null;
    status?: string | null;
    tier?: string | null;
    /** コンサルの受講中は、この日までレギュラー扱い（lib/course.ts・2026-10-06） */
    courseEndDate?: string | null;
    /** 判定する時点（テスト用。省略すると今） */
    now?: Date;
};

/**
 * 機能の判定に使うプラン。お試し中はレギュラー扱い。契約中は保存されたプラン（読めなければ一番狭いライト）。
 * コンサルの受講中（コースが終わる日まで）は、契約していなくても・ライトで契約していても、レギュラー扱い。
 * 契約していない・止まっている時は null
 */
export function featureTier(input: FeatureInput): PlanTier | null {
    if (input.status === 'trialing') return 'regular';
    const paid: PlanTier | null = input.status === 'active' ? (isPlanTier(input.tier) ? input.tier : 'light') : null;
    if ((paid === null || paid === 'light') && isInCourse(input.courseEndDate, input.now)) return 'regular';
    return paid;
}

export type FeatureDecision =
    | { allowed: true }
    | { allowed: false; reason: 'needs_plan' | 'needs_regular' };

/** この機能を使えるか。使えない時は、申込みが要るのか（needs_plan）、レギュラー以上への変更が要るのか（needs_regular）を返す */
export function decideFeature(feature: GatedFeature, input: FeatureInput): FeatureDecision {
    if (input.isFree && LEGACY_FREE.has(feature)) return { allowed: true };
    const tier = featureTier(input);
    if (!tier) return { allowed: false, reason: 'needs_plan' };
    if (tier === 'light' && LIGHT_LOCKED.has(feature)) return { allowed: false, reason: 'needs_regular' };
    return { allowed: true };
}

export function canUseFeature(feature: GatedFeature, input: FeatureInput): boolean {
    return decideFeature(feature, input).allowed;
}

/** /api/ai の type → 判定する機能（判定しない type は null） */
export function featureForAiType(type: unknown): GatedFeature | null {
    switch (type) {
        case 'prep_sheet': return 'prep_sheet';
        case 'prep_plan': return 'prep_manual';
        case 'prep_material': return 'prep_material';
        case 'home_ask':
        case 'student_ask':
        case 'live_answer':
        case 'free_chat':
            return 'ask';
        default:
            return null;
    }
}

/** 使えない時に出す文 */
export const NEEDS_REGULAR_MESSAGE = 'この機能はレギュラー・プロのプランで使えます。料金プランの画面からプランを変えられます。';
