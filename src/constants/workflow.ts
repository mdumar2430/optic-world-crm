/**
 * Status lifecycles.
 *
 * The same transition maps are mirrored in `firestore.rules` and in the Cloud
 * Functions, so a client that skips the UI still cannot record a nonsensical
 * transition such as delivered -> pending.
 */
import type { OrderStatus, ServiceStatus } from '@/types';

export const ORDER_STATUS_FLOW: readonly OrderStatus[] = [
  'pending',
  'in_progress',
  'ready',
  'delivered',
];

export const SERVICE_STATUS_FLOW: readonly ServiceStatus[] = [
  'received',
  'in_service',
  'ready',
  'delivered',
];

/** Statuses that may follow a given order status. */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ['in_progress', 'ready', 'cancelled'],
  in_progress: ['ready', 'cancelled'],
  ready: ['delivered', 'in_progress', 'cancelled'],
  // Terminal states.
  delivered: [],
  cancelled: [],
};

export const SERVICE_STATUS_TRANSITIONS: Record<ServiceStatus, readonly ServiceStatus[]> = {
  received: ['in_service', 'ready', 'cancelled'],
  in_service: ['ready', 'cancelled'],
  ready: ['delivered', 'in_service', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from].includes(to);
}

export function canTransitionService(from: ServiceStatus, to: ServiceStatus): boolean {
  return SERVICE_STATUS_TRANSITIONS[from].includes(to);
}

/** Visual tone for a status badge. */
export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

export const ORDER_STATUS_TONES: Record<OrderStatus, StatusTone> = {
  pending: 'neutral',
  in_progress: 'info',
  ready: 'warning',
  delivered: 'success',
  cancelled: 'danger',
};

export const SERVICE_STATUS_TONES: Record<ServiceStatus, StatusTone> = {
  received: 'neutral',
  in_service: 'info',
  ready: 'warning',
  delivered: 'success',
  cancelled: 'danger',
};
