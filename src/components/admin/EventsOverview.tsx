import { useState } from 'react';
import { useEvents } from '@/hooks/useEvents';
import { useRegistrations, DbRegistration } from '@/hooks/useRegistrations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { CalendarDays, MapPin, Users, DollarSign, Ticket, TrendingUp, BarChart3, Search, X, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

const statusBadge: Record<string, string> = {
  upcoming: 'bg-primary/10 text-primary border-primary/20',
  ongoing: 'bg-success/10 text-success border-success/20',
  past: 'bg-muted text-muted-foreground',
  'sold-out': 'bg-destructive/10 text-destructive border-destructive/20',
};

const statusColors: Record<string, string> = {
  confirmed: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  'checked-in': 'bg-primary/10 text-primary border-primary/20',
};

const paymentColors: Record<string, string> = {
  paid: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  free: 'bg-secondary text-secondary-foreground',
  refunded: 'bg-muted text-muted-foreground',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
};

const EventsOverview = () => {
  const { data: events = [], isLoading } = useEvents();
  const { data: registrations = [] } = useRegistrations();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [regSearch, setRegSearch] = useState('');
  const [regStatusFilter, setRegStatusFilter] = useState('all');
  const [regPaymentFilter, setRegPaymentFilter] = useState('all');

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const eventRegs = registrations.filter((r) => r.event_id === selectedEventId);
  const filteredRegs = eventRegs.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(regSearch.toLowerCase()) ||
      r.email.toLowerCase().includes(regSearch.toLowerCase()) ||
      r.ticket_id.toLowerCase().includes(regSearch.toLowerCase()) ||
      (r.phone || '').toLowerCase().includes(regSearch.toLowerCase());
    const matchStatus = regStatusFilter === 'all' || r.status === regStatusFilter;
    const matchPayment = regPaymentFilter === 'all' || r.payment_status === regPaymentFilter;
    return matchSearch && matchStatus && matchPayment;
  });

  const totalEvents = events.length;
  const totalCapacity = events.reduce((s, e) => s + e.capacity, 0);
  const totalRegistered = events.reduce((s, e) => s + e.registeredCount, 0);
  const totalRevenue = registrations.filter((r) => r.payment_status === 'paid').reduce((s, r) => s + r.amount, 0);
  const upcomingCount = events.filter((e) => e.status === 'upcoming').length;
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalRegistered / totalCapacity) * 100) : 0;

  const stats = [
    { label: 'Total Events', value: totalEvents, icon: CalendarDays, color: 'text-primary' },
    { label: 'Total Registrations', value: totalRegistered, icon: Users, color: 'text-success' },
    { label: 'Total Revenue', value: `GH₵${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-warning' },
    { label: 'Upcoming', value: upcomingCount, icon: TrendingUp, color: 'text-accent' },
    { label: 'Avg Occupancy', value: `${avgOccupancy}%`, icon: BarChart3, color: 'text-primary' },
    { label: 'Total Capacity', value: totalCapacity.toLocaleString(), icon: Ticket, color: 'text-muted-foreground' },
  ];

  const getEventRegistrations = (eventId: string) =>
    registrations.filter((r) => r.event_id === eventId);

  const getEventRevenue = (eventId: string) =>
    getEventRegistrations(eventId)
      .filter((r) => r.payment_status === 'paid')
      .reduce((s, r) => s + r.amount, 0);

  const getEventCheckedIn = (eventId: string) =>
    getEventRegistrations(eventId).filter((r) => r.status === 'checked-in').length;

  const getEventPending = (eventId: string) =>
    getEventRegistrations(eventId).filter((r) => r.payment_status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="font-heading text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Capacity</TableHead>
                    <TableHead className="text-right">Registered</TableHead>
                    <TableHead className="text-right">Checked In</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Occupancy</TableHead>
                    <TableHead>Tickets</TableHead>
                    <TableHead>Organizer</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={14} className="text-center py-8 text-muted-foreground">
                        No events found
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => {
                      const revenue = getEventRevenue(event.id);
                      const checkedIn = getEventCheckedIn(event.id);
                      const pending = getEventPending(event.id);
                      const occupancy = event.capacity > 0 ? Math.round((event.registeredCount / event.capacity) * 100) : 0;

                      return (
                        <TableRow key={event.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedEventId(event.id); setRegSearch(''); setRegStatusFilter('all'); setRegPaymentFilter('all'); }}>
                          <TableCell>
                            <p className="font-medium">{event.title}</p>
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <CalendarDays className="h-3 w-3" />
                              {event.date}
                            </div>
                            <p className="text-xs text-muted-foreground">{event.time}</p>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3 shrink-0" />
                              <span className="truncate max-w-[120px]">{event.venue}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">{event.category}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusBadge[event.status] || ''}>{event.status}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{event.capacity}</TableCell>
                          <TableCell className="text-right font-medium">{event.registeredCount}</TableCell>
                          <TableCell className="text-right">{checkedIn}</TableCell>
                          <TableCell className="text-right">
                            {pending > 0 ? (
                              <span className="text-warning font-medium">{pending}</span>
                            ) : (
                              '0'
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {revenue > 0 ? `GH₵${revenue.toLocaleString()}` : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className={occupancy >= 80 ? 'text-destructive font-medium' : occupancy >= 50 ? 'text-warning' : ''}>
                              {occupancy}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              {event.ticketTypes.map((t) => (
                                <p key={t.id} className="text-xs text-muted-foreground whitespace-nowrap">
                                  {t.name}: {t.sold}/{t.quantity} — GH₵{t.price}
                                </p>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{event.organizer || '—'}</TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedEventId(event.id); }}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={!!selectedEventId} onOpenChange={(open) => !open && setSelectedEventId(null)}>
        <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-heading">{selectedEvent?.title} — Registrations ({eventRegs.length})</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search name, email, phone, ticket…" className="pl-9" value={regSearch} onChange={(e) => setRegSearch(e.target.value)} />
              </div>
              <Select value={regStatusFilter} onValueChange={setRegStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={regPaymentFilter} onValueChange={setRegPaymentFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Payment" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payment</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <p className="text-sm text-muted-foreground">{filteredRegs.length} registrant(s)</p>

            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Checked In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-6 text-muted-foreground">No registrations found</TableCell>
                    </TableRow>
                  ) : (
                    filteredRegs.map((reg) => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.name}</TableCell>
                        <TableCell className="text-sm">{reg.email}</TableCell>
                        <TableCell className="text-sm">{reg.phone || '—'}</TableCell>
                        <TableCell className="text-sm">{(reg.ticket_types as any)?.name || '—'}</TableCell>
                        <TableCell className="text-xs font-mono">{reg.ticket_id}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[reg.status] || ''}>{reg.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={paymentColors[reg.payment_status] || ''}>{reg.payment_status}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {reg.amount === 0 ? '—' : `GH₵${reg.amount.toLocaleString()}`}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(reg.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {reg.checked_in_at ? new Date(reg.checked_in_at).toLocaleString() : '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EventsOverview;
