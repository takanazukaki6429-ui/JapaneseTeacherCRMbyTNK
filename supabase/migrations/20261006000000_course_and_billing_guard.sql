-- 受講中の無料（コースが終わる日）の列を足し、課金の列を先生の権限で書き換えられないようにする（2026-10-06）
-- 本番は Supabase Studio で流す（03_japanese-teacher-crm/strategy/sql_2026-10-06_受講中の無料と課金の列を守る.sql。
-- そちらは「先生の権限で課金の列を直せない・運営の権限なら直せる」の自己テストつき・失敗したら全部取り消す）

do $$
begin
  -- A. 列を足す
  alter table public.invite_codes
    add column if not exists course_months   smallint,
    add column if not exists course_end_date date;
  alter table public.user_settings
    add column if not exists course_months   smallint,
    add column if not exists course_end_date date;
  -- コースは 3か月・6か月だけ（何度流しても同じになるよう、外してから付け直す）
  alter table public.invite_codes  drop constraint if exists invite_codes_course_months_check;
  alter table public.invite_codes  add  constraint invite_codes_course_months_check  check (course_months in (3, 6));
  alter table public.user_settings drop constraint if exists user_settings_course_months_check;
  alter table public.user_settings add  constraint user_settings_course_months_check check (course_months in (3, 6));

  comment on column public.invite_codes.course_months   is 'コンサルの受講生に渡すコードのコース（3か月・6か月）。空＝受講生ではない（2026-10-06）';
  comment on column public.invite_codes.course_end_date is 'コースが終わる日。受講生はこの日まで無料（2026-10-06）';
  comment on column public.user_settings.course_months   is '受講中のコース（3か月・6か月）。登録した招待コードから写す（2026-10-06）';
  comment on column public.user_settings.course_end_date is 'コースが終わる日。この日まで無料でレギュラーと同じ機能（2026-10-06）';

  -- B. 課金の列を守る仕組み
  create or replace function public.protect_billing_columns()
  returns trigger
  language plpgsql
  set search_path = ''
  as $fn$
  begin
    -- 運営の権限（Stripe からの通知・登録の処理・管理画面＝管理者権限接続、Studio、保管庫の中の仕組み）は通す。
    -- 止めるのは、ブラウザから直接書き込む先生の権限（authenticated）と、ログインしていない人（anon）だけ
    if current_user not in ('authenticated', 'anon') then
      return new;
    end if;

    if tg_op = 'INSERT' then
      -- 先生が自分で行を作る時（登録の続きの書き込み）は、課金の列を最初の値にそろえる
      new.is_free                := false;
      new.subscription_status    := 'inactive';
      new.plan_tier              := 'light';
      new.stripe_customer_id     := null;
      new.stripe_subscription_id := null;
      new.course_months          := null;
      new.course_end_date        := null;
      return new;
    end if;

    if new.is_free                is distinct from old.is_free
       or new.subscription_status    is distinct from old.subscription_status
       or new.plan_tier              is distinct from old.plan_tier
       or new.stripe_customer_id     is distinct from old.stripe_customer_id
       or new.stripe_subscription_id is distinct from old.stripe_subscription_id
       or new.course_months          is distinct from old.course_months
       or new.course_end_date        is distinct from old.course_end_date then
      raise exception '課金の情報は、先生の権限では書き換えられません（protect_billing_columns）'
        using errcode = '42501';
    end if;
    return new;
  end;
  $fn$;

  drop trigger if exists protect_billing_columns on public.user_settings;
  create trigger protect_billing_columns
    before insert or update on public.user_settings
    for each row execute function public.protect_billing_columns();

  -- C. 利用記録の負の値を止める（今ある行は調べない＝not valid。これから入る行だけ）
  alter table public.ai_usage_log drop constraint if exists ai_usage_log_token_usage_not_negative;
  alter table public.ai_usage_log add constraint ai_usage_log_token_usage_not_negative
    check (token_usage is null or token_usage >= 0) not valid;

end $$;
