import { Card, CardBody, CardHeader, Button, Input, Select, Textarea } from '@/components/ui';
import { VISIT_TYPE_LABELS } from '@/constants/labels';
import { VISIT_TYPES } from '@/types';
import { OrderFields } from '@/components/orders/OrderFields';
import { ServiceFields } from '@/components/services/ServiceFields';
import { PrescriptionFields } from './PrescriptionFields';
import {
  emptyOrderDraft,
  emptyPrescriptionDraft,
  emptyServiceDraft,
  isPrescriptionEmpty,
  type OrderDraft,
  type ServiceDraft,
  type VisitDraft,
  type VisitDraftErrors,
} from './draft';

const VISIT_TYPE_OPTIONS = VISIT_TYPES.map((value) => ({
  value,
  label: VISIT_TYPE_LABELS[value],
}));

const PlusIcon = (
  <svg
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M10 5v10M5 10h10" />
  </svg>
);

/** Checkbox in a card header that switches an optional section on. */
function SectionToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      {label}
    </label>
  );
}

interface VisitFormFieldsProps {
  value: VisitDraft;
  errors: VisitDraftErrors;
  disabled?: boolean;
  onChange: (next: VisitDraft) => void;
}

/**
 * The activity section of a visit. Prescription, orders and services are all
 * optional and independent — a visit may carry any combination, or none.
 */
export function VisitFormFields({ value, errors, disabled, onChange }: VisitFormFieldsProps) {
  const set = <K extends keyof VisitDraft>(field: K, next: VisitDraft[K]) => {
    onChange({ ...value, [field]: next });
  };

  const updateOrder = (key: string, next: OrderDraft) => {
    set('orders', value.orders.map((order) => (order.key === key ? next : order)));
  };
  const updateService = (key: string, next: ServiceDraft) => {
    set('services', value.services.map((job) => (job.key === key ? next : job)));
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Visit details" description="When the customer came in, and why." />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Visit date"
              type="date"
              required
              value={value.visitDate}
              error={errors.visitDate}
              onChange={(event) => set('visitDate', event.target.value)}
              disabled={disabled}
            />
            <Select
              label="Visit type"
              required
              value={value.visitType}
              error={errors.visitType}
              options={VISIT_TYPE_OPTIONS}
              onChange={(event) => set('visitType', event.target.value as VisitDraft['visitType'])}
              disabled={disabled}
            />
          </div>
          <Textarea
            label="Visit notes"
            value={value.notes}
            onChange={(event) => set('notes', event.target.value)}
            disabled={disabled}
            placeholder="What the customer asked for, what was discussed, anything to remember next time"
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Existing prescription"
          description="The power the customer is wearing now — from their glasses or an earlier prescription."
          actions={
            <SectionToggle
              label="Record existing prescription"
              checked={value.includeExistingPrescription}
              disabled={disabled}
              onChange={(checked) => set('includeExistingPrescription', checked)}
            />
          }
        />
        {value.includeExistingPrescription && (
          <CardBody className="space-y-4">
            {value.existingPrefilledFrom && (
              <div className="flex flex-col gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-900 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Filled in from {value.existingPrefilledFrom}. Check it against the customer&apos;s
                  current glasses.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start sm:self-auto"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...value,
                      existingPrescription: emptyPrescriptionDraft(),
                      existingPrefilledFrom: null,
                    })
                  }
                >
                  Clear
                </Button>
              </div>
            )}
            <PrescriptionFields
              value={value.existingPrescription}
              onChange={(next) => set('existingPrescription', next)}
              disabled={disabled}
              ariaPrefix="Existing"
              doctorLabel="Prescribed by"
              notesLabel="Source / notes"
              notesPlaceholder="e.g. Read from current glasses, or from Dr. Rao's slip dated March 2025"
            />
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader
          title="New prescription"
          description="The result of today's eye test. Saved with this visit, so earlier ones are kept."
          actions={
            <SectionToggle
              label="Record new prescription"
              checked={value.includePrescription}
              disabled={disabled}
              onChange={(checked) => set('includePrescription', checked)}
            />
          }
        />
        {value.includePrescription && (
          <CardBody className="space-y-4">
            {value.includeExistingPrescription && !isPrescriptionEmpty(value.existingPrescription) && (
              <Button
                variant="secondary"
                size="sm"
                disabled={disabled}
                onClick={() =>
                  set('prescription', {
                    ...value.existingPrescription,
                    rightEye: { ...value.existingPrescription.rightEye },
                    leftEye: { ...value.existingPrescription.leftEye },
                    // A new test has its own doctor and notes.
                    doctor: value.prescription.doctor,
                    notes: value.prescription.notes,
                  })
                }
              >
                Start from existing values
              </Button>
            )}
            <PrescriptionFields
              value={value.prescription}
              onChange={(next) => set('prescription', next)}
              disabled={disabled}
              ariaPrefix="New"
            />
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Product orders"
          description="Optional. Add one entry per item ordered."
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={PlusIcon}
              disabled={disabled}
              onClick={() => set('orders', [...value.orders, emptyOrderDraft()])}
            >
              Add order
            </Button>
          }
        />
        {value.orders.length > 0 && (
          <CardBody className="space-y-4">
            {value.orders.map((order, index) => (
              <OrderFields
                key={order.key}
                value={order}
                index={index}
                error={errors.orders[order.key]}
                disabled={disabled}
                onChange={(next) => updateOrder(order.key, next)}
                onRemove={() =>
                  set('orders', value.orders.filter((entry) => entry.key !== order.key))
                }
              />
            ))}
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Repairs and services"
          description="Optional. Use this when spectacles are left for work."
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={PlusIcon}
              disabled={disabled}
              onClick={() => set('services', [...value.services, emptyServiceDraft()])}
            >
              Add service
            </Button>
          }
        />
        {value.services.length > 0 && (
          <CardBody className="space-y-4">
            {value.services.map((job, index) => (
              <ServiceFields
                key={job.key}
                value={job}
                index={index}
                error={errors.services[job.key]}
                disabled={disabled}
                onChange={(next) => updateService(job.key, next)}
                onRemove={() =>
                  set('services', value.services.filter((entry) => entry.key !== job.key))
                }
              />
            ))}
          </CardBody>
        )}
      </Card>
    </div>
  );
}
