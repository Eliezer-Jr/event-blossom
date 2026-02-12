
-- Allow events to exist without a real user (for seed/public events)
ALTER TABLE public.events ALTER COLUMN user_id SET DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE public.events DROP CONSTRAINT events_user_id_fkey;
