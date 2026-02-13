-- Ensure lessons table has all required columns
-- This script is safe to run even if columns already exist

-- 1. Add detailed lesson columns (from 01_add_lesson_details.sql)
alter table public.lessons 
add column if not exists topics text,      -- 文法・トピック
add column if not exists vocabulary text,  -- 語彙
add column if not exists mistakes text,    -- つまずき・弱点
add column if not exists materials text;   -- 使用教材・資料

-- 2. Add status column (from 02_add_lesson_status.sql)
alter table public.lessons 
add column if not exists status text default 'completed' check (status in ('completed', 'scheduled', 'cancelled'));

-- 3. Update any existing records having null status
update public.lessons set status = 'completed' where status is null;

-- 4. Re-apply RLS policies just in case (optional but safe)
alter table public.lessons enable row level security;
-- Policies are likely already there from 03_fix_rls_policies.sql, so we won't duplicate them here to avoid errors.
-- If you need to re-create them, you'd drop them first.
