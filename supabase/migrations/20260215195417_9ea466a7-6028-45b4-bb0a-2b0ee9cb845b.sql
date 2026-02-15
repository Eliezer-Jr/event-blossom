-- Fix: SELECT policy must also allow admins to see all events (including archived)
-- This is needed because UPDATE checks new row against SELECT policies too
DROP POLICY IF EXISTS "Anyone can view non-archived events" ON public.events;

CREATE POLICY "Anyone can view non-archived events"
  ON public.events FOR SELECT
  USING (
    archived = false 
    OR auth.uid() = user_id 
    OR has_role(auth.uid(), 'admin'::app_role)
  );
