import { CustomField } from './customField';

export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  imageUrl: string;
  capacity: number;
  registeredCount: number;
  status: 'upcoming' | 'ongoing' | 'past' | 'sold-out';
  ticketTypes: TicketType[];
  organizer: string;
  category: string;
  customFields?: CustomField[];
}

export interface TicketType {
  id: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  description?: string;
}

export interface Registration {
  id: string;
  eventId: string;
  eventTitle: string;
  name: string;
  email: string;
  phone: string;
  ticketType: string;
  ticketId: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'checked-in';
  paymentStatus: 'paid' | 'pending' | 'refunded' | 'free';
  amount: number;
  registeredAt: string;
  checkedInAt?: string;
}
