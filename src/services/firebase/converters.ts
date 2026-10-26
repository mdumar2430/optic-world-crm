/**
 * Firestore <-> domain mapping.
 *
 * Every `Timestamp` is converted here and nowhere else, so the rest of the app
 * only ever deals with `Date`.
 */
import { Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import type {
  Customer,
  Prescription,
  ProductOrder,
  ServiceJob,
  UserProfile,
  Visit,
} from '@/types';

type Doc = QueryDocumentSnapshot<DocumentData>;

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function toDateOr(value: unknown, fallback: Date): Date {
  return toDate(value) ?? fallback;
}

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Firestore rejects `undefined`; dates round-trip through `Timestamp`. */
export function toFirestoreDate(value: Date | null): Timestamp | null {
  return value ? Timestamp.fromDate(value) : null;
}

/* -------------------------------------------------------------------------- */
/* Users                                                                      */
/* -------------------------------------------------------------------------- */

export function userFromDoc(snapshot: Doc): UserProfile {
  const data = snapshot.data();
  const created = toDateOr(data.createdAt, new Date());
  return {
    id: snapshot.id,
    fullName: str(data.fullName),
    email: str(data.email),
    role: data.role === 'admin' ? 'admin' : 'employee',
    isActive: data.isActive !== false,
    createdAt: created,
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : null,
    updatedAt: toDateOr(data.updatedAt, created),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
  };
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

export function customerFromDoc(snapshot: Doc): Customer {
  const data = snapshot.data();
  const address = (data.address ?? {}) as Record<string, unknown>;
  const created = toDateOr(data.createdAt, new Date());
  const name = str(data.name);

  return {
    id: snapshot.id,
    customerCode: str(data.customerCode, snapshot.id),
    name,
    nameLower: str(data.nameLower, name.toLowerCase()),
    phone: str(data.phone),
    alternatePhone: str(data.alternatePhone),
    dateOfBirth: toDate(data.dateOfBirth),
    age: nullableNum(data.age),
    gender:
      data.gender === 'male' || data.gender === 'female' || data.gender === 'other'
        ? data.gender
        : null,
    address: {
      line1: str(address.line1),
      line2: str(address.line2),
      city: str(address.city),
      state: str(address.state),
      postalCode: str(address.postalCode),
    },
    hospital: str(data.hospital),
    referredBy: str(data.referredBy),
    referralDetails: str(data.referralDetails),
    notes: str(data.notes),
    customerType: data.customerType === 'family_member' ? 'family_member' : 'primary',
    primaryCustomerId:
      typeof data.primaryCustomerId === 'string' ? data.primaryCustomerId : null,
    relationship: (data.relationship ?? null) as Customer['relationship'],
    relationshipNote: typeof data.relationshipNote === 'string' ? data.relationshipNote : null,
    visitCount: num(data.visitCount),
    lastVisitAt: toDate(data.lastVisitAt),
    isActive: data.isActive !== false,
    createdAt: created,
    createdBy: str(data.createdBy),
    updatedAt: toDateOr(data.updatedAt, created),
    updatedBy: str(data.updatedBy),
  };
}

/* -------------------------------------------------------------------------- */
/* Visits                                                                     */
/* -------------------------------------------------------------------------- */

function orderFromData(value: unknown): ProductOrder {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    id: str(data.id),
    orderCode: str(data.orderCode),
    orderType: (data.orderType ?? 'other') as ProductOrder['orderType'],
    frameCategory: (data.frameCategory ?? null) as ProductOrder['frameCategory'],
    frameCompany: str(data.frameCompany),
    frameModel: str(data.frameModel),
    lensCompany: str(data.lensCompany),
    lensName: str(data.lensName),
    quantity: num(data.quantity, 1),
    amount: num(data.amount),
    expectedDeliveryDate: toDate(data.expectedDeliveryDate),
    deliveredDate: toDate(data.deliveredDate),
    status: (data.status ?? 'pending') as ProductOrder['status'],
    notes: str(data.notes),
  };
}

function serviceFromData(value: unknown): ServiceJob {
  const data = (value ?? {}) as Record<string, unknown>;
  return {
    id: str(data.id),
    serviceCode: str(data.serviceCode),
    serviceType: (data.serviceType ?? 'other') as ServiceJob['serviceType'],
    description: str(data.description),
    charge: num(data.charge),
    paymentStatus: data.paymentStatus === 'paid' ? 'paid' : 'pending',
    expectedReadyDate: toDate(data.expectedReadyDate),
    deliveredDate: toDate(data.deliveredDate),
    status: (data.status ?? 'received') as ServiceJob['status'],
    notes: str(data.notes),
  };
}

function prescriptionFromData(value: unknown): Prescription | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const eye = (raw: unknown) => {
    const source = (raw ?? {}) as Record<string, unknown>;
    return {
      distanceSph: str(source.distanceSph),
      distanceCyl: str(source.distanceCyl),
      distanceAxis: str(source.distanceAxis),
      nearSph: str(source.nearSph),
      nearCyl: str(source.nearCyl),
      nearAxis: str(source.nearAxis),
      add: str(source.add),
      pd: str(source.pd),
    };
  };
  return {
    rightEye: eye(data.rightEye),
    leftEye: eye(data.leftEye),
    binocularPd: str(data.binocularPd),
    doctor: str(data.doctor),
    notes: str(data.notes),
  };
}

export function visitFromDoc(snapshot: Doc, customerId: string): Visit {
  const data = snapshot.data();
  const created = toDateOr(data.createdAt, new Date());
  return {
    id: snapshot.id,
    visitCode: str(data.visitCode, snapshot.id),
    customerId,
    visitDate: toDateOr(data.visitDate, created),
    visitType: (data.visitType ?? 'other') as Visit['visitType'],
    existingPrescription: prescriptionFromData(data.existingPrescription),
    prescription: prescriptionFromData(data.prescription),
    orders: Array.isArray(data.orders) ? data.orders.map(orderFromData) : [],
    services: Array.isArray(data.services) ? data.services.map(serviceFromData) : [],
    notes: str(data.notes),
    createdAt: created,
    createdBy: str(data.createdBy),
    updatedAt: toDateOr(data.updatedAt, created),
    updatedBy: str(data.updatedBy),
  };
}

export function orderToFirestore(order: ProductOrder): DocumentData {
  return {
    ...order,
    expectedDeliveryDate: toFirestoreDate(order.expectedDeliveryDate),
    deliveredDate: toFirestoreDate(order.deliveredDate),
  };
}

export function serviceToFirestore(job: ServiceJob): DocumentData {
  return {
    ...job,
    expectedReadyDate: toFirestoreDate(job.expectedReadyDate),
    deliveredDate: toFirestoreDate(job.deliveredDate),
  };
}
