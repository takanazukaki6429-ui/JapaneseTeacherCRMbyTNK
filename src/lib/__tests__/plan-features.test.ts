import { describe, it, expect } from 'vitest';
import { canUseFeature, decideFeature, featureForAiType, featureTier, type GatedFeature } from '../plan-features';

const ALL: GatedFeature[] = ['prep_sheet', 'prep_manual', 'prep_material', 'free_talk', 'improvise', 'ask', 'shared_materials'];
const EXISTING: GatedFeature[] = ['prep_manual', 'prep_material', 'improvise', 'ask', 'shared_materials'];   // 今の本番にある機能

const LEGACY = { isFree: true, status: 'inactive', tier: 'light' };               // 既存の無料の先生（申し込んでいない）
const LEGACY_LIGHT = { isFree: true, status: 'active', tier: 'light' };           // 既存の無料の先生がライトを申し込んだ
const LEGACY_REGULAR = { isFree: true, status: 'active', tier: 'regular' };
const TRIAL_LIGHT = { isFree: false, status: 'trialing', tier: 'light' };         // ライトを選んでお試し中
const LIGHT = { isFree: false, status: 'active', tier: 'light' };
const REGULAR = { isFree: false, status: 'active', tier: 'regular' };
const PRO = { isFree: false, status: 'active', tier: 'pro' };
const LAPSED = { isFree: false, status: 'canceled', tier: 'regular' };            // 解約した先生
const NONE = { isFree: false, status: 'inactive', tier: 'light' };                // 申し込んでいない新規の先生

describe('featureTier', () => {
    it('お試し中は選んだプランに関係なくレギュラー扱い', () => {
        expect(featureTier(TRIAL_LIGHT)).toBe('regular');
    });
    it('契約中は保存されたプラン。読めなければ一番狭いライト', () => {
        expect(featureTier(PRO)).toBe('pro');
        expect(featureTier({ status: 'active', tier: null })).toBe('light');
        expect(featureTier({ status: 'active', tier: 'gold' })).toBe('light');
    });
    it('契約していない・止まっている時は null', () => {
        expect(featureTier(NONE)).toBeNull();
        expect(featureTier(LAPSED)).toBeNull();
        expect(featureTier({ status: 'past_due', tier: 'regular' })).toBeNull();
    });
});

describe('ライトでは使えない（2026-10-04）', () => {
    it('ライトの新規の先生は7つとも使えず、理由はレギュラー以上への変更', () => {
        for (const f of ALL) {
            expect(decideFeature(f, LIGHT)).toEqual({ allowed: false, reason: 'needs_regular' });
        }
    });
    it('レギュラー・プロ・お試し中は全部使える', () => {
        for (const f of ALL) {
            expect(canUseFeature(f, REGULAR)).toBe(true);
            expect(canUseFeature(f, PRO)).toBe(true);
            expect(canUseFeature(f, TRIAL_LIGHT)).toBe(true);
        }
    });
});

describe('既存の無料の先生（9/24 の約束・10/4 かずき確認）', () => {
    it('申し込んでいなくても、今の本番にある機能は使える', () => {
        for (const f of EXISTING) expect(canUseFeature(f, LEGACY)).toBe(true);
    });
    it('開いた時に自動で作る授業前の1枚（10月からの有料の機能）は、申し込むまで使えない', () => {
        expect(decideFeature('prep_sheet', LEGACY)).toEqual({ allowed: false, reason: 'needs_plan' });
    });
    it('フリートークのネタ（10月からの機能・レギュラー以上）は、申し込むまで使えない。ライトでも使えない', () => {
        expect(decideFeature('free_talk', LEGACY)).toEqual({ allowed: false, reason: 'needs_plan' });
        expect(decideFeature('free_talk', LEGACY_LIGHT)).toEqual({ allowed: false, reason: 'needs_regular' });
        expect(canUseFeature('free_talk', LEGACY_REGULAR)).toBe(true);
    });
    it('ライトを申し込んでも、今の本番にある機能は残る。自動の授業前の1枚はライトなので使えない', () => {
        for (const f of EXISTING) expect(canUseFeature(f, LEGACY_LIGHT)).toBe(true);
        expect(decideFeature('prep_sheet', LEGACY_LIGHT)).toEqual({ allowed: false, reason: 'needs_regular' });
    });
    it('レギュラーを申し込めば全部使える', () => {
        for (const f of ALL) expect(canUseFeature(f, LEGACY_REGULAR)).toBe(true);
    });
});

describe('契約していない・解約した先生', () => {
    it('どれも使えず、理由は申込み', () => {
        for (const f of ALL) {
            expect(decideFeature(f, NONE)).toEqual({ allowed: false, reason: 'needs_plan' });
            expect(decideFeature(f, LAPSED)).toEqual({ allowed: false, reason: 'needs_plan' });
        }
    });
});

describe('featureForAiType', () => {
    it('ASTAに聞く（ホーム・生徒情報・授業中。free_chat は消した AIツールの頼み方）は ask', () => {
        for (const t of ['home_ask', 'student_ask', 'live_answer', 'free_chat']) expect(featureForAiType(t)).toBe('ask');
    });
    it('授業前の1枚と今日のテキスト', () => {
        expect(featureForAiType('prep_sheet')).toBe('prep_sheet');
        expect(featureForAiType('prep_plan')).toBe('prep_manual');
        expect(featureForAiType('prep_material')).toBe('prep_material');
    });
    it('ライトでも使える物（ヒント・記録・翻訳・体験レッスンなど）は判定しない', () => {
        for (const t of ['live_assistant', 'record_draft', 'record_assist', 'translation', 'student_translation', 'initial_hearing', 'profile_analysis', 'hearing_assist', 'multilingual_feedback', undefined]) {
            expect(featureForAiType(t)).toBeNull();
        }
    });
});

describe('コンサルの受講中（2026-10-06）', () => {
    const IN = new Date('2026-11-01T00:00:00Z');      // 日本時間 11/1
    const AFTER = new Date('2027-01-01T00:00:00Z');   // 日本時間 2027/1/1（コースは 12/31 まで）
    const COURSE = { isFree: false, status: 'inactive', tier: 'light', courseEndDate: '2026-12-31' };

    it('受講中は、申し込んでいなくてもレギュラー扱いで全部使える', () => {
        expect(featureTier({ ...COURSE, now: IN })).toBe('regular');
        for (const f of ALL) expect(canUseFeature(f, { ...COURSE, now: IN })).toBe(true);
    });
    it('コースが終わったら、申し込むまで使えない（理由は申込み）', () => {
        for (const f of ALL) expect(decideFeature(f, { ...COURSE, now: AFTER })).toEqual({ allowed: false, reason: 'needs_plan' });
    });
    it('受講中にライトで先回りして申し込んだ（お試し中）・ライトで契約中でも、受講中はレギュラー扱い', () => {
        for (const f of ALL) {
            expect(canUseFeature(f, { ...COURSE, status: 'trialing', now: IN })).toBe(true);
            expect(canUseFeature(f, { ...COURSE, status: 'active', now: IN })).toBe(true);
        }
    });
    it('受講が終わってライトで契約中なら、ライトの制限', () => {
        expect(decideFeature('ask', { ...COURSE, status: 'active', now: AFTER })).toEqual({ allowed: false, reason: 'needs_regular' });
    });
    it('プロで契約中なら受講中もプロ', () => {
        expect(featureTier({ ...COURSE, status: 'active', tier: 'pro', now: IN })).toBe('pro');
    });
    it('解約した先生でも、受講中は使える', () => {
        for (const f of ALL) expect(canUseFeature(f, { ...COURSE, status: 'canceled', now: IN })).toBe(true);
    });
});
