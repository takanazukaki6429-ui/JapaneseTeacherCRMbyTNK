-- Add profile fields to user_settings table
alter table public.user_settings 
add column if not exists display_name text,
add column if not exists avatar_url text;

-- (Optional) You might want to update the handle_new_user function if you wanted to set defaults, 
-- but for now leaving them null is fine as they will be filled during onboarding.
