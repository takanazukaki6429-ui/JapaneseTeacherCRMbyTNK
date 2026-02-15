-- Add has_completed_onboarding to user_settings
alter table public.user_settings
add column if not exists has_completed_onboarding boolean default false;

-- Update existing users to true (optional, but good for dev if we assume existing users are onboarded)
-- update public.user_settings set has_completed_onboarding = true where display_name is not null;
