-- Run this in Supabase SQL Editor
-- Adds onboarding_done column if it doesn't exist yet

alter table profiles 
  add column if not exists onboarding_done boolean default false;

-- Confirm it's there
select column_name, data_type, column_default 
from information_schema.columns 
where table_name = 'profiles' 
and column_name = 'onboarding_done';
