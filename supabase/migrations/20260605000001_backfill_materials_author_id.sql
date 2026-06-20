-- 既存教材の author_id を推定して埋める
-- これがないと修正後コードで「自分の教材」が0件になり、既存ユーザー（あいちゃん等）が混乱する
--
-- 推定ロジック：
-- 1. student_id がある教材 → その生徒を担当している先生（students.user_id）を所有者にする
-- 2. student_id が無い教材 → 所有者不明として author_id は NULL のまま（is_public=true なら「みんなの教材」で見える）

BEGIN;

-- 1) student_id 経由で所有者を推定
UPDATE public.materials AS m
SET author_id = s.user_id
FROM public.students AS s
WHERE m.student_id = s.id
  AND m.author_id IS NULL
  AND s.user_id IS NOT NULL;

-- ログ確認用：埋まらなかった教材の件数
-- SELECT count(*) FROM public.materials WHERE author_id IS NULL;

COMMIT;
