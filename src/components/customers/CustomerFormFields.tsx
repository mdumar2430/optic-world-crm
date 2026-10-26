import { Card, CardBody, CardHeader, Input, Select, Textarea } from '@/components/ui';
import { GENDER_LABELS } from '@/constants/labels';
import { GENDERS } from '@/types';
import { normalisePhone } from '@/utils/validation';
import { ageFromDateOfBirth, fromDateInputValue } from '@/utils/format';
import type { CustomerDraft, CustomerDraftErrors } from './draft';

const GENDER_OPTIONS = GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }));

interface CustomerFormFieldsProps {
  value: CustomerDraft;
  errors: CustomerDraftErrors;
  disabled?: boolean;
  onChange: (next: CustomerDraft) => void;
  /** Guidance under the phone field, e.g. when it was copied from the primary customer. */
  phoneHint?: string;
}

/**
 * Every field from the shop's paper form, grouped into three sections rather
 * than presented as one long list.
 */
export function CustomerFormFields({
  value,
  errors,
  disabled,
  onChange,
  phoneHint,
}: CustomerFormFieldsProps) {
  const set = <K extends keyof CustomerDraft>(field: K, next: CustomerDraft[K]) => {
    onChange({ ...value, [field]: next });
  };

  const onDateOfBirthChange = (next: string) => {
    const derived = ageFromDateOfBirth(fromDateInputValue(next));
    // Fill the age automatically, but never overwrite a value staff typed.
    onChange({
      ...value,
      dateOfBirth: next,
      age: value.age === '' && derived !== null ? String(derived) : value.age,
    });
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Personal information"
          description="The customer ID is generated automatically when the record is saved."
        />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              required
              autoComplete="name"
              value={value.name}
              error={errors.name}
              onChange={(event) => set('name', event.target.value)}
              disabled={disabled}
              placeholder="e.g. Ahmed Khan"
            />
            <Input
              label="Phone number"
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={value.phone}
              error={errors.phone}
              hint={phoneHint}
              onChange={(event) => set('phone', normalisePhone(event.target.value))}
              disabled={disabled}
              placeholder="10-digit mobile number"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              label="Alternate phone"
              type="tel"
              inputMode="numeric"
              value={value.alternatePhone}
              error={errors.alternatePhone}
              onChange={(event) => set('alternatePhone', event.target.value.replace(/[^\d]/g, ''))}
              disabled={disabled}
              placeholder="Optional"
            />
            <Input
              label="Date of birth"
              type="date"
              value={value.dateOfBirth}
              error={errors.dateOfBirth}
              onChange={(event) => onDateOfBirthChange(event.target.value)}
              disabled={disabled}
            />
            <Input
              label="Age"
              type="number"
              min={0}
              max={130}
              inputMode="numeric"
              value={value.age}
              error={errors.age}
              onChange={(event) => set('age', event.target.value)}
              disabled={disabled}
              hint="Filled from date of birth"
            />
            <Select
              label="Gender"
              value={value.gender}
              options={GENDER_OPTIONS}
              placeholder="Not specified"
              onChange={(event) => set('gender', event.target.value as CustomerDraft['gender'])}
              disabled={disabled}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Address" />
        <CardBody className="space-y-4">
          <Input
            label="Address line 1"
            autoComplete="address-line1"
            value={value.line1}
            onChange={(event) => set('line1', event.target.value)}
            disabled={disabled}
            placeholder="House / flat, building"
          />
          <Input
            label="Address line 2"
            autoComplete="address-line2"
            value={value.line2}
            onChange={(event) => set('line2', event.target.value)}
            disabled={disabled}
            placeholder="Street, area"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="City"
              autoComplete="address-level2"
              value={value.city}
              onChange={(event) => set('city', event.target.value)}
              disabled={disabled}
            />
            <Input
              label="State"
              autoComplete="address-level1"
              value={value.state}
              onChange={(event) => set('state', event.target.value)}
              disabled={disabled}
            />
            <Input
              label="Postal code"
              inputMode="numeric"
              autoComplete="postal-code"
              value={value.postalCode}
              error={errors.postalCode}
              onChange={(event) => set('postalCode', event.target.value)}
              disabled={disabled}
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Additional information" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Hospital / organisation"
              value={value.hospital}
              onChange={(event) => set('hospital', event.target.value)}
              disabled={disabled}
              placeholder="e.g. Sankara Nethralaya"
            />
            <Input
              label="Referred by"
              value={value.referredBy}
              onChange={(event) => set('referredBy', event.target.value)}
              disabled={disabled}
              placeholder="Doctor, existing customer, walk-in"
            />
          </div>
          <Input
            label="Referral details"
            value={value.referralDetails}
            onChange={(event) => set('referralDetails', event.target.value)}
            disabled={disabled}
            placeholder="Anything worth noting about the referral"
          />
          <Textarea
            label="Notes"
            value={value.notes}
            onChange={(event) => set('notes', event.target.value)}
            disabled={disabled}
            placeholder="Preferences, sensitivities, anything staff should know"
          />
        </CardBody>
      </Card>
    </div>
  );
}
