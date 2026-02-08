-- Add last_timer_start column to tasks table to track server-side timer
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS last_timer_start timestamptz;
