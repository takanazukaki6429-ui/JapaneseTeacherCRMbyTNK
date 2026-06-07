-- ============================================================================
-- v1.0 工程表 4.12: 個人情報の暗号化保存（pgcrypto）
-- 要件定義書 v1.0 §4.2.1 セキュリティL2
-- ============================================================================
--
-- 方針:
--   - pgcrypto 拡張を有効化
--   - 暗号化/復号のヘルパー関数を提供（pgp_sym_encrypt / pgp_sym_decrypt のラッパー）
--   - 暗号鍵は Supabase の Vault（app.settings.encryption_key）から取得
--   - Phase 1 では shared_links.email など最も機微な列を対象に段階適用
--   - 既存の students.name 等は実運用のクエリ影響が大きいため Phase 4 で段階移行
--
-- ⚠️ 注意: 暗号鍵 'app.encryption_key' は Supabase ダッシュボードの
--   Database > Settings > Custom Postgres Config、または Vault で設定すること。
--   未設定時は関数がエラーを返すため、設定完了後に暗号化列の利用を開始する。
-- ============================================================================

-- 1. pgcrypto 拡張を有効化
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. 暗号鍵取得（current_setting から。未設定なら例外）
CREATE OR REPLACE FUNCTION get_encryption_key()
    RETURNS text AS $$
DECLARE
    k text;
BEGIN
    -- Supabase Vault / custom config から取得
    BEGIN
        k := current_setting('app.encryption_key', true);
    EXCEPTION WHEN OTHERS THEN
        k := NULL;
    END;
    IF k IS NULL OR k = '' THEN
        RAISE EXCEPTION 'encryption key (app.encryption_key) is not configured';
    END IF;
    RETURN k;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3. 暗号化ヘルパー（テキスト → bytea）
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext text)
    RETURNS bytea AS $$
BEGIN
    IF plaintext IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_encrypt(plaintext, get_encryption_key());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 復号ヘルパー（bytea → テキスト）
CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext bytea)
    RETURNS text AS $$
BEGIN
    IF ciphertext IS NULL THEN
        RETURN NULL;
    END IF;
    RETURN pgp_sym_decrypt(ciphertext, get_encryption_key());
EXCEPTION WHEN OTHERS THEN
    -- 復号失敗（鍵不一致等）は NULL を返してアプリ側で検知
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. shared_links.email を暗号化列に移行する準備（段階移行のため列追加のみ）
--    既存の email 列はそのまま残し、新規書き込みは email_encrypted へ。
--    Phase 4 で完全移行＋旧列削除。
ALTER TABLE shared_links
    ADD COLUMN IF NOT EXISTS email_encrypted bytea;

COMMENT ON FUNCTION encrypt_pii IS 'PII暗号化: app.encryption_key を鍵に pgp_sym_encrypt';
COMMENT ON FUNCTION decrypt_pii IS 'PII復号: 失敗時はNULL返却';
COMMENT ON COLUMN shared_links.email_encrypted IS 'v1.0 §4.12: email の暗号化版。段階移行中（旧email列と併存）';
