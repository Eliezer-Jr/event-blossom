import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event, TicketType } from '@/types/event';

export const useEvents = () => {
  return useQuery({
    queryKey: ['events'],
    queryFn: async (): Promise<Event[]> => {
      const { data: events, error } = await supabase
        .from('events')
        .select('*, ticket_types(*), custom_fields')
        .order('date', { ascending: true });

      if (error) throw error;

      return (events || []).map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description || '',
        date: e.date,
        time: e.time,
        venue: e.venue,
        imageUrl: e.image_url || '',
        capacity: e.capacity,
        registeredCount: e.registered_count,
        status: e.status as Event['status'],
        organizer: e.organizer || '',
        category: e.category,
        customFields: (e.custom_fields as any) || [],
        ticketTypes: (e.ticket_types || []).map((t: any): TicketType => ({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity: t.quantity,
          sold: t.sold,
          description: t.description || undefined,
        })),
      }));
    },
  });
};

export const useEvent = (id: string | undefined) => {
  return useQuery({
    queryKey: ['event', id],
    queryFn: async (): Promise<Event | null> => {
      if (!id) return null;

      const { data: e, error } = await supabase
        .from('events')
        .select('*, ticket_types(*), custom_fields')
        .eq('id', id)
        .single();

      if (error) return null;

      return {
        id: e.id,
        title: e.title,
        description: e.description || '',
        date: e.date,
        time: e.time,
        venue: e.venue,
        imageUrl: e.image_url || '',
        capacity: e.capacity,
        registeredCount: e.registered_count,
        status: e.status as Event['status'],
        organizer: e.organizer || '',
        category: e.category,
        customFields: (e.custom_fields as any) || [],
        ticketTypes: (e.ticket_types || []).map((t: any): TicketType => ({
          id: t.id,
          name: t.name,
          price: t.price,
          quantity: t.quantity,
          sold: t.sold,
          description: t.description || undefined,
        })),
      };
    },
    enabled: !!id,
  });
};
