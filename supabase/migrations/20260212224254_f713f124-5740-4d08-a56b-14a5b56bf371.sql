
-- Table for storing custom OTP codes
CREATE TABLE public.phone_otps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for lookups
CREATE INDEX idx_phone_otps_phone_code ON public.phone_otps (phone, code);

-- Enable RLS (edge function uses service role, so no user policies needed)
ALTER TABLE public.phone_otps ENABLE ROW LEVEL SECURITY;

-- Clean up expired OTPs automatically via a function
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.phone_otps WHERE expires_at < now() - interval '1 hour';
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_otps
AFTER INSERT ON public.phone_otps
FOR EACH STATEMENT
EXECUTE FUNCTION public.cleanup_expired_otps();
