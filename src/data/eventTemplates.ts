import { CustomField } from '@/types/customField';

interface TicketTypeInput {
  name: string;
  price: string;
  quantity: string;
  description: string;
}

export interface EventTemplate {
  id: string;
  label: string;
  description: string;
  form: {
    category: string;
    capacity: string;
  };
  tickets: TicketTypeInput[];
  customFields: CustomField[];
}

export const eventTemplates: EventTemplate[] = [
  {
    id: 'conference-registration',
    label: 'Conference Registration',
    description: 'Pre-filled form with title, name, contact, age range, church details, designation, and tiered pricing.',
    form: {
      category: 'Conference',
      capacity: '500',
    },
    tickets: [
      { name: 'Convention Staff', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Convention Executive', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Conference EC / Executive', price: '0', quantity: '100', description: 'Free registration' },
      { name: 'Director', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Sector Head', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Association Head', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Fellowship Head', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Former Conference EC', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Institutional Head', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Denominational Board Member', price: '1000', quantity: '100', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
      { name: 'Retired Minister', price: '400', quantity: '100', description: 'GH₵400 (reduced rate)' },
      { name: 'Other', price: '1000', quantity: '200', description: 'GH₵1,000 (GH₵1,100 from 1st April 2026)' },
    ],
    customFields: [
      {
        id: 'cf-title',
        label: 'Title',
        type: 'select',
        required: true,
        placeholder: 'Select your title',
        options: ['Rev', 'Rev. Dr', 'Pastor', 'Mr', 'Mrs', 'Miss'],
      },
      {
        id: 'cf-first-name',
        label: 'First Name',
        type: 'text',
        required: true,
        placeholder: 'Enter your first name',
      },
      {
        id: 'cf-middle-name',
        label: 'Middle Name',
        type: 'text',
        required: false,
        placeholder: 'Enter your middle name',
      },
      {
        id: 'cf-surname',
        label: 'Surname',
        type: 'text',
        required: true,
        placeholder: 'Enter your surname',
      },
      {
        id: 'cf-whatsapp',
        label: 'WhatsApp Number',
        type: 'phone',
        required: false,
        placeholder: '233XXXXXXXXX',
      },
      {
        id: 'cf-age-range',
        label: 'Age Range',
        type: 'select',
        required: true,
        placeholder: 'Select your age range',
        options: ['20–29', '30–39', '40–49', '50–59', '60 and above'],
      },
      {
        id: 'cf-church',
        label: 'Name of Church',
        type: 'text',
        required: true,
        placeholder: 'Enter name of your church',
      },
      {
        id: 'cf-association',
        label: 'Name of Association',
        type: 'text',
        required: false,
        placeholder: 'Enter name of your association',
      },
      {
        id: 'cf-sector',
        label: 'Sector',
        type: 'text',
        required: false,
        placeholder: 'Enter your sector name',
      },
    ],
  },
];
