
-- Drop the restrictive INSERT policy
DROP POLICY IF EXISTS "Anyone can register for events" ON public.registrations;

-- Recreate as PERMISSIVE so unauthenticated users can register
CREATE POLICY "Anyone can register for events"
ON public.registrations
FOR INSERT
TO public
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM ticket_types tt
    JOIN events e ON e.id = tt.event_id
    WHERE tt.id = registrations.ticket_type_id
      AND e.id = registrations.event_id
      AND tt.sold < tt.quantity
      AND e.status <> 'sold-out'
  )
);
