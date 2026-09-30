import { describe, it, expect } from 'vitest';
import { decideMfa, isAdminPath, needsMfaCode, safeNextPath } from '../mfa';

const NO_FACTOR = { currentLevel: 'aal1', nextLevel: 'aal1' };   // 二段階認証を登録していない
const CODE_PENDING = { currentLevel: 'aal1', nextLevel: 'aal2' }; // 登録済み・コードがまだ
const CODE_DONE = { currentLevel: 'aal2', nextLevel: 'aal2' };    // コードまで済んだ

describe('needsMfaCode', () => {
    it('登録済みでコードがまだのときだけ true', () => {
        expect(needsMfaCode(CODE_PENDING)).toBe(true);
        expect(needsMfaCode(NO_FACTOR)).toBe(false);
        expect(needsMfaCode(CODE_DONE)).toBe(false);
        expect(needsMfaCode(null)).toBe(false);
    });
});

describe('decideMfa', () => {
    it('公開の画面は判定しない', () => {
        expect(decideMfa('/login/mfa', true, CODE_PENDING)).toBe('pass');
        expect(decideMfa('/pricing', true, CODE_PENDING)).toBe('pass');
    });

    it('コードがまだの人：画面は6桁のコードの画面へ、APIは401', () => {
        expect(decideMfa('/', false, CODE_PENDING)).toBe('verify-page');
        expect(decideMfa('/students/abc', false, CODE_PENDING)).toBe('verify-page');
        expect(decideMfa('/api/students', false, CODE_PENDING)).toBe('verify-api');
        expect(decideMfa('/admin/invite-codes', false, CODE_PENDING)).toBe('verify-page');
        expect(decideMfa('/api/admin/invite-codes', false, CODE_PENDING)).toBe('verify-api');
    });

    it('二段階認証を登録していない人：ふつうの画面は通す', () => {
        expect(decideMfa('/', false, NO_FACTOR)).toBe('pass');
        expect(decideMfa('/api/students', false, NO_FACTOR)).toBe('pass');
    });

    it('二段階認証を登録していない人：管理者の画面は設定へ案内、管理者のAPIは403', () => {
        expect(decideMfa('/admin/invite-codes', false, NO_FACTOR)).toBe('admin-setup-page');
        expect(decideMfa('/admin', false, NO_FACTOR)).toBe('admin-setup-page');
        expect(decideMfa('/api/admin/invite-codes', false, NO_FACTOR)).toBe('admin-api-forbidden');
    });

    it('コードまで済んだ人は、管理者の画面も通す', () => {
        expect(decideMfa('/admin/invite-codes', false, CODE_DONE)).toBe('pass');
        expect(decideMfa('/api/admin/invite-codes', false, CODE_DONE)).toBe('pass');
        expect(decideMfa('/', false, CODE_DONE)).toBe('pass');
    });

    it('aal が取れないとき：ふつうの画面は通し、管理者の画面は通さない', () => {
        expect(decideMfa('/', false, null)).toBe('pass');
        expect(decideMfa('/admin/dashboard', false, null)).toBe('admin-setup-page');
        expect(decideMfa('/api/admin/error-analysis', false, null)).toBe('admin-api-forbidden');
    });
});

describe('isAdminPath', () => {
    it('管理者の画面とAPIだけを見分ける（似た名前は含めない）', () => {
        expect(isAdminPath('/admin')).toBe(true);
        expect(isAdminPath('/admin/dashboard')).toBe(true);
        expect(isAdminPath('/api/admin/materials/parse')).toBe(true);
        expect(isAdminPath('/administrator')).toBe(false);
        expect(isAdminPath('/api/administer')).toBe(false);
        expect(isAdminPath('/students/admin')).toBe(false);
    });
});

describe('safeNextPath', () => {
    it('自分のサイトの中の道だけ返す', () => {
        expect(safeNextPath('/students/abc?tab=1')).toBe('/students/abc?tab=1');
        expect(safeNextPath('https://evil.example.com')).toBe('/');
        expect(safeNextPath('//evil.example.com')).toBe('/');
        expect(safeNextPath('/\\evil.example.com')).toBe('/');
        expect(safeNextPath(null)).toBe('/');
    });
    it('ログインや6桁のコードの画面へは戻さない（行ったり来たりを防ぐ）', () => {
        expect(safeNextPath('/login/mfa')).toBe('/');
        expect(safeNextPath('/login/mfa?next=/')).toBe('/');
        expect(safeNextPath('/login')).toBe('/');
    });
});
