import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { CustomField } from '@/types/customField';

interface Props {
  fields: CustomField[];
  onChange: (fields: CustomField[]) => void;
}

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Dropdown' },
  { value: 'textarea', label: 'Long Text' },
  { value: 'checkbox', label: 'Checkbox' },
] as const;

const CustomFieldBuilder = ({ fields, onChange }: Props) => {
  const addField = () => {
    onChange([
      ...fields,
      {
        id: crypto.randomUUID(),
        label: '',
        type: 'text',
        required: false,
        placeholder: '',
        options: [],
      },
    ]);
  };

  const updateField = (index: number, updates: Partial<CustomField>) => {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  const updateOption = (fieldIndex: number, optIndex: number, value: string) => {
    const field = fields[fieldIndex];
    const newOptions = [...(field.options || [])];
    newOptions[optIndex] = value;
    updateField(fieldIndex, { options: newOptions });
  };

  const addOption = (fieldIndex: number) => {
    const field = fields[fieldIndex];
    updateField(fieldIndex, { options: [...(field.options || []), ''] });
  };

  const removeOption = (fieldIndex: number, optIndex: number) => {
    const field = fields[fieldIndex];
    updateField(fieldIndex, { options: (field.options || []).filter((_, i) => i !== optIndex) });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-base font-heading">Custom Registration Fields</Label>
        <Button type="button" variant="outline" size="sm" onClick={addField}>
          <Plus className="h-4 w-4 mr-1" /> Add Field
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Add custom fields that attendees must fill during registration (Name, Email, Phone are always included).
      </p>

      {fields.map((field, i) => (
        <Card key={field.id} className="border bg-secondary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <GripVertical className="h-5 w-5 text-muted-foreground mt-2 shrink-0" />
              <div className="flex-1 grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Field Label</Label>
                  <Input
                    placeholder="e.g. Company Name"
                    value={field.label}
                    onChange={(e) => updateField(i, { label: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Field Type</Label>
                  <Select
                    value={field.type}
                    onValueChange={(v) => updateField(i, { type: v as CustomField['type'], options: v === 'select' ? [''] : [] })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((ft) => (
                        <SelectItem key={ft.value} value={ft.value}>{ft.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Placeholder</Label>
                  <Input
                    placeholder="Optional placeholder text"
                    value={field.placeholder || ''}
                    onChange={(e) => updateField(i, { placeholder: e.target.value })}
                  />
                </div>
                <div className="flex items-end gap-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`required-${field.id}`}
                      checked={field.required}
                      onCheckedChange={(v) => updateField(i, { required: !!v })}
                    />
                    <Label htmlFor={`required-${field.id}`} className="text-xs cursor-pointer">Required</Label>
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-destructive shrink-0"
                onClick={() => removeField(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            {field.type === 'select' && (
              <div className="ml-8 space-y-2">
                <Label className="text-xs">Dropdown Options</Label>
                {(field.options || []).map((opt, oi) => (
                  <div key={oi} className="flex gap-2">
                    <Input
                      placeholder={`Option ${oi + 1}`}
                      value={opt}
                      onChange={(e) => updateOption(i, oi, e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => removeOption(i, oi)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="ghost" size="sm" className="text-xs" onClick={() => addOption(i)}>
                  <Plus className="h-3 w-3 mr-1" /> Add Option
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {fields.length === 0 && (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No custom fields yet. Click "Add Field" to create registration form fields.
        </div>
      )}
    </div>
  );
};

export default CustomFieldBuilder;
