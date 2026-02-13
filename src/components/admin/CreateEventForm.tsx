import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Loader2, FileText, Upload, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { CustomField } from '@/types/customField';
import CustomFieldBuilder from './CustomFieldBuilder';
import { eventTemplates } from '@/data/eventTemplates';

interface TicketTypeInput {
  name: string;
  price: string;
  quantity: string;
  description: string;
  endsAt: string;
}

const emptyTicket = (): TicketTypeInput => ({ name: '', price: '0', quantity: '', description: '', endsAt: '' });

const CreateEventForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    venue: '',
    capacity: '',
    category: 'General',
    organizer: '',
  });
  const [tickets, setTickets] = useState<TicketTypeInput[]>([emptyTicket()]);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

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
      let imageUrl: string | null = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const filePath = `${user.id}/${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('event-images')
          .upload(filePath, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from('event-images')
          .getPublicUrl(filePath);
        imageUrl = urlData.publicUrl;
      }

      const { data: event, error } = await supabase
        .from('events')
        .insert({
          title: form.title,
          description: form.description,
          date: form.date,
          time: form.time,
          venue: form.venue,
          capacity: form.capacity ? parseInt(form.capacity) : 999999,
          category: form.category,
          organizer: form.organizer,
          image_url: imageUrl,
          user_id: user.id,
          custom_fields: customFields as any,
        })
        .select()
        .single();

      if (error) throw error;

      const ticketInserts = validTickets.map((t) => ({
        event_id: event.id,
        name: t.name,
        price: parseInt(t.price) || 0,
        quantity: t.quantity ? parseInt(t.quantity) : 999999,
        description: t.description || null,
        ends_at: t.endsAt ? new Date(t.endsAt).toISOString() : null,
      }));

      const { error: ticketError } = await supabase.from('ticket_types').insert(ticketInserts);
      if (ticketError) throw ticketError;

      toast.success('Event created successfully!');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setForm({ title: '', description: '', date: '', time: '', venue: '', capacity: '', category: 'General', organizer: '' });
      setImageFile(null);
      setImagePreview(null);
      setTickets([emptyTicket()]);
      setCustomFields([]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = eventTemplates.find((t) => t.id === templateId);
    if (!template) return;
    setForm((f) => ({ ...f, ...template.form }));
    setTickets(template.tickets);
    setCustomFields(template.customFields);
    toast.success(`"${template.label}" template applied!`);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="font-heading">Create New Event</CardTitle>
          <Select onValueChange={applyTemplate}>
            <SelectTrigger className="w-auto gap-2">
              <FileText className="h-4 w-4" />
              <SelectValue placeholder="Use template" />
            </SelectTrigger>
            <SelectContent>
              {eventTemplates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              <Label htmlFor="capacity">Capacity <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input id="capacity" type="number" min="1" placeholder="Unlimited" value={form.capacity} onChange={(e) => updateForm('capacity', e.target.value)} />
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
              <Label>Banner Image <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
              {imagePreview ? (
                <div className="relative mt-2 rounded-lg overflow-hidden border">
                  <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover" />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={() => { setImageFile(null); setImagePreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-2 h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-5 w-5 mr-2" /> Upload Image
                </Button>
              )}
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
              <div key={i} className="grid gap-3 sm:grid-cols-5 p-4 rounded-lg border bg-secondary/30">
                <div>
                  <Label>Name</Label>
                  <Input placeholder="e.g. Regular" value={ticket.name} onChange={(e) => updateTicket(i, 'name', e.target.value)} />
                </div>
                <div>
                  <Label>Price (GH₵)</Label>
                  <Input type="number" min="0" value={ticket.price} onChange={(e) => updateTicket(i, 'price', e.target.value)} />
                </div>
                 <div>
                  <Label>Quantity <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="number" min="1" placeholder="Unlimited" value={ticket.quantity} onChange={(e) => updateTicket(i, 'quantity', e.target.value)} />
                </div>
                <div>
                  <Label>Ends On <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input type="date" value={ticket.endsAt} onChange={(e) => updateTicket(i, 'endsAt', e.target.value)} />
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

          <CustomFieldBuilder fields={customFields} onChange={setCustomFields} />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : 'Create Event'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateEventForm;
