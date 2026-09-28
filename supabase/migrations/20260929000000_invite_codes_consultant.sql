-- 招待コードに「渡した相手（コンサルタント）」を記録する（2026-09-29）
-- 目的：コンサルタント経由の契約を自動で数え、紹介の取り分を計算できるようにする
-- 本番の保管庫には Supabase Studio で流す（03_japanese-teacher-crm/strategy/sql_2026-09-29_招待コードに渡した相手.sql と同じ内容）

-- 1) 招待コードに「渡した相手」の列
alter table public.invite_codes
  add column if not exists consultant text;

comment on column public.invite_codes.consultant is
  '渡した相手（コンサルタントの呼び名）。紹介の取り分を数えるため（2026-09-29）。空＝直接渡したコード';

create index if not exists idx_invite_codes_consultant
  on public.invite_codes (consultant)
  where consultant is not null;

-- 2) 毎月の知らせを1回だけ送るための記録（kind と period の組が重複しない＝同じ月の2回目は入らない）
create table if not exists public.monthly_reports (
  kind    text        not null,
  period  text        not null,  -- 'YYYY-MM'（日本時間）
  sent_at timestamptz not null default now(),
  primary key (kind, period)
);

comment on table public.monthly_reports is
  '毎月の自動の知らせの送信記録（2026-09-29）。サーバ専用＝方針なし（管理者権限接続だけが読み書きする）';

alter table public.monthly_reports enable row level security;
