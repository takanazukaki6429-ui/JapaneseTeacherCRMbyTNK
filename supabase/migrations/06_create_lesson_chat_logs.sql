-- Create lesson_chat_logs table
create table if not exists public.lesson_chat_logs (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  lesson_id uuid references public.lessons(id) on delete set null,
  student_id uuid references public.students(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null
);

-- Enable RLS
alter table public.lesson_chat_logs enable row level security;

-- Policies
create policy "Users can view their own students' chat logs" on public.lesson_chat_logs
  for select using (auth.uid() in (
    select user_id from public.students where id = lesson_chat_logs.student_id
  ));

create policy "Users can insert chat logs for their students" on public.lesson_chat_logs
  for insert with check (auth.uid() in (
    select user_id from public.students where id = lesson_chat_logs.student_id
  ));

-- Index for faster queries
create index lesson_chat_logs_lesson_id_idx on public.lesson_chat_logs(lesson_id);
create index lesson_chat_logs_student_id_idx on public.lesson_chat_logs(student_id);
