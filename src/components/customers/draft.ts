import type { Customer, CustomerType, Gender, RelationshipType } from '@/types';
import type { CustomerInput } from '@/services';
import { fromDateInputValue, toDateInputValue, ageFromDateOfBirth } from '@/utils/format';
import { isBlank, isValidPhone, normalisePhone, parseNumber } from '@/utils/validation';

export interface CustomerDraft {
  name: string;
  phone: string;
  alternatePhone: string;
  dateOfBirth: string;
  age: string;
  gender: Gender | '';
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  hospital: string;
  referredBy: string;
  referralDetails: string;
  notes: string;
}

export type CustomerDraftErrors = Partial<Record<keyof CustomerDraft, string>>;

export function emptyCustomerDraft(): CustomerDraft {
  return {
    name: '',
    phone: '',
    alternatePhone: '',
    dateOfBirth: '',
    age: '',
    gender: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    hospital: '',
    referredBy: '',
    referralDetails: '',
    notes: '',
  };
}

export function customerToDraft(customer: Customer): CustomerDraft {
  return {
    name: customer.name,
    phone: customer.phone,
    alternatePhone: customer.alternatePhone,
    dateOfBirth: toDateInputValue(customer.dateOfBirth),
    age: customer.age === null ? '' : String(customer.age),
    gender: customer.gender ?? '',
    line1: customer.address.line1,
    line2: customer.address.line2,
    city: customer.address.city,
    state: customer.address.state,
    postalCode: customer.address.postalCode,
    hospital: customer.hospital,
    referredBy: customer.referredBy,
    referralDetails: customer.referralDetails,
    notes: customer.notes,
  };
}

export function validateCustomerDraft(draft: CustomerDraft): CustomerDraftErrors {
  const errors: CustomerDraftErrors = {};

  if (isBlank(draft.name)) errors.name = 'Customer name is required';
  else if (draft.name.trim().length < 2) errors.name = 'Enter the full name';

  if (isBlank(draft.phone)) errors.phone = 'Phone number is required';
  else if (!isValidPhone(draft.phone)) errors.phone = 'Enter a 10-digit phone number';

  if (!isBlank(draft.alternatePhone) && draft.alternatePhone.replace(/\D/g, '').length < 6) {
    errors.alternatePhone = 'Enter a valid phone number, or leave this blank';
  }

  if (!isBlank(draft.dateOfBirth)) {
    const parsed = fromDateInputValue(draft.dateOfBirth);
    if (!parsed) errors.dateOfBirth = 'Enter a valid date';
    else if (parsed > new Date()) errors.dateOfBirth = 'Date of birth cannot be in the future';
  }

  if (!isBlank(draft.age)) {
    const age = parseNumber(draft.age);
    if (age === null || age < 0 || age > 130 || !Number.isInteger(age)) {
      errors.age = 'Enter an age between 0 and 130';
    }
  }

  if (!isBlank(draft.postalCode) && !/^[0-9]{4,10}$/.test(draft.postalCode.trim())) {
    errors.postalCode = 'Enter a valid postal code';
  }

  return errors;
}

export function toCustomerInput(
  draft: CustomerDraft,
  relationship: {
    customerType: CustomerType;
    primaryCustomerId: string | null;
    relationship: RelationshipType | null;
    relationshipNote: string | null;
  },
): CustomerInput {
  const dateOfBirth = fromDateInputValue(draft.dateOfBirth);
  // An explicitly typed age wins; otherwise derive it from the date of birth.
  const typedAge = parseNumber(draft.age);
  const age = typedAge ?? ageFromDateOfBirth(dateOfBirth);

  return {
    name: draft.name.trim(),
    phone: normalisePhone(draft.phone),
    alternatePhone: draft.alternatePhone.replace(/\D/g, ''),
    dateOfBirth,
    age,
    gender: draft.gender === '' ? null : draft.gender,
    address: {
      line1: draft.line1.trim(),
      line2: draft.line2.trim(),
      city: draft.city.trim(),
      state: draft.state.trim(),
      postalCode: draft.postalCode.trim(),
    },
    hospital: draft.hospital.trim(),
    referredBy: draft.referredBy.trim(),
    referralDetails: draft.referralDetails.trim(),
    notes: draft.notes.trim(),
    ...relationship,
  };
}
