-- Enable RLS on tables (ensure it's enabled)
alter table public.students enable row level security;
alter table public.lessons enable row level security;

-- Students Table Policies
-- Allow authenticated users to SELECT, INSERT, UPDATE, DELETE all records (for single-tenant/admin use)
create policy "Enable read access for authenticated users" on "public"."students" as PERMISSIVE for SELECT to authenticated using (true);
create policy "Enable insert access for authenticated users" on "public"."students" as PERMISSIVE for INSERT to authenticated with check (true);
create policy "Enable update access for authenticated users" on "public"."students" as PERMISSIVE for UPDATE to authenticated using (true);
create policy "Enable delete access for authenticated users" on "public"."students" as PERMISSIVE for DELETE to authenticated using (true);

-- Lessons Table Policies
create policy "Enable read access for authenticated users" on "public"."lessons" as PERMISSIVE for SELECT to authenticated using (true);
create policy "Enable insert access for authenticated users" on "public"."lessons" as PERMISSIVE for INSERT to authenticated with check (true);
create policy "Enable update access for authenticated users" on "public"."lessons" as PERMISSIVE for UPDATE to authenticated using (true);
create policy "Enable delete access for authenticated users" on "public"."lessons" as PERMISSIVE for DELETE to authenticated using (true);
