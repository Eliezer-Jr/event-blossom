-- Fix SELECT policy - also restrictive, needs to be permissive
DROP POLICY "Event owners can view registrations" ON public.registrations;

CREATE POLICY "Event owners can view registrations"
ON public.registrations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = registrations.event_id
      AND events.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);

-- Fix UPDATE policy
DROP POLICY "Event owners can update registrations" ON public.registrations;

CREATE POLICY "Event owners can update registrations"
ON public.registrations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM events
    WHERE events.id = registrations.event_id
      AND events.user_id = auth.uid()
  )
);