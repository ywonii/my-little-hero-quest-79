-- Fix user_progress table to allow null completed_at for incomplete attempts
ALTER TABLE public.user_progress 
ALTER COLUMN completed_at DROP NOT NULL;

-- Update the table to allow tracking incomplete attempts
ALTER TABLE public.user_progress 
ALTER COLUMN completed_at SET DEFAULT NULL;