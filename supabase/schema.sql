-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Students Table (生徒カルテ)
create table public.students (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade not null, -- 【必須】所有者IDを自動セット
  name text not null,
  nationality text,
  jlpt_level text, -- 'N5', 'N4', etc. or 'None'
  goal_text text,
  textbook text,
  current_phase text,
  memo text,
  email text
);

-- 2. Lessons Table (レッスン記録)
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade not null, -- 【必須】所有者IDを自動セット
  student_id uuid references public.students(id) on delete cascade not null,
  date timestamp with time zone not null,
  content text,
  understanding_level integer check (understanding_level between 1 and 5),
  homework text,
  next_goal text,
  ai_log jsonb
);

-- 3. AI Usage Log Table (AI利用ログ - Rate Limiting)
create table public.ai_usage_log (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  model text,
  prompt_type text,
  token_usage integer
);

-- Enable Row Level Security (RLS) - Mandatory for Enterprise Grade Security
alter table public.students enable row level security;
alter table public.lessons enable row level security;
alter table public.ai_usage_log enable row level security;

-- 🛡️ 厳格なRLSポリシー (Strict RLS Policies) 🛡️

-- Students Policies
create policy "Users can view their own students" on public.students for select using (auth.uid() = user_id);
create policy "Users can insert their own students" on public.students for insert with check (auth.uid() = user_id);
create policy "Users can update their own students" on public.students for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own students" on public.students for delete using (auth.uid() = user_id);

-- Lessons Policies
create policy "Users can view their own lessons" on public.lessons for select using (auth.uid() = user_id);
create policy "Users can insert their own lessons" on public.lessons for insert with check (auth.uid() = user_id);
create policy "Users can update their own lessons" on public.lessons for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can delete their own lessons" on public.lessons for delete using (auth.uid() = user_id);

-- AI Usage Log Policies
create policy "Users can insert their own AI logs" on public.ai_usage_log for insert with check (auth.uid() = user_id);
create policy "Users can view their own AI logs" on public.ai_usage_log for select using (auth.uid() = user_id);


-- 5. Invite Codes Table (招待コード - 1回使い切りシステム)
CREATE TABLE public.invite_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL, -- ランダムな文字列 (e.g., A8F3-K9P2)
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- コンサルタント/管理者のID
  used_at timestamp with time zone, -- 使用日時 (NULL = 未使用)
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- このコードで登録したユーザーのID
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  expires_at timestamp with time zone -- 有効期限（任意設定）
);

-- Enable RLS for Invite Codes
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

-- 招待コードのRLSポリシー
-- 誰でも「自分のコードが有効かどうか」をチェック（SELECT）するためのポリシー（使用日時は常にチェック）
CREATE POLICY "Anyone can view invite codes to check validity" ON public.invite_codes FOR SELECT USING (true);

-- 管理者（コンサルタント）向けポリシー
-- 現状は全員がコンサルタントになれるわけではないため、本来はroleフラグなどで制御するが、
-- ひとまずは「自分が発行したコードは見れる・消せる」とする。
CREATE POLICY "Users can create invite codes" ON public.invite_codes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users can manage their own invite codes" ON public.invite_codes FOR ALL USING (auth.uid() = created_by);

-- 使用時のUpdateポリシー
-- 未使用のコードに限り、使用済みマークを付けられる
CREATE POLICY "Users can mark code as used during signup" ON public.invite_codes FOR UPDATE USING (used_at IS NULL);
