-- Add status column to lessons table
alter table public.lessons 
add column if not exists status text default 'completed' check (status in ('completed', 'scheduled', 'cancelled'));

-- Update existing records to completed
update public.lessons set status = 'completed' where status is null;
