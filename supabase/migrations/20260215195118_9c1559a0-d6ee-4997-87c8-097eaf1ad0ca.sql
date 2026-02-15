
-- Allow admins to update any event (including archiving)
DROP POLICY "Users can update own events" ON public.events;
CREATE POLICY "Users can update own events or admin"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete any event
DROP POLICY "Users can delete own events" ON public.events;
CREATE POLICY "Users can delete own events or admin"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
