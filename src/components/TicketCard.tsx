import { Registration } from '@/types/event';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Ticket } from 'lucide-react';

interface TicketCardProps {
  registration: Registration;
}

const statusBadge: Record<string, string> = {
  confirmed: 'bg-success text-success-foreground',
  pending: 'bg-warning text-warning-foreground',
  cancelled: 'bg-destructive text-destructive-foreground',
  'checked-in': 'bg-primary text-primary-foreground',
};

const TicketCard = ({ registration }: TicketCardProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-accent p-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary-foreground">
          <Ticket className="h-5 w-5" />
          <span className="font-heading font-bold">{registration.ticketId}</span>
        </div>
        <Badge className={statusBadge[registration.status]}>
          {registration.status}
        </Badge>
      </div>
      <CardContent className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="space-y-1">
          <h4 className="font-heading font-bold text-lg">{registration.eventTitle}</h4>
          <p className="text-sm text-muted-foreground">{registration.name} · {registration.ticketType}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{new Date(registration.registeredAt).toLocaleDateString()}</span>
          </div>
          {registration.amount > 0 && (
            <p className="text-sm font-semibold text-primary">GH₵{registration.amount.toLocaleString()}</p>
          )}
        </div>
        <div className="p-2 bg-card rounded-lg border border-border">
          <QRCodeSVG value={registration.ticketId} size={80} />
        </div>
      </CardContent>
    </Card>
  );
};

export default TicketCard;
