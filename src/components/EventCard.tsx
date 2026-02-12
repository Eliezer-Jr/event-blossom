import { Event } from '@/types/event';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface EventCardProps {
  event: Event;
  index: number;
}

const statusColors: Record<string, string> = {
  upcoming: 'bg-success text-success-foreground',
  ongoing: 'bg-primary text-primary-foreground',
  past: 'bg-muted text-muted-foreground',
  'sold-out': 'bg-destructive text-destructive-foreground',
};

const EventCard = ({ event, index }: EventCardProps) => {
  const spotsLeft = event.capacity - event.registeredCount;
  const fillPercent = Math.round((event.registeredCount / event.capacity) * 100);
  const lowestPrice = Math.min(...event.ticketTypes.map((t) => t.price));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
    >
      <Link to={`/event/${event.id}`}>
        <Card className="group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/50">
          <div className="relative h-48 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <CalendarDays className="h-16 w-16 text-primary/30" />
            <Badge className={`absolute top-3 right-3 ${statusColors[event.status]}`}>
              {event.status === 'sold-out' ? 'Sold Out' : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </Badge>
          </div>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-primary mb-1 uppercase tracking-wider">{event.category}</p>
            <h3 className="font-heading text-lg font-bold mb-2 group-hover:text-primary transition-colors line-clamp-1">
              {event.title}
            </h3>
            <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{event.description}</p>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span>{new Date(event.date).toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="line-clamp-1">{event.venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span>{spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="font-heading text-lg font-bold text-primary">
                {lowestPrice === 0 ? 'Free' : `GH₵${lowestPrice.toLocaleString()}`}
              </span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${fillPercent}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">{fillPercent}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

export default EventCard;
