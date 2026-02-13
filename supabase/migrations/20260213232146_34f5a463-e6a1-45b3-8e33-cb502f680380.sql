
-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Event owners can update registrations" ON public.registrations;

-- Recreate as permissive policy so event owners and admins can update
CREATE POLICY "Event owners can update registrations"
ON public.registrations
FOR UPDATE
TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = registrations.event_id
      AND events.user_id = auth.uid()
  ))
  OR public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM events
    WHERE events.id = registrations.event_id
      AND events.user_id = auth.uid()
  ))
  OR public.has_role(auth.uid(), 'admin')
);
