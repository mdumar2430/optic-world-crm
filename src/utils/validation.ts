/**
 * Client-side validation.
 *
 * This exists for fast feedback only. Every constraint that matters is also
 * enforced by Firestore Security Rules or Firebase Auth, because a modified
 * client can skip all of this.
 */

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const PHONE_PATTERN = /^[0-9]{10}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isValidPhone(value: string): boolean {
  return PHONE_PATTERN.test(value.replace(/\D/g, ''));
}

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function normalisePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 10);
}

/** Firebase Auth requires 6+ characters; we ask for a little more structure. */
export function passwordProblem(value: string): string | null {
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(value)) return 'Password must contain a letter';
  if (!/[0-9]/.test(value)) return 'Password must contain a number';
  return null;
}

export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

/** Parses a money/quantity input, returning null when it is not a usable number. */
export function parseNumber(value: string): number | null {
  if (isBlank(value)) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Generates a reasonably strong temporary password for a new employee. */
export function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);

  const chars = Array.from(bytes, (byte, index) => {
    const pool = index % 4 === 3 ? digits : alphabet;
    return pool[byte % pool.length] ?? 'x';
  });
  // Guarantee at least one letter and one digit regardless of the draw.
  chars[0] = alphabet[(bytes[0] ?? 0) % alphabet.length] ?? 'A';
  chars[1] = digits[(bytes[1] ?? 0) % digits.length] ?? '7';
  return chars.join('');
}
