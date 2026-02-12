
-- Allow service role full access to phone_otps (RLS bypass confirmation)
CREATE POLICY "Service role full access" ON public.phone_otps
FOR ALL
USING (true)
WITH CHECK (true);
