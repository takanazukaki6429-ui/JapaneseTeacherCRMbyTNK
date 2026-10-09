import { describe, it, expect } from 'vitest';
import { DELETED_ACCOUNT_METADATA_KEY, isAlreadyStopped, isDeletedAccountCustomer, subscriptionToCancel } from '../account-deletion';
import { DISPLAY_NAME_MAX, normalizeDisplayName } from '../display-name';
import { filterMaterials, normalizeQuery } from '../material-search';
import { parsePurposeIds, roadmapInputFromStudent } from '../roadmap/from-student';
import { buildPrepSource } from '../prep-sheet';

describe('アカウントの削除の前に止める契約（2026-10-09 かずき決定）', () => {
    it('課金が起きうる状態（有効・お試し中・支払いが止まっている・未完了）なら、契約の番号を返す', () => {
        for (const status of ['active', 'trialing', 'past_due', 'unpaid', 'incomplete']) {
            expect(subscriptionToCancel({ subscription_status: status, stripe_subscription_id: 'sub_1' }), status).toBe('sub_1');
        }
    });
    it('もう止まっている・契約が無い時は止めない', () => {
        expect(subscriptionToCancel({ subscription_status: 'canceled', stripe_subscription_id: 'sub_1' })).toBeNull();
        expect(subscriptionToCancel({ subscription_status: 'incomplete_expired', stripe_subscription_id: 'sub_1' })).toBeNull();
        expect(subscriptionToCancel({ subscription_status: 'inactive', stripe_subscription_id: null })).toBeNull();
        expect(subscriptionToCancel({ subscription_status: 'trialing', stripe_subscription_id: '  ' })).toBeNull();
        expect(subscriptionToCancel(null)).toBeNull();
    });
    it('止める時に失敗した後、もう止まっていたかを見分ける', () => {
        expect(isAlreadyStopped('canceled')).toBe(true);
        expect(isAlreadyStopped('incomplete_expired')).toBe(true);
        expect(isAlreadyStopped('trialing')).toBe(false);
        expect(isAlreadyStopped(undefined)).toBe(false);
    });
    it('削除済みの印が付いた客・Stripe で消された客は、削除したアカウントの客', () => {
        expect(isDeletedAccountCustomer({ metadata: { [DELETED_ACCOUNT_METADATA_KEY]: '2026-10-10T00:00:00Z' } })).toBe(true);
        expect(isDeletedAccountCustomer({ deleted: true })).toBe(true);
        expect(isDeletedAccountCustomer({ metadata: {} })).toBe(false);
        expect(isDeletedAccountCustomer(null)).toBe(false);
    });
});

describe('表示名（設定の画面で変える）', () => {
    it('前後と続く空白を整える', () => {
        expect(normalizeDisplayName('  田中   太郎 ')).toBe('田中 太郎');
    });
    it('空と長すぎる名前は保存しない', () => {
        expect(normalizeDisplayName('   ')).toBeNull();
        expect(normalizeDisplayName('あ'.repeat(DISPLAY_NAME_MAX))).toBe('あ'.repeat(DISPLAY_NAME_MAX));
        expect(normalizeDisplayName('あ'.repeat(DISPLAY_NAME_MAX + 1))).toBeNull();
    });
});

describe('教材の検索', () => {
    const items = [
        { title: 'N4動詞活用クイズ', tags: ['N4', '文法'], content: '問題1' },
        { title: '敬語ロールプレイ', tags: ['会話'], content: 'お客様' },
        { title: 'カフェの会話', tags: null, content: '注文の練習' },
    ];
    it('タイトル・タグ・内容のどれかに入っていれば残る。大文字と小文字は区別しない', () => {
        expect(filterMaterials(items, 'n4').map(m => m.title)).toEqual(['N4動詞活用クイズ']);
        expect(filterMaterials(items, '会話').map(m => m.title)).toEqual(['敬語ロールプレイ', 'カフェの会話']);
        expect(filterMaterials(items, '注文').map(m => m.title)).toEqual(['カフェの会話']);
    });
    it('空白で区切ると、全部の言葉を含む物だけ', () => {
        expect(filterMaterials(items, '会話 お客様').map(m => m.title)).toEqual(['敬語ロールプレイ']);
    });
    it('空の検索は全部。言葉は整える', () => {
        expect(filterMaterials(items, '  ')).toHaveLength(3);
        expect(normalizeQuery('  会話   練習 ')).toBe('会話 練習');
        expect(normalizeQuery(undefined)).toBe('');
    });
});

describe('学習の目的（2つ以上選んだ時もロードマップに出す）', () => {
    it('「travel,work」から2つ取り出す。9択以外と重なりは落とす', () => {
        expect(parsePurposeIds('travel,work')).toEqual(['travel', 'work']);
        expect(parsePurposeIds('travel, travel ,xyz,anime')).toEqual(['travel', 'anime']);
        expect(parsePurposeIds('work')).toEqual(['work']);
        expect(parsePurposeIds(null)).toEqual([]);
    });
    it('ロードマップの材料に、選んだ目的が全部入る', () => {
        const input = roadmapInputFromStudent({ jlpt_level: 'N4', current_phase: '目標Lv.70 / 6ヶ月', purposes: 'travel,work' });
        expect(input?.purposeIds).toEqual(['travel', 'work']);
    });
    it('フリートークの材料の興味は、目的の名前を「・」でつなぐ（その他は除く）', () => {
        const src = buildPrepSource({ name: 'アンナ', purposes: 'travel,other,work' }, []);
        expect(src.interest).toBe('旅行を楽しみたい・日本で働きたい');
    });
});
