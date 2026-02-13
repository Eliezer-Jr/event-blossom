
-- Fix events SELECT policy: make it permissive so subqueries in other policies can read events
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
CREATE POLICY "Anyone can view events"
ON public.events
FOR SELECT
TO anon, authenticated
USING (true);

-- Fix ticket_types SELECT policy: make it permissive
DROP POLICY IF EXISTS "Anyone can view ticket types" ON public.ticket_types;
CREATE POLICY "Anyone can view ticket types"
ON public.ticket_types
FOR SELECT
TO anon, authenticated
USING (true);
