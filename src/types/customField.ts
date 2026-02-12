export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'phone' | 'number' | 'select' | 'textarea' | 'checkbox';
  required: boolean;
  placeholder?: string;
  options?: string[]; // for select type
  /** Maps option value → override price. Used to auto-adjust ticket price based on selection. */
  priceOverrides?: Record<string, number>;
}
