
-- Fix: Make events policies PERMISSIVE so they work with OR logic
-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Anyone can view non-archived events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Users can update own events or admin" ON public.events;
DROP POLICY IF EXISTS "Users can delete own events or admin" ON public.events;

-- Recreate as PERMISSIVE policies
CREATE POLICY "Anyone can view non-archived events"
  ON public.events FOR SELECT
  USING (archived = false OR auth.uid() = user_id);

CREATE POLICY "Authenticated users can create events"
  ON public.events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own events or admin"
  ON public.events FOR UPDATE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can delete own events or admin"
  ON public.events FOR DELETE
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));
