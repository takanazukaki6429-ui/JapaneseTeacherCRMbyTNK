-- 二段階認証を登録した人は、コードを入れた後（aal2）でないと public の表を読み書きできない（2026-09-30）
-- 本番は Supabase Studio で流す（03_japanese-teacher-crm/strategy/sql_2026-09-30_二段階認証を保管庫でも必須に.sql の B。
-- そちらは「先生の権限で読めること」の自己テストつき・失敗したら全部取り消す）
--
-- 注意：決まりの中で auth.mfa_factors を直接読んではいけない。先生の権限（authenticated）にはその表を読む許可が無く、
-- 全員の読み書きがエラーになる（2026-09-30 に本番で発生）。登録の表は、持ち主の権限で動く関数の中で見る

create or replace function public.mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $fn$
  select coalesce((select auth.jwt()) ->> 'aal', 'aal1') = 'aal2'
      or not exists (
           select 1 from auth.mfa_factors f
           where f.user_id = (select auth.uid()) and f.status = 'verified'
         );
$fn$;

revoke all on function public.mfa_ok() from public, anon;
grant execute on function public.mfa_ok() to authenticated, service_role;

do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
  loop
    execute format('drop policy if exists mfa_required_when_enrolled on public.%I', t.relname);
    execute format(
      'create policy mfa_required_when_enrolled on public.%I as restrictive to authenticated using ((select public.mfa_ok()))',
      t.relname);
  end loop;
end $$;
