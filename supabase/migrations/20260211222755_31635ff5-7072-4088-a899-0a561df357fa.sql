
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  organization TEXT,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Events table
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  venue TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100,
  registered_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'past', 'sold-out')),
  category TEXT NOT NULL DEFAULT 'General',
  organizer TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view events" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own events" ON public.events FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own events" ON public.events FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ticket types table
CREATE TABLE public.ticket_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 50,
  sold INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ticket types" ON public.ticket_types FOR SELECT USING (true);
CREATE POLICY "Event owners can manage ticket types" ON public.ticket_types FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));
CREATE POLICY "Event owners can update ticket types" ON public.ticket_types FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));
CREATE POLICY "Event owners can delete ticket types" ON public.ticket_types FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));

-- Registrations table
CREATE TABLE public.registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  ticket_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('confirmed', 'pending', 'cancelled', 'checked-in')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'refunded', 'free')),
  amount INTEGER NOT NULL DEFAULT 0,
  stripe_payment_intent_id TEXT,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Event owners can view registrations" ON public.registrations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid())
    OR user_id = auth.uid()
  );
CREATE POLICY "Anyone can create registrations" ON public.registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Event owners can update registrations" ON public.registrations FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.events WHERE id = event_id AND user_id = auth.uid()));

CREATE TRIGGER update_registrations_updated_at
  BEFORE UPDATE ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment registered_count
CREATE OR REPLACE FUNCTION public.increment_registration_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.events SET registered_count = registered_count + 1 WHERE id = NEW.event_id;
  UPDATE public.ticket_types SET sold = sold + 1 WHERE id = NEW.ticket_type_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_registration_created
  AFTER INSERT ON public.registrations
  FOR EACH ROW EXECUTE FUNCTION public.increment_registration_count();
