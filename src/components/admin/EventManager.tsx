import { useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pencil, Trash2, Loader2, CalendarDays, MapPin, Archive, RotateCcw, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Event } from '@/types/event';
import { CustomField } from '@/types/customField';
import CustomFieldBuilder from './CustomFieldBuilder';

interface EditTicket {
  id?: string;
  name: string;
  price: string;
  quantity: string;
  description: string;
  endsAt: string;
  startsAt: string;
}

const EventManager = () => {
  const { user } = useAuth();
  const { data: events = [], isLoading } = useEvents();
  const queryClient = useQueryClient();
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [archiveEvent, setArchiveEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const [editForm, setEditForm] = useState({
    title: '', description: '', date: '', time: '', venue: '',
    capacity: '', category: '', organizer: '', image_url: '',
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [editTickets, setEditTickets] = useState<EditTicket[]>([]);

  const activeEvents = events.filter((e) => !e.archived);
  const archivedEvents = events.filter((e) => e.archived);

  const openEdit = (event: Event) => {
    setEditForm({
      title: event.title,
      description: event.description,
      date: event.date,
      time: event.time,
      venue: event.venue,
      capacity: String(event.capacity),
      category: event.category,
      organizer: event.organizer,
      image_url: event.imageUrl,
    });
    setCustomFields(event.customFields || []);
    setEditTickets(event.ticketTypes.map((t) => ({
      id: t.id,
      name: t.name,
      price: String(t.price),
      quantity: t.quantity >= 999999 ? '' : String(t.quantity),
      description: t.description || '',
      endsAt: t.endsAt ? t.endsAt.split('T')[0] : '',
      startsAt: t.startsAt ? t.startsAt.split('T')[0] : '',
    })));
    setEditEvent(event);
  };

  const updateEditTicket = (index: number, key: keyof EditTicket, value: string) => {
    setEditTickets((prev) => prev.map((t, i) => (i === index ? { ...t, [key]: value } : t)));
  };

  const handleUpdate = async () => {
    if (!editEvent || isSaving) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({
          title: editForm.title,
          description: editForm.description,
          date: editForm.date,
          time: editForm.time,
          venue: editForm.venue,
          capacity: parseInt(editForm.capacity) || 100,
          category: editForm.category,
          organizer: editForm.organizer,
          image_url: editForm.image_url || null,
          custom_fields: customFields as any,
        })
        .eq('id', editEvent.id);

      if (error) throw error;

      // Update tickets: delete removed, upsert existing/new
      const existingIds = editTickets.filter((t) => t.id).map((t) => t.id!);
      // Delete tickets that were removed
      if (editEvent.ticketTypes.length > 0) {
        const removedIds = editEvent.ticketTypes.map((t) => t.id).filter((id) => !existingIds.includes(id));
        if (removedIds.length > 0) {
          await supabase.from('ticket_types').delete().in('id', removedIds);
        }
      }

      // Update existing tickets
      for (const ticket of editTickets.filter((t) => t.id)) {
        await supabase.from('ticket_types').update({
          name: ticket.name,
          price: parseInt(ticket.price) || 0,
          quantity: ticket.quantity ? parseInt(ticket.quantity) : 999999,
          description: ticket.description || null,
          ends_at: ticket.endsAt ? new Date(ticket.endsAt).toISOString() : null,
          starts_at: ticket.startsAt ? new Date(ticket.startsAt).toISOString() : null,
        }).eq('id', ticket.id!);
      }

      // Insert new tickets
      const newTickets = editTickets.filter((t) => !t.id && t.name.trim());
      if (newTickets.length > 0) {
        await supabase.from('ticket_types').insert(newTickets.map((t) => ({
          event_id: editEvent.id,
          name: t.name,
          price: parseInt(t.price) || 0,
          quantity: t.quantity ? parseInt(t.quantity) : 999999,
          description: t.description || null,
          ends_at: t.endsAt ? new Date(t.endsAt).toISOString() : null,
          starts_at: t.startsAt ? new Date(t.startsAt).toISOString() : null,
        })));
      }

      toast.success('Event updated!');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEditEvent(null);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!archiveEvent || isArchiving) return;
    setIsArchiving(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ archived: true } as any)
        .eq('id', archiveEvent.id);
      if (error) throw error;
      toast.success('Event archived');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setArchiveEvent(null);
    } catch (err: any) {
      toast.error(err.message || 'Archive failed');
    } finally {
      setIsArchiving(false);
    }
  };

  const handleRestore = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ archived: false } as any)
        .eq('id', eventId);
      if (error) throw error;
      toast.success('Event restored');
      queryClient.invalidateQueries({ queryKey: ['events'] });
    } catch (err: any) {
      toast.error(err.message || 'Restore failed');
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  const renderEventTable = (eventList: Event[], isArchive = false) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Venue</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Registrations</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {eventList.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
              {isArchive ? 'No archived events.' : 'No events yet. Create one from the "Create Event" tab.'}
            </TableCell>
          </TableRow>
        ) : (
          eventList.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{event.title}</p>
                  <p className="text-xs text-muted-foreground">{event.category}</p>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(event.date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {event.venue}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={
                  event.status === 'upcoming' ? 'bg-primary/10 text-primary border-primary/20' :
                  event.status === 'ongoing' ? 'bg-success/10 text-success border-success/20' :
                  event.status === 'sold-out' ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-muted text-muted-foreground'
                }>{isArchive ? 'archived' : event.status}</Badge>
              </TableCell>
              <TableCell className="text-right font-medium">
                {event.registeredCount} / {event.capacity >= 999999 ? '∞' : event.capacity}
              </TableCell>
              <TableCell>
                <div className="flex gap-1 justify-end">
                  {isArchive ? (
                    <Button variant="ghost" size="icon" onClick={() => handleRestore(event.id)} title="Restore">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setArchiveEvent(event)}>
                        <Archive className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-x-auto">
            {renderEventTable(activeEvents)}
          </div>
        </CardContent>
      </Card>

      {/* Archived Events Toggle */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)} className="gap-2">
          <Archive className="h-4 w-4" />
          {showArchived ? 'Hide' : 'Show'} Archived ({archivedEvents.length})
        </Button>
      </div>

      {showArchived && archivedEvents.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="rounded-lg overflow-x-auto">
              {renderEventTable(archivedEvents, true)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Event</DialogTitle>
            <DialogDescription>Update event details, tickets, and custom registration fields.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Title</Label>
                <Input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
              </div>
              <div>
                <Label>Date</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
              </div>
              <div>
                <Label>Time</Label>
                <Input value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} />
              </div>
              <div>
                <Label>Venue</Label>
                <Input value={editForm.venue} onChange={(e) => setEditForm({ ...editForm, venue: e.target.value })} />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input type="number" value={editForm.capacity} onChange={(e) => setEditForm({ ...editForm, capacity: e.target.value })} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['General', 'Conference', 'Workshop', 'Concert', 'Sports', 'Social', 'Networking'].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Organizer</Label>
                <Input value={editForm.organizer} onChange={(e) => setEditForm({ ...editForm, organizer: e.target.value })} />
              </div>
              <div className="sm:col-span-2">
                <Label>Image URL</Label>
                <Input value={editForm.image_url} onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })} />
              </div>
            </div>

            {/* Ticket Types */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-heading">Ticket Types</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setEditTickets((t) => [...t, { name: '', price: '0', quantity: '', description: '', endsAt: '', startsAt: '' }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Ticket
                </Button>
              </div>
              {editTickets.map((ticket, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-6 p-4 rounded-lg border bg-secondary/30">
                  <div>
                    <Label>Name</Label>
                    <Input value={ticket.name} onChange={(e) => updateEditTicket(i, 'name', e.target.value)} />
                  </div>
                  <div>
                    <Label>Price (GH₵)</Label>
                    <Input type="number" min="0" value={ticket.price} onChange={(e) => updateEditTicket(i, 'price', e.target.value)} />
                  </div>
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min="1" placeholder="Unlimited" value={ticket.quantity} onChange={(e) => updateEditTicket(i, 'quantity', e.target.value)} />
                  </div>
                  <div>
                    <Label>Visible From</Label>
                    <Input type="date" value={ticket.startsAt} onChange={(e) => updateEditTicket(i, 'startsAt', e.target.value)} />
                  </div>
                  <div>
                    <Label>Ends On</Label>
                    <Input type="date" value={ticket.endsAt} onChange={(e) => updateEditTicket(i, 'endsAt', e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    {editTickets.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setEditTickets((t) => t.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <CustomFieldBuilder fields={customFields} onChange={setCustomFields} />

            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setEditEvent(null)}>Cancel</Button>
              <Button onClick={handleUpdate} disabled={isSaving}>
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Confirmation */}
      <Dialog open={!!archiveEvent} onOpenChange={() => setArchiveEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Archive Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to archive "{archiveEvent?.title}"? It will be hidden from the public but all data (registrations, tickets) will be preserved. You can restore it later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setArchiveEvent(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleArchive} disabled={isArchiving}>
              {isArchiving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Archiving...</> : 'Archive Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventManager;
