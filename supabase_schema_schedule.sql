-- Create table for storing schedule marks
create table calendar_marks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  date date not null,
  type text default 'college',
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- Create table for app settings (like schedule image url)
create table app_settings (
  key text primary key,
  value text
);

-- Enable RLS
alter table calendar_marks enable row level security;
alter table app_settings enable row level security;

-- RLS Policies for calendar_marks
create policy "Users can view all marks" on calendar_marks
  for select using (true);

create policy "Users can insert their own marks" on calendar_marks
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own marks" on calendar_marks
  for update using (auth.uid() = user_id);

create policy "Users can delete their own marks" on calendar_marks
  for delete using (auth.uid() = user_id);

-- RLS Policies for app_settings
create policy "Everyone can view settings" on app_settings
  for select using (true);

create policy "Only HR can modify settings" on app_settings
  for all using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role = 'hr'
    )
  );
