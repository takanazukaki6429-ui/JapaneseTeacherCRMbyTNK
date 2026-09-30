-- 二段階認証を登録した人は aal2 でないと public の表を読み書きできない（2026-09-30）
-- 本番は Supabase Studio で流す（03_japanese-teacher-crm/strategy/sql_2026-09-30_二段階認証を保管庫でも必須に.sql の B と同じ）
-- B. public の中で「行ごとの保護」が有効な表すべてに、同じ制限の方針を足す（何度流しても同じ結果）
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
    execute format($p$
      create policy mfa_required_when_enrolled on public.%I
        as restrictive
        to authenticated
        using (
          array[(select auth.jwt()->>'aal')] <@ (
            select case when count(id) > 0 then array['aal2'] else array['aal1', 'aal2'] end
            from auth.mfa_factors
            where ((select auth.uid()) = user_id) and status = 'verified'
          )
        )
    $p$, t.relname);
  end loop;
end $$;
