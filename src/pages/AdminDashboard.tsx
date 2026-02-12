import { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRegistrations, DbRegistration } from '@/hooks/useRegistrations';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, DollarSign, Ticket, TrendingUp, Download, QrCode, Loader2, PlusCircle, UserCheck, Calendar, Send, ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import CreateEventForm from '@/components/admin/CreateEventForm';
import CheckInScanner from '@/components/admin/CheckInScanner';
import EventManager from '@/components/admin/EventManager';
import RoleManager from '@/components/admin/RoleManager';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEvents } from '@/hooks/useEvents';

const statusBadge: Record<string, string> = {
  confirmed: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  'checked-in': 'bg-primary/10 text-primary border-primary/20',
};

const paymentBadge: Record<string, string> = {
  paid: 'bg-success/10 text-success border-success/20',
  pending: 'bg-warning/10 text-warning border-warning/20',
  refunded: 'bg-muted text-muted-foreground',
  free: 'bg-secondary text-secondary-foreground',
  failed: 'bg-destructive/10 text-destructive border-destructive/20',
};

const AdminDashboard = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedReg, setSelectedReg] = useState<DbRegistration | null>(null);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [selectedEventForSms, setSelectedEventForSms] = useState('');
  const { data: registrations = [], isLoading } = useRegistrations();
  const { data: events = [] } = useEvents();
  const { hasRole, roles } = useAuth();

  const isAdmin = hasRole('admin');
  const isEventManager = hasRole('event_manager');
  const isFinanceOfficer = hasRole('finance_officer');
  const isCheckinStaff = hasRole('checkin_staff');

  // Access rules: admin sees everything, others see their specific tabs
  const canSeeRegistrations = isAdmin || isEventManager || isFinanceOfficer;
  const canSeeEvents = isAdmin || isEventManager;
  const canCreateEvents = isAdmin || isEventManager;
  const canSeeCheckin = isAdmin || isCheckinStaff;
  const canSeeFinance = isAdmin || isFinanceOfficer;
  const canSeeRoles = isAdmin;

  const filtered = registrations.filter((r) => {
    const eventTitle = (r.events as any)?.title || '';
    const ticketName = (r.ticket_types as any)?.name || '';
    const matchesSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase()) ||
      r.ticket_id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || r.payment_status === paymentFilter;
    return matchesSearch && matchesStatus && matchesPayment;
  });

  const totalRevenue = registrations.filter((r) => r.payment_status === 'paid').reduce((s, r) => s + r.amount, 0);
  const totalRegistrations = registrations.length;
  const checkedIn = registrations.filter((r) => r.status === 'checked-in').length;
  const pendingPayments = registrations.filter((r) => r.payment_status === 'pending').length;

  const stats = [
    { label: 'Total Registrations', value: totalRegistrations, icon: Users, color: 'text-primary' },
    { label: 'Revenue', value: `GH₵${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-success' },
    { label: 'Checked In', value: checkedIn, icon: Ticket, color: 'text-accent' },
    { label: 'Pending Payments', value: pendingPayments, icon: TrendingUp, color: 'text-warning' },
  ];

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Phone', 'Event', 'Ticket Type', 'Ticket ID', 'Status', 'Payment', 'Amount'];
    const rows = filtered.map((r) => [
      r.name, r.email, r.phone || '', (r.events as any)?.title || '', (r.ticket_types as any)?.name || '',
      r.ticket_id, r.status, r.payment_status, r.amount,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'registrations.csv';
    a.click();
  };

  const handleSendPendingSms = async () => {
    if (!selectedEventForSms || isSendingSms) return;
    setIsSendingSms(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-pending-sms', {
        body: { event_id: selectedEventForSms },
      });
      if (error) throw error;
      toast.success(data?.message || `SMS sent to ${data?.sent || 0} pending registrant(s)`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to send SMS');
    } finally {
      setIsSendingSms(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage registrations across your events</p>
          </div>
        </div>

        <Tabs defaultValue={canSeeRegistrations ? "registrations" : canSeeCheckin ? "checkin" : "events"} className="space-y-6">
          <TabsList className="flex-wrap">
            {canSeeRegistrations && <TabsTrigger value="registrations" className="gap-2"><Users className="h-4 w-4" /> Registrations</TabsTrigger>}
            {canSeeEvents && <TabsTrigger value="events" className="gap-2"><Calendar className="h-4 w-4" /> My Events</TabsTrigger>}
            {canCreateEvents && <TabsTrigger value="create" className="gap-2"><PlusCircle className="h-4 w-4" /> Create Event</TabsTrigger>}
            {canSeeCheckin && <TabsTrigger value="checkin" className="gap-2"><UserCheck className="h-4 w-4" /> Check-In</TabsTrigger>}
            {canSeeRoles && <TabsTrigger value="roles" className="gap-2"><ShieldCheck className="h-4 w-4" /> Roles</TabsTrigger>}
          </TabsList>

          <TabsContent value="registrations" className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <div className="flex gap-2 items-center">
                <Select value={selectedEventForSms} onValueChange={setSelectedEventForSms}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={handleSendPendingSms}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  disabled={!selectedEventForSms || isSendingSms}
                >
                  {isSendingSms ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  SMS Pending
                </Button>
              </div>
              <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>
        {canSeeFinance && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
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
        )}

        <Card>
          <CardHeader>
            <CardTitle className="font-heading">Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, ticket ID..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="checked-in">Checked In</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              </div>
            ) : (
              <div className="rounded-lg border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">Event</TableHead>
                      <TableHead>Ticket</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Payment</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No registrations found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filtered.map((reg) => (
                        <TableRow key={reg.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedReg(reg)}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{reg.name}</p>
                              <p className="text-xs text-muted-foreground">{reg.email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                            {(reg.events as any)?.title || '—'}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{(reg.ticket_types as any)?.name || '—'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusBadge[reg.status] || ''}>{reg.status}</Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <Badge variant="outline" className={paymentBadge[reg.payment_status] || ''}>{reg.payment_status}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {reg.amount === 0 ? '—' : `GH₵${reg.amount.toLocaleString()}`}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setSelectedReg(reg); }}>
                              <QrCode className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="events">
            <EventManager />
          </TabsContent>

          <TabsContent value="create">
            <CreateEventForm />
          </TabsContent>

          <TabsContent value="checkin">
            <CheckInScanner />
          </TabsContent>

          {canSeeRoles && (
            <TabsContent value="roles">
              <RoleManager />
            </TabsContent>
          )}
        </Tabs>
      </div>

      <Dialog open={!!selectedReg} onOpenChange={() => setSelectedReg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">Registration Details</DialogTitle>
          </DialogHeader>
          {selectedReg && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-card rounded-xl border">
                  <QRCodeSVG value={selectedReg.ticket_id} size={140} />
                </div>
              </div>
              <p className="text-center font-heading font-bold text-lg">{selectedReg.ticket_id}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Name</span><p className="font-medium">{selectedReg.name}</p></div>
                <div><span className="text-muted-foreground">Email</span><p className="font-medium">{selectedReg.email}</p></div>
                <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{selectedReg.phone || '—'}</p></div>
                <div><span className="text-muted-foreground">Ticket</span><p className="font-medium">{(selectedReg.ticket_types as any)?.name || '—'}</p></div>
                <div><span className="text-muted-foreground">Event</span><p className="font-medium">{(selectedReg.events as any)?.title || '—'}</p></div>
                <div><span className="text-muted-foreground">Amount</span><p className="font-medium">{selectedReg.amount === 0 ? 'Free' : `GH₵${selectedReg.amount.toLocaleString()}`}</p></div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline" className={statusBadge[selectedReg.status] || ''}>{selectedReg.status}</Badge>
                <Badge variant="outline" className={paymentBadge[selectedReg.payment_status] || ''}>{selectedReg.payment_status}</Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
