-- Add custom_fields JSONB column to events for storing custom form field definitions
ALTER TABLE public.events ADD COLUMN custom_fields jsonb DEFAULT '[]'::jsonb;

-- Add custom_field_values JSONB column to registrations for storing submitted custom field data
ALTER TABLE public.registrations ADD COLUMN custom_field_values jsonb DEFAULT '{}'::jsonb;
