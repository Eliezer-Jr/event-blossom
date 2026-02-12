import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

interface TicketTypeInput {
  name: string;
  price: string;
  quantity: string;
  description: string;
}

const emptyTicket = (): TicketTypeInput => ({ name: '', price: '0', quantity: '50', description: '' });

const CreateEventForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    capacity: '100',
    category: 'General',
    organizer: '',
    image_url: '',
  });
  const [tickets, setTickets] = useState<TicketTypeInput[]>([emptyTicket()]);

  const updateForm = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const updateTicket = (index: number, key: keyof TicketTypeInput, value: string) => {
    setTickets((prev) => prev.map((t, i) => (i === index ? { ...t, [key]: value } : t)));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;

    const validTickets = tickets.filter((t) => t.name.trim());
    if (validTickets.length === 0) {
      toast.error('Add at least one ticket type');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: event, error } = await supabase
        .from('events')
        .insert({
          title: form.title,
          description: form.description,
          date: form.date,
          time: form.time,
          venue: form.venue,
          capacity: parseInt(form.capacity) || 100,
          category: form.category,
          organizer: form.organizer,
          image_url: form.image_url || null,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const ticketInserts = validTickets.map((t) => ({
        event_id: event.id,
        name: t.name,
        price: parseInt(t.price) || 0,
        quantity: parseInt(t.quantity) || 50,
        description: t.description || null,
      }));

      const { error: ticketError } = await supabase.from('ticket_types').insert(ticketInserts);
      if (ticketError) throw ticketError;

      toast.success('Event created successfully!');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setForm({ title: '', description: '', date: '', time: '', venue: '', capacity: '100', category: 'General', organizer: '', image_url: '' });
      setTickets([emptyTicket()]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading">Create New Event</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Event Title</Label>
              <Input id="title" required value={form.title} onChange={(e) => updateForm('title', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => updateForm('description', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" required value={form.date} onChange={(e) => updateForm('date', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="time">Time</Label>
              <Input id="time" required placeholder="e.g. 10:00 AM" value={form.time} onChange={(e) => updateForm('time', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="venue">Venue</Label>
              <Input id="venue" required value={form.venue} onChange={(e) => updateForm('venue', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="capacity">Capacity</Label>
              <Input id="capacity" type="number" min="1" value={form.capacity} onChange={(e) => updateForm('capacity', e.target.value)} />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={form.category} onValueChange={(v) => updateForm('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['General', 'Conference', 'Workshop', 'Concert', 'Sports', 'Social', 'Networking'].map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="organizer">Organizer</Label>
              <Input id="organizer" value={form.organizer} onChange={(e) => updateForm('organizer', e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="image_url">Image URL (optional)</Label>
              <Input id="image_url" type="url" value={form.image_url} onChange={(e) => updateForm('image_url', e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-heading">Ticket Types</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setTickets((t) => [...t, emptyTicket()])}>
                <Plus className="h-4 w-4 mr-1" /> Add Ticket
              </Button>
            </div>
            {tickets.map((ticket, i) => (
              <div key={i} className="grid gap-3 sm:grid-cols-4 p-4 rounded-lg border bg-secondary/30">
                <div>
                  <Label>Name</Label>
                  <Input placeholder="e.g. Regular" value={ticket.name} onChange={(e) => updateTicket(i, 'name', e.target.value)} />
                </div>
                <div>
                  <Label>Price (₦)</Label>
                  <Input type="number" min="0" value={ticket.price} onChange={(e) => updateTicket(i, 'price', e.target.value)} />
                </div>
                <div>
                  <Label>Quantity</Label>
                  <Input type="number" min="1" value={ticket.quantity} onChange={(e) => updateTicket(i, 'quantity', e.target.value)} />
                </div>
                <div className="flex items-end">
                  {tickets.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setTickets((t) => t.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateEventForm;
