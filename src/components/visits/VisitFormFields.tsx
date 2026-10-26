import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FormSection,
  Input,
  Select,
  Textarea,
} from '@/components/ui';
import { LENS_TYPE_LABELS, VISIT_TYPE_LABELS } from '@/constants/labels';
import { LENS_TYPES, VISIT_TYPES } from '@/types';
import { OrderFields } from '@/components/orders/OrderFields';
import { ServiceFields } from '@/components/services/ServiceFields';
import { PrescriptionFields, type EyeField } from './PrescriptionFields';
import {
  emptyOldGlassesDraft,
  emptyOrderDraft,
  emptyServiceDraft,
  isPrescriptionEmpty,
  type OldGlassesDraft,
  type OrderDraft,
  type PrescriptionDraft,
  type ServiceDraft,
  type VisitDraft,
  type VisitDraftErrors,
} from './draft';

const VISIT_TYPE_OPTIONS = VISIT_TYPES.map((value) => ({
  value,
  label: VISIT_TYPE_LABELS[value],
}));

const LENS_TYPE_OPTIONS = LENS_TYPES.map((value) => ({ value, label: LENS_TYPE_LABELS[value] }));

/** What an auto-refractor prints: distance power and pupillary distance. */
const AR_COLUMNS: readonly EyeField[] = ['distanceSph', 'distanceCyl', 'distanceAxis', 'pd'];

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

  const setOldGlasses = (patch: Partial<OldGlassesDraft>) => {
    set('oldGlasses', { ...value.oldGlasses, ...patch });
  };

  const canCopyAr = value.includeArReading && !isPrescriptionEmpty(value.arReading);
  const canCopyOldGlasses =
    value.includeOldGlasses && !isPrescriptionEmpty(value.oldGlasses.prescription);

  /** Starts the prescribed power from another reading; staff then adjust it. */
  const copyIntoPrescribed = (source: PrescriptionDraft) => {
    set('prescription', {
      rightEye: { ...source.rightEye },
      leftEye: { ...source.leftEye },
      binocularPd: source.binocularPd,
      // The prescription has its own doctor and notes.
      doctor: value.prescription.doctor,
      notes: value.prescription.notes,
    });
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
          title="Old glasses"
          description="The glasses the customer is wearing now: the power read from them, and the lens."
          actions={
            <SectionToggle
              label="Record old glasses"
              checked={value.includeOldGlasses}
              disabled={disabled}
              onChange={(checked) => set('includeOldGlasses', checked)}
            />
          }
        />
        {value.includeOldGlasses && (
          <CardBody className="space-y-5">
            {value.oldGlassesPrefilledFrom && (
              <div className="flex flex-col gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm text-brand-900 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Filled in from {value.oldGlassesPrefilledFrom}. Check it against the glasses the
                  customer is wearing.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start sm:self-auto"
                  disabled={disabled}
                  onClick={() =>
                    onChange({
                      ...value,
                      oldGlasses: emptyOldGlassesDraft(),
                      oldGlassesPrefilledFrom: null,
                    })
                  }
                >
                  Clear
                </Button>
              </div>
            )}
            <PrescriptionFields
              value={value.oldGlasses.prescription}
              onChange={(next) => setOldGlasses({ prescription: next })}
              disabled={disabled}
              ariaPrefix="Old glasses"
              doctorLabel="Prescribed by"
              notesLabel="Source / notes"
              notesPlaceholder="e.g. Read on the lensometer, or from Dr. Rao's slip dated March 2025"
            />
            <FormSection title="Lens" description="As far as you can tell from the glasses or the customer.">
              <div className="grid gap-4 sm:grid-cols-3">
                <Select
                  label="Lens type"
                  value={value.oldGlasses.lensType}
                  options={LENS_TYPE_OPTIONS}
                  placeholder="Not known"
                  onChange={(event) =>
                    setOldGlasses({ lensType: event.target.value as OldGlassesDraft['lensType'] })
                  }
                  disabled={disabled}
                />
                <Input
                  label="Lens brand"
                  value={value.oldGlasses.lensCompany}
                  onChange={(event) => setOldGlasses({ lensCompany: event.target.value })}
                  disabled={disabled}
                  placeholder="e.g. Crizal"
                />
                <Input
                  label="Lens name"
                  value={value.oldGlasses.lensName}
                  onChange={(event) => setOldGlasses({ lensName: event.target.value })}
                  disabled={disabled}
                  placeholder="e.g. Crizal Easy UV 1.56"
                />
              </div>
              <Textarea
                label="Lens details"
                containerClassName="mt-4"
                value={value.oldGlasses.lensDetails}
                onChange={(event) => setOldGlasses({ lensDetails: event.target.value })}
                disabled={disabled}
                rows={2}
                placeholder="Coating, material or index, condition — e.g. anti-glare, scratched"
              />
            </FormSection>
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader
          title="AR machine reading"
          description="The auto-refractor result taken in the shop."
          actions={
            <SectionToggle
              label="Record AR reading"
              checked={value.includeArReading}
              disabled={disabled}
              onChange={(checked) => set('includeArReading', checked)}
            />
          }
        />
        {value.includeArReading && (
          <CardBody>
            <PrescriptionFields
              value={value.arReading}
              onChange={(next) => set('arReading', next)}
              disabled={disabled}
              ariaPrefix="AR reading"
              columns={AR_COLUMNS}
              showDoctor={false}
              notesLabel="Notes"
              notesPlaceholder="e.g. Repeated three times, readings consistent"
            />
          </CardBody>
        )}
      </Card>

      <Card>
        <CardHeader
          title="Prescribed power"
          description="The final power the lens will be made to. Saved with this visit, so earlier ones are kept."
          actions={
            <SectionToggle
              label="Record prescribed power"
              checked={value.includePrescription}
              disabled={disabled}
              onChange={(checked) => set('includePrescription', checked)}
            />
          }
        />
        {value.includePrescription && (
          <CardBody className="space-y-4">
            {(canCopyAr || canCopyOldGlasses) && (
              <div className="flex flex-wrap gap-2">
                {canCopyAr && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={disabled}
                    onClick={() => copyIntoPrescribed(value.arReading)}
                  >
                    Copy AR reading
                  </Button>
                )}
                {canCopyOldGlasses && (
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={disabled}
                    onClick={() => copyIntoPrescribed(value.oldGlasses.prescription)}
                  >
                    Copy old glasses power
                  </Button>
                )}
              </div>
            )}
            <PrescriptionFields
              value={value.prescription}
              onChange={(next) => set('prescription', next)}
              disabled={disabled}
              ariaPrefix="Prescribed"
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
