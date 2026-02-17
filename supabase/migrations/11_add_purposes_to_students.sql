-- Add purposes column to students table to store multi-select purposes
alter table public.students
add column if not exists purposes text; -- Stores comma separated purpose IDs e.g. "anime,travel"
