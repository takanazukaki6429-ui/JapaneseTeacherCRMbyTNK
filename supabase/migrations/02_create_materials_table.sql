-- Create Materials table
create table public.materials (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  title text not null,
  type text not null check (type in ('prompt', 'content', 'document')),
  content text,
  tags text[], -- Array of strings for tags
  is_public boolean default false,
  author_id uuid references auth.users(id) -- Optional connection to Auth
);

-- Enable RLS
alter table public.materials enable row level security;

-- Policy (Allow all for development - adjust for production)
create policy "Allow public access for dev" on public.materials for all using (true);
