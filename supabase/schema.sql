-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Students Table (生徒カルテ)
create table public.students (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  nationality text,
  jlpt_level text, -- 'N5', 'N4', etc. or 'None'
  goal_text text,
  textbook text,
  current_phase text,
  memo text
  -- teacher_id uuid references auth.users(id) -- Commented out until Auth is linked
);

-- 2. Lessons Table (レッスン記録)
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  student_id uuid references public.students(id) on delete cascade not null,
  date timestamp with time zone not null,
  content text,
  understanding_level integer check (understanding_level between 1 and 5),
  homework text,
  next_goal text,
  ai_log jsonb
);

-- Enable Row Level Security (RLS) - Recommended but optional for initial dev
alter table public.students enable row level security;
alter table public.lessons enable row level security;

-- Policy (For now, allow all for development if needed, or set up Auth later)
-- create policy "Allow public access for dev" on public.students for all using (true);
-- create policy "Allow public access for dev" on public.lessons for all using (true);
