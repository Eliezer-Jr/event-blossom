import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEvent } from '@/hooks/useEvents';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, MapPin, Users, Clock, ArrowLeft, Ticket, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import TicketCard from '@/components/TicketCard';
import { Registration } from '@/types/event';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const normalizeGhanaPhone = (phone: string): { normalized: string | null; error: string | null } => {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0') && cleaned.length === 10) cleaned = '233' + cleaned.substring(1);
  if (/^\d{12}$/.test(cleaned) && cleaned.startsWith('233')) {
    return { normalized: cleaned, error: null };
  }
  return { normalized: null, error: 'Enter a valid Ghana phone number (233XXXXXXXXX)' };
};

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: event, isLoading } = useEvent(id);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketData, setTicketData] = useState<Registration | null>(null);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [customValues, setCustomValues] = useState<Record<string, string | boolean>>({});
  const [phoneError, setPhoneError] = useState('');

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground mt-2">Loading event...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container py-20 text-center">
          <h1 className="font-heading text-2xl font-bold">Event not found</h1>
          <Button variant="ghost" className="mt-4" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to events
          </Button>
        </div>
      </div>
    );
  }

  const spotsLeft = event.capacity - event.registeredCount;
  const selectedTicketType = event.ticketTypes.find((t) => t.id === selectedTicket);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketType || isSubmitting) return;

    const { normalized, error: phoneErr } = normalizeGhanaPhone(formData.phone);
    if (phoneErr || !normalized) {
      setPhoneError(phoneErr || 'Invalid phone number');
      return;
    }
    setPhoneError('');

    setIsSubmitting(true);

    const normalizedPhone = normalized;
    const ticketId = `${event.title.split(' ').map(w => w[0]).join('')}-${selectedTicketType.name.substring(0, 3).toUpperCase()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;
    const isPaid = selectedTicketType.price > 0;

    try {
      const { data: regData, error: regError } = await supabase
        .from('registrations')
        .insert({
          event_id: event.id,
          name: formData.name,
          email: formData.email,
          phone: normalizedPhone,
          ticket_type_id: selectedTicketType.id,
          ticket_id: ticketId,
          amount: selectedTicketType.price,
          status: isPaid ? 'pending' : 'confirmed',
          payment_status: isPaid ? 'pending' : 'free',
          custom_field_values: customValues as any,
        })
        .select()
        .single();

      if (regError) throw regError;

      if (isPaid) {
        const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('moolre-payment', {
          body: {
            phone: normalizedPhone,
            email: formData.email,
            amount: selectedTicketType.price,
            currency: 'GHS',
            description: `${event.title} - ${selectedTicketType.name} ticket`,
            registration_id: regData.id,
            event_id: event.id,
            ticket_type_id: selectedTicketType.id,
            redirect_url: window.location.href,
          },
        });

        if (paymentError) {
          console.error('Payment initiation error:', paymentError);
          toast.error('Payment failed. Please try again.');
        } else if (paymentResult?.payment_link) {
          toast.success('Redirecting to payment...');
          window.location.href = paymentResult.payment_link;
          return; // Don't show ticket yet — wait for payment confirmation
        } else {
          toast.success(paymentResult?.message || 'Payment link generated!');
        }
      }

      // Send SMS confirmation (non-blocking)
      supabase.functions.invoke('moolre-sms', {
        body: {
          recipients: normalizedPhone,
          message: `Hi ${formData.name}, your registration for "${event.title}" is ${isPaid ? 'pending payment' : 'confirmed'}. Ticket ID: ${ticketId}. ${isPaid ? 'Please complete payment via the USSD prompt on your phone.' : 'See you there!'}`,
        },
      }).catch((err) => console.error('SMS error:', err));

      const registration: Registration = {
        id: regData.id,
        eventId: event.id,
        eventTitle: event.title,
        name: formData.name,
        email: formData.email,
        phone: normalizedPhone,
        ticketType: selectedTicketType.name,
        ticketId: ticketId,
        status: isPaid ? 'pending' : 'confirmed',
        paymentStatus: isPaid ? 'pending' : 'free',
        amount: selectedTicketType.price,
        registeredAt: new Date().toISOString(),
      };

      setTicketData(registration);
      setSubmitted(true);
      toast.success('Registration successful!');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="relative h-64 bg-gradient-to-br from-primary/20 via-accent/10 to-background flex items-end">
        <div className="container pb-6">
          <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> All Events
          </Button>
          <Badge className="mb-2 bg-primary/10 text-primary border-0">{event.category}</Badge>
          <h1 className="font-heading text-3xl md:text-4xl font-bold">{event.title}</h1>
          <p className="text-muted-foreground mt-1">{event.organizer}</p>
        </div>
      </div>

      <div className="container py-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardContent className="p-6">
                <h2 className="font-heading text-xl font-bold mb-3">About This Event</h2>
                <p className="text-muted-foreground leading-relaxed">{event.description}</p>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                    <CalendarDays className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Date</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(event.date).toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Time</p>
                      <p className="text-sm text-muted-foreground">{event.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                    <MapPin className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Venue</p>
                      <p className="text-sm text-muted-foreground">{event.venue}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                    <Users className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium">Capacity</p>
                      <p className="text-sm text-muted-foreground">{spotsLeft} of {event.capacity} spots left</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <Card>
            <CardHeader>
              <CardTitle className="font-heading">Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {event.ticketTypes.map((ticket) => {
                const available = ticket.quantity - ticket.sold;
                return (
                  <div
                    key={ticket.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors ${
                      selectedTicket === ticket.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                    } ${available === 0 ? 'opacity-50' : 'cursor-pointer'}`}
                    onClick={() => available > 0 && setSelectedTicket(ticket.id)}
                  >
                    <div>
                      <p className="font-medium">{ticket.name}</p>
                      {ticket.description && <p className="text-sm text-muted-foreground">{ticket.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{available} available</p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-lg font-bold text-primary">
                        {ticket.price === 0 ? 'Free' : `₦${ticket.price.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {submitted && ticketData ? (
              <motion.div
                key="ticket"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-heading font-bold">Registration Complete!</span>
                </div>
                <TicketCard registration={ticketData} />
              </motion.div>
            ) : (
              <motion.div key="form">
                {!showForm ? (
                  <Card>
                    <CardContent className="p-6 text-center space-y-4">
                      <Ticket className="h-10 w-10 text-primary mx-auto" />
                      <h3 className="font-heading text-xl font-bold">Ready to attend?</h3>
                      <p className="text-sm text-muted-foreground">
                        {spotsLeft > 0
                          ? `Secure your spot — ${spotsLeft} remaining`
                          : 'This event is fully booked'}
                      </p>
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={spotsLeft === 0}
                        onClick={() => setShowForm(true)}
                      >
                        {spotsLeft > 0 ? 'Register Now' : 'Sold Out'}
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle className="font-heading">Register</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            required
                            maxLength={100}
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            required
                            maxLength={255}
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            required
                            maxLength={20}
                            placeholder="233XXXXXXXXX"
                            value={formData.phone}
                            onChange={(e) => {
                              setFormData({ ...formData, phone: e.target.value });
                              if (phoneError) setPhoneError('');
                            }}
                            onBlur={() => {
                              if (formData.phone) {
                                const { error } = normalizeGhanaPhone(formData.phone);
                                setPhoneError(error || '');
                              }
                            }}
                          />
                          {phoneError && <p className="text-sm text-destructive mt-1">{phoneError}</p>}
                        </div>
                        <div>
                          <Label>Ticket Type</Label>
                          <Select value={selectedTicket} onValueChange={setSelectedTicket}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select ticket" />
                            </SelectTrigger>
                            <SelectContent>
                              {event.ticketTypes.filter((t) => t.quantity - t.sold > 0).map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} — {t.price === 0 ? 'Free' : `₦${t.price.toLocaleString()}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {/* Custom Fields */}
                        {event.customFields && event.customFields.length > 0 && event.customFields.map((field) => (
                          <div key={field.id}>
                            <Label htmlFor={`cf-${field.id}`}>{field.label}{field.required && ' *'}</Label>
                            {field.type === 'textarea' ? (
                              <Textarea
                                id={`cf-${field.id}`}
                                required={field.required}
                                placeholder={field.placeholder}
                                value={(customValues[field.id] as string) || ''}
                                onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                              />
                            ) : field.type === 'select' ? (
                              <Select
                                value={(customValues[field.id] as string) || ''}
                                onValueChange={(v) => setCustomValues({ ...customValues, [field.id]: v })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={field.placeholder || 'Select...'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {(field.options || []).filter(Boolean).map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : field.type === 'checkbox' ? (
                              <div className="flex items-center gap-2 mt-1">
                                <Checkbox
                                  id={`cf-${field.id}`}
                                  checked={!!customValues[field.id]}
                                  onCheckedChange={(v) => setCustomValues({ ...customValues, [field.id]: !!v })}
                                />
                                <Label htmlFor={`cf-${field.id}`} className="text-sm cursor-pointer">{field.placeholder || field.label}</Label>
                              </div>
                            ) : (
                              <Input
                                id={`cf-${field.id}`}
                                type={field.type === 'email' ? 'email' : field.type === 'number' ? 'number' : field.type === 'phone' ? 'tel' : 'text'}
                                required={field.required}
                                placeholder={field.placeholder}
                                value={(customValues[field.id] as string) || ''}
                                onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                              />
                            )}
                          </div>
                        ))}
                        {selectedTicketType && selectedTicketType.price > 0 && (
                          <div className="rounded-lg bg-secondary p-3 text-sm">
                            <p className="font-medium">Amount: <span className="text-primary font-bold">₦{selectedTicketType.price.toLocaleString()}</span></p>
                            <p className="text-muted-foreground text-xs mt-1">Payment will be processed on next step</p>
                          </div>
                        )}
                        <Button type="submit" className="w-full" disabled={!selectedTicket || isSubmitting}>
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                          ) : (
                            'Complete Registration'
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default EventDetail;
