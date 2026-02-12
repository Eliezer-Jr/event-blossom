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
import { Pencil, Trash2, Loader2, CalendarDays, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { Event } from '@/types/event';
import { CustomField } from '@/types/customField';
import CustomFieldBuilder from './CustomFieldBuilder';

const EventManager = () => {
  const { user } = useAuth();
  const { data: events = [], isLoading } = useEvents();
  const queryClient = useQueryClient();
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [deleteEvent, setDeleteEvent] = useState<Event | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '', description: '', date: '', time: '', venue: '',
    capacity: '', category: '', organizer: '', image_url: '',
  });
  const [customFields, setCustomFields] = useState<CustomField[]>([]);

  const myEvents = events.filter((e) => true); // RLS handles filtering

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
    // Load custom fields from event - we need to fetch from DB since useEvents doesn't include it
    loadCustomFields(event.id);
    setEditEvent(event);
  };

  const loadCustomFields = async (eventId: string) => {
    const { data } = await supabase
      .from('events')
      .select('custom_fields')
      .eq('id', eventId)
      .single();
    setCustomFields((data?.custom_fields as unknown as CustomField[]) || []);
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
      toast.success('Event updated!');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setEditEvent(null);
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEvent || isDeleting) return;
    setIsDeleting(true);
    try {
      // Delete ticket types first
      await supabase.from('ticket_types').delete().eq('event_id', deleteEvent.id);
      const { error } = await supabase.from('events').delete().eq('id', deleteEvent.id);
      if (error) throw error;
      toast.success('Event deleted');
      queryClient.invalidateQueries({ queryKey: ['events'] });
      setDeleteEvent(null);
    } catch (err: any) {
      toast.error(err.message || 'Delete failed');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <div className="rounded-lg overflow-x-auto">
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
                {myEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No events yet. Create one from the "Create Event" tab.
                    </TableCell>
                  </TableRow>
                ) : (
                  myEvents.map((event) => (
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
                        }>{event.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {event.registeredCount} / {event.capacity}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(event)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteEvent(event)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editEvent} onOpenChange={() => setEditEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">Edit Event</DialogTitle>
            <DialogDescription>Update event details and custom registration fields.</DialogDescription>
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

      {/* Delete Confirmation */}
      <Dialog open={!!deleteEvent} onOpenChange={() => setDeleteEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Delete Event</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteEvent?.title}"? This will also remove all associated ticket types. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setDeleteEvent(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : 'Delete Event'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EventManager;
