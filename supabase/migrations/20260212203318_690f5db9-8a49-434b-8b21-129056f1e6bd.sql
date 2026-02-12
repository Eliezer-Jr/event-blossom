-- Drop the restrictive INSERT policy and recreate as permissive
DROP POLICY "Anyone can register for events" ON public.registrations;

CREATE POLICY "Anyone can register for events"
ON public.registrations
FOR INSERT
TO authenticated, anon
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