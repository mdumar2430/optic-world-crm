/** Presentation helpers. Formatting lives here, never inline in components. */

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatDate(value: Date | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  return dateFormatter.format(value);
}

export function formatDateTime(value: Date | null | undefined, fallback = '—'): string {
  if (!value) return fallback;
  return dateTimeFormatter.format(value);
}

export function formatCurrency(value: number | null | undefined, fallback = '—'): string {
  if (value === null || value === undefined || Number.isNaN(value)) return fallback;
  return currencyFormatter.format(value);
}

/** `2026-08-31`, the value format an `<input type="date">` expects. */
export function toDateInputValue(value: Date | null | undefined): string {
  if (!value) return '';
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Parses an `<input type="date">` value into a local-midnight Date. */
export function fromDateInputValue(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/** "2 days ago", "Today", "In 3 days" — used on timelines and status chips. */
export function formatRelativeDay(value: Date | null | undefined): string {
  if (!value) return '—';
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfValue = new Date(value);
  startOfValue.setHours(0, 0, 0, 0);

  const days = Math.round((startOfValue.getTime() - startOfToday.getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === -1) return 'Yesterday';
  if (days === 1) return 'Tomorrow';
  if (days < 0) return `${Math.abs(days)} days ago`;
  return `In ${days} days`;
}

/** `98765 43210` for 10-digit Indian numbers, otherwise unchanged. */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  return phone;
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0] ?? '?').slice(0, 2).toUpperCase();
  return `${(parts[0] ?? '').charAt(0)}${(parts[parts.length - 1] ?? '').charAt(0)}`.toUpperCase();
}

/** Age derived from date of birth, when one was captured. */
export function ageFromDateOfBirth(dob: Date | null): number | null {
  if (!dob) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDelta = today.getMonth() - dob.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

/** Summarises what happened during a visit, e.g. "Prescription + Order". */
export function summariseVisitActivities(args: {
  hasPrescription: boolean;
  orderCount: number;
  serviceCount: number;
}): string {
  const parts: string[] = [];
  if (args.hasPrescription) parts.push('Prescription');
  if (args.orderCount > 0) parts.push(args.orderCount > 1 ? `${args.orderCount} Orders` : 'Order');
  if (args.serviceCount > 0) {
    parts.push(args.serviceCount > 1 ? `${args.serviceCount} Services` : 'Service');
  }
  return parts.length > 0 ? parts.join(' + ') : 'Consultation';
}
