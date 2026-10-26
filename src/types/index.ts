/**
 * Domain model for Optic World V1.
 *
 * Dates are plain `Date` objects at this layer. Conversion to and from the
 * Firestore `Timestamp` type happens inside the Firestore adapter so that UI
 * and business code never depend on a storage detail.
 */

/* -------------------------------------------------------------------------- */
/* Users and roles                                                            */
/* -------------------------------------------------------------------------- */

export const USER_ROLES = ['admin', 'employee'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface UserProfile {
  /** Firebase Auth UID. */
  id: string;
  fullName: string;
  email: string;
  /** Mirror of the custom claim. The claim, never this field, is authoritative. */
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  createdBy: string | null;
  updatedAt: Date;
  updatedBy: string | null;
}

/** The signed-in principal, with the role read from the ID token custom claims. */
export interface AuthUser {
  uid: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

export const CUSTOMER_TYPES = ['primary', 'family_member'] as const;
export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const GENDERS = ['male', 'female', 'other'] as const;
export type Gender = (typeof GENDERS)[number];

export const RELATIONSHIP_TYPES = [
  'spouse',
  'son',
  'daughter',
  'father',
  'mother',
  'brother',
  'sister',
  'grandfather',
  'grandmother',
  'grandson',
  'granddaughter',
  'other',
] as const;
export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export interface Address {
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
}

export interface Customer {
  /** Firestore document id. Equal to the customer code so paths stay readable. */
  id: string;
  /** Human-facing unique code, for example CUST-000001. Never reused. */
  customerCode: string;

  name: string;
  /** Lowercased name, persisted so name search can use a range query. */
  nameLower: string;
  phone: string;
  alternatePhone: string;
  dateOfBirth: Date | null;
  age: number | null;
  gender: Gender | null;

  address: Address;

  hospital: string;
  referredBy: string;
  referralDetails: string;
  notes: string;

  customerType: CustomerType;
  /** Customer code of the primary customer, when this is a family member. */
  primaryCustomerId: string | null;
  relationship: RelationshipType | null;
  /** Free text, only meaningful when `relationship` is `other`. */
  relationshipNote: string | null;

  /** Denormalised summaries so the customer list never loads visit history. */
  visitCount: number;
  lastVisitAt: Date | null;

  isActive: boolean;

  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/** A customer plus the relationship label relative to the customer being viewed. */
export interface RelatedCustomer {
  customer: Customer;
  /** Relationship of `customer` to the customer whose page is open. */
  relationship: RelationshipType;
  relationshipNote: string | null;
  /** True when `customer` is the primary customer of the one being viewed. */
  isPrimary: boolean;
}

/* -------------------------------------------------------------------------- */
/* Visits                                                                     */
/* -------------------------------------------------------------------------- */

export const VISIT_TYPES = [
  'consultation',
  'prescription',
  'order',
  'service',
  'follow_up',
  'other',
] as const;
export type VisitType = (typeof VISIT_TYPES)[number];

export interface EyePrescription {
  distanceSph: string;
  distanceCyl: string;
  distanceAxis: string;
  nearSph: string;
  nearCyl: string;
  nearAxis: string;
  add: string;
  pd: string;
}

export interface Prescription {
  rightEye: EyePrescription;
  leftEye: EyePrescription;
  binocularPd: string;
  doctor: string;
  notes: string;
}

export const LENS_TYPES = ['single_vision', 'bifocal', 'progressive', 'reading', 'other'] as const;
export type LensType = (typeof LENS_TYPES)[number];

/** The glasses a customer walks in wearing: the power read from them, and the lens. */
export interface OldGlasses {
  prescription: Prescription;
  lensType: LensType | null;
  lensCompany: string;
  lensName: string;
  /** Coating, material, index — free text, as read or as the customer reports. */
  lensDetails: string;
}

/* -------------------------------------------------------------------------- */
/* Product orders                                                             */
/* -------------------------------------------------------------------------- */

export const ORDER_STATUSES = [
  'pending',
  'in_progress',
  'ready',
  'delivered',
  'cancelled',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_TYPES = [
  'spectacles',
  'frame_only',
  'lens_only',
  'sunglasses',
  'contact_lens',
  'accessory',
  'other',
] as const;
export type OrderType = (typeof ORDER_TYPES)[number];

export const FRAME_CATEGORIES = [
  'full_rim',
  'half_rim',
  'rimless',
  'kids',
  'sports',
  'other',
] as const;
export type FrameCategory = (typeof FRAME_CATEGORIES)[number];

export interface ProductOrder {
  id: string;
  /** Human-facing code, for example ORD-00125. */
  orderCode: string;
  orderType: OrderType;

  frameCategory: FrameCategory | null;
  frameCompany: string;
  frameModel: string;

  lensCompany: string;
  lensName: string;

  quantity: number;
  amount: number;

  expectedDeliveryDate: Date | null;
  deliveredDate: Date | null;

  status: OrderStatus;
  notes: string;
}

/* -------------------------------------------------------------------------- */
/* Service jobs                                                               */
/* -------------------------------------------------------------------------- */

export const SERVICE_STATUSES = [
  'received',
  'in_service',
  'ready',
  'delivered',
  'cancelled',
] as const;
export type ServiceStatus = (typeof SERVICE_STATUSES)[number];

export const SERVICE_TYPES = [
  'nose_pad_replacement',
  'frame_adjustment',
  'screw_replacement',
  'lens_fitting',
  'frame_modification',
  'welding',
  'cleaning',
  'other',
] as const;
export type ServiceType = (typeof SERVICE_TYPES)[number];

export const PAYMENT_STATUSES = ['pending', 'paid'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export interface ServiceJob {
  id: string;
  /** Human-facing code, for example SRV-00042. */
  serviceCode: string;
  serviceType: ServiceType;
  description: string;
  charge: number;
  paymentStatus: PaymentStatus;
  expectedReadyDate: Date | null;
  deliveredDate: Date | null;
  status: ServiceStatus;
  notes: string;
}

/* -------------------------------------------------------------------------- */
/* Visit document                                                             */
/* -------------------------------------------------------------------------- */

export interface Visit {
  id: string;
  /** Human-facing code, for example VISIT-000001. */
  visitCode: string;
  customerId: string;

  visitDate: Date;
  visitType: VisitType;

  /*
   * A visit can record up to three readings, in the order they happen in the
   * shop. Each is null when it was not taken.
   */
  /** 1. The customer's current glasses: power read from them, plus lens details. */
  oldGlasses: OldGlasses | null;
  /** 2. The auto-refractor (AR machine) reading taken in the shop. */
  arReading: Prescription | null;
  /**
   * 3. Prescribed power — the final power, entered by staff, that the lens is
   * made to. This is "the customer's prescription" everywhere else in the app.
   */
  prescription: Prescription | null;
  orders: ProductOrder[];
  services: ServiceJob[];

  notes: string;

  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export interface DashboardSummary {
  todaysVisits: number;
  newCustomersThisWeek: number;
  pendingOrders: number;
  servicesReady: number;
}

/* -------------------------------------------------------------------------- */
/* Errors                                                                     */
/* -------------------------------------------------------------------------- */

export type AppErrorCode =
  | 'unauthenticated'
  | 'permission-denied'
  | 'not-found'
  | 'invalid-argument'
  | 'already-exists'
  | 'account-disabled'
  | 'unknown';

export class AppError extends Error {
  readonly code: AppErrorCode;

  constructor(code: AppErrorCode, message: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}
