import { Button, FormError, Input, Select, Textarea } from '@/components/ui';
import {
  PAYMENT_STATUS_LABELS,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE_LABELS,
} from '@/constants/labels';
import { PAYMENT_STATUSES, SERVICE_STATUSES, SERVICE_TYPES } from '@/types';
import { SERVICE_STATUS_TRANSITIONS } from '@/constants/workflow';
import type { ServiceDraft } from '@/components/visits/draft';

const SERVICE_TYPE_OPTIONS = SERVICE_TYPES.map((value) => ({
  value,
  label: SERVICE_TYPE_LABELS[value],
}));

const PAYMENT_OPTIONS = PAYMENT_STATUSES.map((value) => ({
  value,
  label: PAYMENT_STATUS_LABELS[value],
}));

function statusOptions(current: ServiceDraft['status'], isNew: boolean) {
  if (isNew) {
    return SERVICE_STATUSES.filter(
      (value) => value === 'received' || value === 'in_service',
    ).map((value) => ({ value, label: SERVICE_STATUS_LABELS[value] }));
  }
  const reachable = [current, ...SERVICE_STATUS_TRANSITIONS[current]];
  return SERVICE_STATUSES.filter((value) => reachable.includes(value)).map((value) => ({
    value,
    label: SERVICE_STATUS_LABELS[value],
  }));
}

interface ServiceFieldsProps {
  value: ServiceDraft;
  index: number;
  error?: string;
  disabled?: boolean;
  onChange: (next: ServiceDraft) => void;
  onRemove: () => void;
}

export function ServiceFields({
  value,
  index,
  error,
  disabled,
  onChange,
  onRemove,
}: ServiceFieldsProps) {
  const set = <K extends keyof ServiceDraft>(field: K, next: ServiceDraft[K]) => {
    onChange({ ...value, [field]: next });
  };

  const isNew = !value.id;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">
          {value.serviceCode ? `Service ${value.serviceCode}` : `Service ${index + 1}`}
        </h4>
        <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
          Remove
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Service type"
            required
            value={value.serviceType}
            onChange={(event) =>
              set('serviceType', event.target.value as ServiceDraft['serviceType'])
            }
            options={SERVICE_TYPE_OPTIONS}
            disabled={disabled}
          />
          <Input
            label="Expected ready"
            type="date"
            value={value.expectedReadyDate}
            onChange={(event) => set('expectedReadyDate', event.target.value)}
            disabled={disabled}
          />
        </div>

        <Textarea
          label="Description"
          required
          value={value.description}
          onChange={(event) => set('description', event.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="e.g. Replace broken left nose pad"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Service charge (₹)"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={value.charge}
            onChange={(event) => set('charge', event.target.value)}
            disabled={disabled}
            placeholder="0"
            hint="Leave at 0 for a free adjustment"
          />
          <Select
            label="Payment"
            value={value.paymentStatus}
            onChange={(event) =>
              set('paymentStatus', event.target.value as ServiceDraft['paymentStatus'])
            }
            options={PAYMENT_OPTIONS}
            disabled={disabled}
          />
          <Select
            label="Status"
            value={value.status}
            onChange={(event) => set('status', event.target.value as ServiceDraft['status'])}
            options={statusOptions(value.status, isNew)}
            disabled={disabled}
            hint={isNew ? undefined : 'Only valid next steps are listed'}
          />
        </div>

        <Textarea
          label="Service notes"
          value={value.notes}
          onChange={(event) => set('notes', event.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="Anything the customer should be told at collection"
        />

        <FormError message={error ?? null} />
        <p className="sr-only">Service {index + 1}</p>
      </div>
    </div>
  );
}
