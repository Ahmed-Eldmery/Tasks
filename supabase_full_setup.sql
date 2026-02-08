-- ==========================================
-- 🚀 FULL SETUP SCRIPT (Run this in Supabase SQL Editor)
-- ==========================================

-- 1. Create PROFILES table (Syncs with Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  role text default 'member', -- 'member' or 'hr'
  created_at timestamptz default now()
);

-- 2. Create TASKS table
create table if not exists public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  content text not null,
  is_completed boolean default false,
  is_timer_running boolean default false,
  duration_seconds integer default 0,
  date date not null, -- Stores 'YYYY-MM-DD'
  created_at timestamptz default now()
);

-- 3. Create CALENDAR_MARKS table (For "College" attendance)
create table if not exists public.calendar_marks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  type text default 'college',
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- 4. Create APP_SETTINGS table (For Schedule Image URL, etc.)
create table if not exists public.app_settings (
  key text primary key,
  value text
);

-- ==========================================
-- 🛡️ SECURITY POLICIES (RLS)
-- ==========================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.calendar_marks enable row level security;
alter table public.app_settings enable row level security;

-- PROFILES Policies
drop policy if exists "Public profiles are viewable by everyone" on profiles;
create policy "Public profiles are viewable by everyone" 
  on profiles for select using ( true );

drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile" 
  on profiles for insert with check ( auth.uid() = id );

drop policy if exists "Users can update own profile" on profiles;
create policy "Users can update own profile" 
  on profiles for update using ( auth.uid() = id );

-- TASKS Policies
drop policy if exists "Users can view their own tasks" on tasks;
create policy "Users can view their own tasks" 
  on tasks for select using ( auth.uid() = user_id );

drop policy if exists "HR can view ALL tasks" on tasks;
create policy "HR can view ALL tasks" 
  on tasks for select using ( 
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'hr')
  );

drop policy if exists "Users can insert their own tasks" on tasks;
create policy "Users can insert their own tasks" 
  on tasks for insert with check ( auth.uid() = user_id );

drop policy if exists "Users can update their own tasks" on tasks;
create policy "Users can update their own tasks" 
  on tasks for update using ( auth.uid() = user_id );

drop policy if exists "Users can delete their own tasks" on tasks;
create policy "Users can delete their own tasks" 
  on tasks for delete using ( auth.uid() = user_id );

-- CALENDAR_MARKS Policies
drop policy if exists "Anyone can view calendar marks" on calendar_marks;
create policy "Anyone can view calendar marks" 
  on calendar_marks for select using ( true );

drop policy if exists "Users can manage their own marks" on calendar_marks;
create policy "Users can manage their own marks" 
  on calendar_marks for all using ( auth.uid() = user_id );
  
drop policy if exists "Users can view all marks" on calendar_marks;
drop policy if exists "Users can insert their own marks" on calendar_marks;
drop policy if exists "Users can update their own marks" on calendar_marks;
drop policy if exists "Users can delete their own marks" on calendar_marks;

-- APP_SETTINGS Policies
drop policy if exists "Everyone can view settings" on app_settings;
create policy "Everyone can view settings" 
  on app_settings for select using ( true );

drop policy if exists "Only HR can modify settings" on app_settings;
create policy "Only HR can modify settings" 
  on app_settings for all using ( 
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.role = 'hr') 
  );

-- ==========================================
-- ⚡ TRIGGERS (Auto-Confirm & Profile Sync)
-- ==========================================

-- A. Auto-Confirm Email (Fixes "Check your email" loop)
-- WARNING: This automatically confirms ANY new email signup.
CREATE OR REPLACE FUNCTION public.auto_confirm_user() 
RETURNS trigger AS $$
BEGIN
  UPDATE auth.users
  SET email_confirmed_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid error on re-run
DROP TRIGGER IF EXISTS on_auth_user_created_confirm ON auth.users;
CREATE TRIGGER on_auth_user_created_confirm
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_user();

-- CONFIRM ALL EXISTING USERS (Run this once to fix old accounts)
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;


-- CONFIRM ALL EXISTING USERS (To fix previous attempts)
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;



-- B. Auto-Create Profile on Signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, new.email, 'member')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- ✅ DONE
-- ==========================================
