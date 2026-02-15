
-- Add starts_at to ticket_types for controlling when a ticket becomes visible/available
ALTER TABLE public.ticket_types ADD COLUMN starts_at timestamp with time zone DEFAULT NULL;

-- Add archived flag to events for soft-delete
ALTER TABLE public.events ADD COLUMN archived boolean NOT NULL DEFAULT false;

-- Update the public SELECT policy on events to hide archived events from public
DROP POLICY "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view non-archived events"
  ON public.events FOR SELECT
  USING (archived = false OR auth.uid() = user_id);
