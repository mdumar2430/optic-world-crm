import type { Prescription, ProductOrder, Visit } from '@/types';

export interface LatestPrescription {
  prescription: Prescription;
  visit: Visit;
  /**
   * `prescribed` — the final prescribed power from a visit.
   * `old_glasses` — only the power read from the customer's own glasses, with
   * nothing prescribed since.
   */
  source: 'prescribed' | 'old_glasses';
}

function newestFirst(visits: readonly Visit[]): Visit[] {
  return [...visits].sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime());
}

/**
 * The customer's most up-to-date prescription on record.
 *
 * Walks visits newest first. A prescribed power always wins over old glasses
 * read at the same visit, because it is the decision the lens is made to. An
 * AR machine reading on its own is never treated as a prescription.
 */
export function findLatestPrescription(visits: readonly Visit[]): LatestPrescription | null {
  for (const visit of newestFirst(visits)) {
    if (visit.prescription) return { prescription: visit.prescription, visit, source: 'prescribed' };
    if (visit.oldGlasses) {
      return { prescription: visit.oldGlasses.prescription, visit, source: 'old_glasses' };
    }
  }
  return null;
}

/**
 * The lens the customer is most likely wearing: the newest *delivered* order
 * that had one. An order still in the workshop is not on their face yet.
 */
export function findLatestLensOrder(visits: readonly Visit[]): ProductOrder | null {
  for (const visit of newestFirst(visits)) {
    const withLens = visit.orders.find(
      (order) =>
        order.status === 'delivered' &&
        (order.orderType === 'spectacles' || order.orderType === 'lens_only') &&
        (order.lensCompany.trim() !== '' || order.lensName.trim() !== ''),
    );
    if (withLens) return withLens;
  }
  return null;
}
