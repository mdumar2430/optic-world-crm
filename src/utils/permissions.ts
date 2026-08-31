/**
 * Capability checks used to hide UI a user may not act on.
 *
 * These are a usability affordance only. The authoritative copy of every rule
 * below lives in `firestore.rules` and in the callable Cloud Functions; a user
 * who edits the bundle still gets rejected by the backend.
 */
import type { AuthUser } from '@/types';

export type Capability =
  | 'customers:view'
  | 'customers:create'
  | 'customers:edit'
  | 'customers:deactivate'
  | 'relationships:manage'
  | 'visits:create'
  | 'visits:edit'
  | 'orders:updateStatus'
  | 'services:updateStatus';

const EMPLOYEE_CAPABILITIES: readonly Capability[] = [
  'customers:view',
  'customers:create',
  'customers:edit',
  'relationships:manage',
  'visits:create',
  'visits:edit',
  'orders:updateStatus',
  'services:updateStatus',
];

export function can(user: AuthUser | null, capability: Capability): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'admin') return true;
  return EMPLOYEE_CAPABILITIES.includes(capability);
}

export function isAdmin(user: AuthUser | null): boolean {
  return user?.role === 'admin' && user.isActive;
}
