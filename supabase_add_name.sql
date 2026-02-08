-- Add name column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS name text;

-- Update existing profiles to use the part of email before @ as name (temporary fix for existing users)
UPDATE public.profiles
SET name = split_part(email, '@', 1)
WHERE name IS NULL;
