import type { Prescription, Visit } from '@/types';

export interface LatestPrescription {
  prescription: Prescription;
  visit: Visit;
  /**
   * `tested` — the new prescription from an eye test at this store.
   * `existing` — only what the customer reported wearing, with no test since.
   */
  source: 'tested' | 'existing';
}

/**
 * The customer's most up-to-date prescription on record.
 *
 * Walks visits newest first. A tested prescription always wins over an
 * existing one recorded at the same visit, because the test supersedes it.
 */
export function findLatestPrescription(visits: readonly Visit[]): LatestPrescription | null {
  const newestFirst = [...visits].sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime());
  for (const visit of newestFirst) {
    if (visit.prescription) return { prescription: visit.prescription, visit, source: 'tested' };
    if (visit.existingPrescription) {
      return { prescription: visit.existingPrescription, visit, source: 'existing' };
    }
  }
  return null;
}
