/**
 * Form drafts for a visit.
 *
 * Numbers and dates are held as strings while the user is typing — that is what
 * `<input>` gives us — and converted once, on submit, by `toVisitInput`. Keeping
 * the raw text means a half-typed "-1." never gets silently coerced to 0.
 */
import type {
  FrameCategory,
  OrderStatus,
  OrderType,
  PaymentStatus,
  Prescription,
  ProductOrder,
  ServiceJob,
  ServiceStatus,
  ServiceType,
  Visit,
  VisitType,
} from '@/types';
import type { OrderInput, ServiceInput, VisitInput } from '@/services';
import { fromDateInputValue, toDateInputValue } from '@/utils/format';
import { isBlank, parseNumber } from '@/utils/validation';

export interface EyeDraft {
  distanceSph: string;
  distanceCyl: string;
  distanceAxis: string;
  nearSph: string;
  nearCyl: string;
  nearAxis: string;
  add: string;
  pd: string;
}

export interface PrescriptionDraft {
  rightEye: EyeDraft;
  leftEye: EyeDraft;
  binocularPd: string;
  doctor: string;
  notes: string;
}

export interface OrderDraft {
  key: string;
  id?: string;
  orderCode?: string;
  orderType: OrderType;
  frameCategory: FrameCategory | '';
  frameCompany: string;
  frameModel: string;
  lensCompany: string;
  lensName: string;
  quantity: string;
  amount: string;
  expectedDeliveryDate: string;
  deliveredDate: Date | null;
  status: OrderStatus;
  notes: string;
}

export interface ServiceDraft {
  key: string;
  id?: string;
  serviceCode?: string;
  serviceType: ServiceType;
  description: string;
  charge: string;
  paymentStatus: PaymentStatus;
  expectedReadyDate: string;
  deliveredDate: Date | null;
  status: ServiceStatus;
  notes: string;
}

export interface VisitDraft {
  visitDate: string;
  visitType: VisitType;
  notes: string;
  includePrescription: boolean;
  prescription: PrescriptionDraft;
  orders: OrderDraft[];
  services: ServiceDraft[];
}

export interface VisitDraftErrors {
  visitDate?: string;
  visitType?: string;
  /** Keyed by the draft `key` of the offending order/service. */
  orders: Record<string, string>;
  services: Record<string, string>;
}

let keySeq = 0;
function nextKey(prefix: string): string {
  keySeq += 1;
  return `${prefix}-${keySeq}`;
}

function emptyEye(): EyeDraft {
  return {
    distanceSph: '',
    distanceCyl: '',
    distanceAxis: '',
    nearSph: '',
    nearCyl: '',
    nearAxis: '',
    add: '',
    pd: '',
  };
}

export function emptyPrescriptionDraft(): PrescriptionDraft {
  return { rightEye: emptyEye(), leftEye: emptyEye(), binocularPd: '', doctor: '', notes: '' };
}

export function emptyOrderDraft(): OrderDraft {
  return {
    key: nextKey('order'),
    orderType: 'spectacles',
    frameCategory: 'full_rim',
    frameCompany: '',
    frameModel: '',
    lensCompany: '',
    lensName: '',
    quantity: '1',
    amount: '',
    expectedDeliveryDate: '',
    deliveredDate: null,
    status: 'pending',
    notes: '',
  };
}

export function emptyServiceDraft(): ServiceDraft {
  return {
    key: nextKey('service'),
    serviceType: 'frame_adjustment',
    description: '',
    charge: '',
    paymentStatus: 'pending',
    expectedReadyDate: '',
    deliveredDate: null,
    status: 'received',
    notes: '',
  };
}

export function emptyVisitDraft(): VisitDraft {
  return {
    visitDate: toDateInputValue(new Date()),
    visitType: 'consultation',
    notes: '',
    includePrescription: false,
    prescription: emptyPrescriptionDraft(),
    orders: [],
    services: [],
  };
}

/* -------------------------------------------------------------------------- */
/* Loading an existing visit into a draft                                     */
/* -------------------------------------------------------------------------- */

function eyeToDraft(eye: Prescription['rightEye']): EyeDraft {
  return { ...eye };
}

function orderToDraft(order: ProductOrder): OrderDraft {
  return {
    key: nextKey('order'),
    id: order.id,
    orderCode: order.orderCode,
    orderType: order.orderType,
    frameCategory: order.frameCategory ?? '',
    frameCompany: order.frameCompany,
    frameModel: order.frameModel,
    lensCompany: order.lensCompany,
    lensName: order.lensName,
    quantity: String(order.quantity),
    amount: order.amount ? String(order.amount) : '',
    expectedDeliveryDate: toDateInputValue(order.expectedDeliveryDate),
    deliveredDate: order.deliveredDate,
    status: order.status,
    notes: order.notes,
  };
}

function serviceToDraft(job: ServiceJob): ServiceDraft {
  return {
    key: nextKey('service'),
    id: job.id,
    serviceCode: job.serviceCode,
    serviceType: job.serviceType,
    description: job.description,
    charge: job.charge ? String(job.charge) : '',
    paymentStatus: job.paymentStatus,
    expectedReadyDate: toDateInputValue(job.expectedReadyDate),
    deliveredDate: job.deliveredDate,
    status: job.status,
    notes: job.notes,
  };
}

export function visitToDraft(visit: Visit): VisitDraft {
  return {
    visitDate: toDateInputValue(visit.visitDate),
    visitType: visit.visitType,
    notes: visit.notes,
    includePrescription: visit.prescription !== null,
    prescription: visit.prescription
      ? {
          rightEye: eyeToDraft(visit.prescription.rightEye),
          leftEye: eyeToDraft(visit.prescription.leftEye),
          binocularPd: visit.prescription.binocularPd,
          doctor: visit.prescription.doctor,
          notes: visit.prescription.notes,
        }
      : emptyPrescriptionDraft(),
    orders: visit.orders.map(orderToDraft),
    services: visit.services.map(serviceToDraft),
  };
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

export function validateVisitDraft(draft: VisitDraft): VisitDraftErrors {
  const errors: VisitDraftErrors = { orders: {}, services: {} };

  if (isBlank(draft.visitDate)) {
    errors.visitDate = 'Visit date is required';
  } else {
    const parsed = fromDateInputValue(draft.visitDate);
    const tomorrow = new Date();
    tomorrow.setHours(23, 59, 59, 999);
    if (!parsed) errors.visitDate = 'Enter a valid date';
    else if (parsed > tomorrow) errors.visitDate = 'Visit date cannot be in the future';
  }

  if (isBlank(draft.visitType)) errors.visitType = 'Visit type is required';

  for (const order of draft.orders) {
    const amount = parseNumber(order.amount);
    const quantity = parseNumber(order.quantity);
    if (amount === null || amount < 0) {
      errors.orders[order.key] = 'Enter a valid amount';
    } else if (quantity === null || quantity < 1 || !Number.isInteger(quantity)) {
      errors.orders[order.key] = 'Quantity must be a whole number of 1 or more';
    } else if (
      order.orderType === 'spectacles' &&
      isBlank(order.frameCompany) &&
      isBlank(order.lensCompany)
    ) {
      errors.orders[order.key] = 'Enter at least a frame or a lens brand';
    }
  }

  for (const job of draft.services) {
    const charge = parseNumber(job.charge || '0');
    if (isBlank(job.description)) {
      errors.services[job.key] = 'Describe the work to be done';
    } else if (charge === null || charge < 0) {
      errors.services[job.key] = 'Enter a valid service charge';
    } else if (!isBlank(job.expectedReadyDate) && !fromDateInputValue(job.expectedReadyDate)) {
      errors.services[job.key] = 'Enter a valid expected ready date';
    }
  }

  return errors;
}

export function visitDraftHasErrors(errors: VisitDraftErrors): boolean {
  return (
    Boolean(errors.visitDate) ||
    Boolean(errors.visitType) ||
    Object.keys(errors.orders).length > 0 ||
    Object.keys(errors.services).length > 0
  );
}

/* -------------------------------------------------------------------------- */
/* Draft -> service input                                                     */
/* -------------------------------------------------------------------------- */

function isPrescriptionEmpty(draft: PrescriptionDraft): boolean {
  const eyeValues = [...Object.values(draft.rightEye), ...Object.values(draft.leftEye)];
  return (
    eyeValues.every(isBlank) &&
    isBlank(draft.binocularPd) &&
    isBlank(draft.doctor) &&
    isBlank(draft.notes)
  );
}

function orderFromDraft(draft: OrderDraft): OrderInput {
  const base: OrderInput = {
    orderType: draft.orderType,
    frameCategory: draft.frameCategory === '' ? null : draft.frameCategory,
    frameCompany: draft.frameCompany.trim(),
    frameModel: draft.frameModel.trim(),
    lensCompany: draft.lensCompany.trim(),
    lensName: draft.lensName.trim(),
    quantity: parseNumber(draft.quantity) ?? 1,
    amount: parseNumber(draft.amount) ?? 0,
    expectedDeliveryDate: fromDateInputValue(draft.expectedDeliveryDate),
    deliveredDate: draft.deliveredDate,
    status: draft.status,
    notes: draft.notes.trim(),
  };
  // Preserve identity so editing a visit does not mint a new order code.
  if (draft.id) base.id = draft.id;
  if (draft.orderCode) base.orderCode = draft.orderCode;
  return base;
}

function serviceFromDraft(draft: ServiceDraft): ServiceInput {
  const base: ServiceInput = {
    serviceType: draft.serviceType,
    description: draft.description.trim(),
    charge: parseNumber(draft.charge) ?? 0,
    paymentStatus: draft.paymentStatus,
    expectedReadyDate: fromDateInputValue(draft.expectedReadyDate),
    deliveredDate: draft.deliveredDate,
    status: draft.status,
    notes: draft.notes.trim(),
  };
  if (draft.id) base.id = draft.id;
  if (draft.serviceCode) base.serviceCode = draft.serviceCode;
  return base;
}

export function toVisitInput(draft: VisitDraft): VisitInput {
  const includePrescription = draft.includePrescription && !isPrescriptionEmpty(draft.prescription);

  return {
    visitDate: fromDateInputValue(draft.visitDate) ?? new Date(),
    visitType: draft.visitType,
    notes: draft.notes.trim(),
    prescription: includePrescription
      ? {
          rightEye: { ...draft.prescription.rightEye },
          leftEye: { ...draft.prescription.leftEye },
          binocularPd: draft.prescription.binocularPd.trim(),
          doctor: draft.prescription.doctor.trim(),
          notes: draft.prescription.notes.trim(),
        }
      : null,
    orders: draft.orders.map(orderFromDraft),
    services: draft.services.map(serviceFromDraft),
  };
}

/**
 * Derives the visit type from what was actually recorded, so staff do not have
 * to remember to set it. An explicit choice by the user always wins.
 */
export function suggestVisitType(draft: VisitDraft): VisitType {
  const hasOrders = draft.orders.length > 0;
  const hasServices = draft.services.length > 0;
  const hasPrescription = draft.includePrescription;

  if (hasServices && !hasOrders && !hasPrescription) return 'service';
  if (hasOrders && !hasServices && !hasPrescription) return 'order';
  if (hasPrescription && !hasOrders && !hasServices) return 'prescription';
  if (hasOrders || hasServices || hasPrescription) return draft.visitType;
  return 'consultation';
}
