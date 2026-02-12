import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, CheckCircle2, XCircle, Loader2, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';

interface FoundRegistration {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ticket_id: string;
  status: string;
  payment_status: string;
  amount: number;
  checked_in_at: string | null;
  events: { title: string } | null;
  ticket_types: { name: string } | null;
}

const CheckInScanner = () => {
  const [ticketId, setTicketId] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [found, setFound] = useState<FoundRegistration | null>(null);
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim() || isSearching) return;

    setIsSearching(true);
    setFound(null);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('registrations')
        .select('id, name, email, phone, ticket_id, status, payment_status, amount, checked_in_at, events(title), ticket_types(name)')
        .eq('ticket_id', ticketId.trim())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        setError('No registration found with this ticket ID');
      } else {
        setFound(data as unknown as FoundRegistration);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCheckIn = async () => {
    if (!found || isCheckingIn) return;

    setIsCheckingIn(true);
    try {
      const { error: updateError } = await supabase
        .from('registrations')
        .update({ status: 'checked-in', checked_in_at: new Date().toISOString() })
        .eq('id', found.id);

      if (updateError) throw updateError;

      setFound({ ...found, status: 'checked-in', checked_in_at: new Date().toISOString() });
      toast.success(`${found.name} checked in successfully!`);
      queryClient.invalidateQueries({ queryKey: ['registrations'] });
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const reset = () => {
    setTicketId('');
    setFound(null);
    setError('');
  };

  const isAlreadyCheckedIn = found?.status === 'checked-in';
  const isPending = found?.payment_status === 'pending';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" /> Check-In Attendees
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Enter or scan ticket ID..."
                className="pl-9"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                autoFocus
              />
            </div>
            <Button type="submit" disabled={!ticketId.trim() || isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        {error && (
          <motion.div key="error" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-destructive/30">
              <CardContent className="p-6 flex items-center gap-3 text-destructive">
                <XCircle className="h-5 w-5 shrink-0" />
                <p className="font-medium">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {found && (
          <motion.div key="found" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className={isAlreadyCheckedIn ? 'border-primary/30' : ''}>
              <CardContent className="p-6 space-y-4">
                {isAlreadyCheckedIn && (
                  <div className="flex items-center gap-2 text-primary bg-primary/10 rounded-lg p-3">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">Already checked in</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Name</span><p className="font-medium">{found.name}</p></div>
                  <div><span className="text-muted-foreground">Email</span><p className="font-medium">{found.email}</p></div>
                  <div><span className="text-muted-foreground">Event</span><p className="font-medium">{found.events?.title || '—'}</p></div>
                  <div><span className="text-muted-foreground">Ticket</span><p className="font-medium">{found.ticket_types?.name || '—'}</p></div>
                  <div><span className="text-muted-foreground">Ticket ID</span><p className="font-medium font-mono text-xs">{found.ticket_id}</p></div>
                  <div><span className="text-muted-foreground">Amount</span><p className="font-medium">{found.amount === 0 ? 'Free' : `GH₵${found.amount.toLocaleString()}`}</p></div>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className={found.payment_status === 'paid' ? 'bg-success/10 text-success border-success/20' : found.payment_status === 'free' ? 'bg-secondary text-secondary-foreground' : 'bg-warning/10 text-warning border-warning/20'}>
                    {found.payment_status}
                  </Badge>
                  <Badge variant="outline" className={found.status === 'checked-in' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-success/10 text-success border-success/20'}>
                    {found.status}
                  </Badge>
                </div>

                <div className="flex gap-3 pt-2">
                  {!isAlreadyCheckedIn && (
                    <Button onClick={handleCheckIn} disabled={isCheckingIn || isPending} className="flex-1">
                      {isCheckingIn ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking in...</> : 'Check In'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={reset}>
                    {isAlreadyCheckedIn ? 'Scan Next' : 'Clear'}
                  </Button>
                </div>
                {isPending && !isAlreadyCheckedIn && (
                  <p className="text-xs text-warning">⚠ Payment is still pending. Check-in disabled until payment is confirmed.</p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CheckInScanner;
