-- 本番DB掃除用：今日のテストで作ったデータを削除
-- ⚠️ migration系列ではなく、Supabase Studio 手動実行用（ファイル名に _ 接頭辞）

BEGIN;

-- 1) 「テスト」を含む名前の生徒を削除（CASCADEで関連も消える）
DELETE FROM public.students
WHERE name IN ('テスト生徒', 'テスト太郎');

-- 2) 今日（2026-06-06）作成された招待コードのうち、使用済みのテスト用を削除
--    （未使用は将来再利用できるので残す）
DELETE FROM public.invite_codes
WHERE code IN ('ZS2D-8PYQ', '2JWY-TZZA', 'PBVH-DZKG')
  AND used_at IS NOT NULL;

-- 3) テストアカウント takanazukaki6429+test1@gmail.com の削除
--    （auth.users は service_role でしか触れないため、SQLでは削除できない。
--     Supabase Dashboard → Authentication → Users から手動削除）

-- 確認クエリ（COMMIT前に SELECT で検算したい場合）:
-- SELECT * FROM public.students WHERE name LIKE 'テスト%';
-- SELECT * FROM public.invite_codes WHERE code IN ('ZS2D-8PYQ','2JWY-TZZA','PBVH-DZKG');

COMMIT;
