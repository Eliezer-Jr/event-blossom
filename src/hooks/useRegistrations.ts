import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DbRegistration {
  id: string;
  event_id: string;
  name: string;
  email: string;
  phone: string | null;
  ticket_id: string;
  ticket_type_id: string;
  status: string;
  payment_status: string;
  amount: number;
  created_at: string;
  checked_in_at: string | null;
  events?: { title: string } | null;
  ticket_types?: { name: string } | null;
}

export const useRegistrations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['registrations', user?.id],
    queryFn: async (): Promise<DbRegistration[]> => {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, events(title), ticket_types(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });
};
