import { Button, FormError, Input, Select, Textarea } from '@/components/ui';
import {
  FRAME_CATEGORY_LABELS,
  ORDER_STATUS_LABELS,
  ORDER_TYPE_LABELS,
} from '@/constants/labels';
import { ORDER_STATUSES, ORDER_TYPES, FRAME_CATEGORIES } from '@/types';
import { ORDER_STATUS_TRANSITIONS } from '@/constants/workflow';
import type { OrderDraft } from '@/components/visits/draft';

const ORDER_TYPE_OPTIONS = ORDER_TYPES.map((value) => ({
  value,
  label: ORDER_TYPE_LABELS[value],
}));

const FRAME_CATEGORY_OPTIONS = FRAME_CATEGORIES.map((value) => ({
  value,
  label: FRAME_CATEGORY_LABELS[value],
}));

/** Only statuses reachable from the current one, plus the current one itself. */
function statusOptions(current: OrderDraft['status'], isNew: boolean) {
  if (isNew) {
    // A brand new order starts at the beginning of the lifecycle.
    return ORDER_STATUSES.filter((value) => value === 'pending' || value === 'in_progress').map(
      (value) => ({ value, label: ORDER_STATUS_LABELS[value] }),
    );
  }
  const reachable = [current, ...ORDER_STATUS_TRANSITIONS[current]];
  return ORDER_STATUSES.filter((value) => reachable.includes(value)).map((value) => ({
    value,
    label: ORDER_STATUS_LABELS[value],
  }));
}

interface OrderFieldsProps {
  value: OrderDraft;
  index: number;
  error?: string;
  disabled?: boolean;
  onChange: (next: OrderDraft) => void;
  onRemove: () => void;
}

export function OrderFields({ value, index, error, disabled, onChange, onRemove }: OrderFieldsProps) {
  const set = <K extends keyof OrderDraft>(field: K, next: OrderDraft[K]) => {
    onChange({ ...value, [field]: next });
  };

  const needsFrame = value.orderType !== 'lens_only' && value.orderType !== 'contact_lens';
  const needsLens = value.orderType !== 'frame_only';
  const isNew = !value.id;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-slate-900">
          {value.orderCode ? `Order ${value.orderCode}` : `Order ${index + 1}`}
        </h4>
        <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
          Remove
        </Button>
      </div>

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Order type"
            required
            value={value.orderType}
            onChange={(event) => set('orderType', event.target.value as OrderDraft['orderType'])}
            options={ORDER_TYPE_OPTIONS}
            disabled={disabled}
          />
          {needsFrame && (
            <Select
              label="Frame category"
              value={value.frameCategory}
              onChange={(event) =>
                set('frameCategory', event.target.value as OrderDraft['frameCategory'])
              }
              options={FRAME_CATEGORY_OPTIONS}
              placeholder="Not specified"
              disabled={disabled}
            />
          )}
        </div>

        {needsFrame && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Frame company / brand"
              value={value.frameCompany}
              onChange={(event) => set('frameCompany', event.target.value)}
              disabled={disabled}
              placeholder="e.g. Ray-Ban"
            />
            <Input
              label="Frame model / details"
              value={value.frameModel}
              onChange={(event) => set('frameModel', event.target.value)}
              disabled={disabled}
              placeholder="e.g. RB-8412 Titanium"
            />
          </div>
        )}

        {needsLens && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Lens company / brand"
              value={value.lensCompany}
              onChange={(event) => set('lensCompany', event.target.value)}
              disabled={disabled}
              placeholder="e.g. Essilor"
            />
            <Input
              label="Lens name / type"
              value={value.lensName}
              onChange={(event) => set('lensName', event.target.value)}
              disabled={disabled}
              placeholder="e.g. Varilux Comfort Max"
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label="Quantity"
            required
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={value.quantity}
            onChange={(event) => set('quantity', event.target.value)}
            disabled={disabled}
          />
          <Input
            label="Amount (₹)"
            required
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            value={value.amount}
            onChange={(event) => set('amount', event.target.value)}
            disabled={disabled}
            placeholder="0"
          />
          <Input
            label="Expected delivery"
            type="date"
            value={value.expectedDeliveryDate}
            onChange={(event) => set('expectedDeliveryDate', event.target.value)}
            disabled={disabled}
          />
          <Select
            label="Status"
            value={value.status}
            onChange={(event) => set('status', event.target.value as OrderDraft['status'])}
            options={statusOptions(value.status, isNew)}
            disabled={disabled}
            hint={isNew ? undefined : 'Only valid next steps are listed'}
          />
        </div>

        <Textarea
          label="Order notes"
          value={value.notes}
          onChange={(event) => set('notes', event.target.value)}
          disabled={disabled}
          rows={2}
          placeholder="Coating, tint, fitting instructions"
        />

        <FormError message={error ?? null} />
      </div>
    </div>
  );
}
