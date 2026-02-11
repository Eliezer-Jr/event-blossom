
-- Make registration insert require at minimum a valid ticket_type_id and event_id
DROP POLICY "Anyone can create registrations" ON public.registrations;
CREATE POLICY "Anyone can register for events" ON public.registrations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ticket_types tt
      JOIN public.events e ON e.id = tt.event_id
      WHERE tt.id = ticket_type_id
        AND e.id = event_id
        AND tt.sold < tt.quantity
        AND e.status != 'sold-out'
    )
  );
