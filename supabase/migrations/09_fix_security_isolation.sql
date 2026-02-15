-- [CRITICAL] Security Fix for Data Isolation
-- 1. Clean up existing non-isolated data (REQUIRED for adding NOT NULL constraint)
truncate table public.students cascade;

-- 2. Add user_id column with default value of current authenticated user
-- This ensures that any new insert automatically gets the creator's ID
alter table public.students 
add column user_id uuid not null default auth.uid() references auth.users(id) on delete cascade;

-- 3. Update RLS Policies for Students
-- First, drop existing permissive policies (from previous migrations)
drop policy if exists "Enable read access for authenticated users" on public.students;
drop policy if exists "Enable insert access for authenticated users" on public.students;
drop policy if exists "Enable update access for authenticated users" on public.students;
drop policy if exists "Enable delete access for authenticated users" on public.students;
-- Also drop the "Allow public access..." if it exists
drop policy if exists "Allow public access for dev" on public.students;

-- Create strict policies based on user_id
create policy "Users can view their own students" on public.students
  for select using (auth.uid() = user_id);

create policy "Users can insert their own students" on public.students
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own students" on public.students
  for update using (auth.uid() = user_id);

create policy "Users can delete their own students" on public.students
  for delete using (auth.uid() = user_id);


-- 4. Update RLS Policies for Lessons
-- Lessons don't have user_id, but they belong to a student which has user_id.
drop policy if exists "Enable read access for authenticated users" on public.lessons;
drop policy if exists "Enable insert access for authenticated users" on public.lessons;
drop policy if exists "Enable update access for authenticated users" on public.lessons;
drop policy if exists "Enable delete access for authenticated users" on public.lessons;
drop policy if exists "Allow public access for dev" on public.lessons;

-- Create strict policies checking the parent student's ownership
create policy "Users can view lessons of their students" on public.lessons
  for select using (
    exists (
      select 1 from public.students
      where students.id = lessons.student_id
      and students.user_id = auth.uid()
    )
  );

create policy "Users can insert lessons for their students" on public.lessons
  for insert with check (
    exists (
      select 1 from public.students
      where students.id = lessons.student_id
      and students.user_id = auth.uid()
    )
  );

create policy "Users can update lessons of their students" on public.lessons
  for update using (
    exists (
      select 1 from public.students
      where students.id = lessons.student_id
      and students.user_id = auth.uid()
    )
  );

create policy "Users can delete lessons of their students" on public.lessons
  for delete using (
    exists (
      select 1 from public.students
      where students.id = lessons.student_id
      and students.user_id = auth.uid()
    )
  );
