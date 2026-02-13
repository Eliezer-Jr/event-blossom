
-- The SELECT on registrations only allows event owners / authenticated users.
-- For the INSERT to return data (select=*), anon needs temporary SELECT on the row they just inserted.
-- Add a permissive policy allowing users to see their own registration by matching on user_id OR allow the inserter to see returned row
DROP POLICY IF EXISTS "Event owners can view registrations" ON public.registrations;
CREATE POLICY "Event owners can view registrations"
ON public.registrations
FOR SELECT
TO anon, authenticated
USING (
  (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = registrations.event_id
      AND events.user_id = auth.uid()
  ))
  OR (user_id = auth.uid())
  OR (user_id IS NULL)
);
