/** Display labels for every enum in the domain model, kept in one place. */
import type {
  CustomerType,
  FrameCategory,
  Gender,
  LensType,
  OrderStatus,
  OrderType,
  PaymentStatus,
  RelationshipType,
  ServiceStatus,
  ServiceType,
  UserRole,
  VisitType,
} from '@/types';

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  employee: 'Employee',
};

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  primary: 'Primary customer',
  family_member: 'Family member',
};

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
};

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  spouse: 'Spouse',
  son: 'Son',
  daughter: 'Daughter',
  father: 'Father',
  mother: 'Mother',
  brother: 'Brother',
  sister: 'Sister',
  grandfather: 'Grandfather',
  grandmother: 'Grandmother',
  grandson: 'Grandson',
  granddaughter: 'Granddaughter',
  other: 'Other',
};

/**
 * How a relationship reads in the opposite direction. Used so that Ali's page
 * can say "Son of Ahmed Khan" while Ahmed's page lists Ali as "Son".
 */
export const INVERSE_RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  spouse: 'Spouse',
  son: 'Parent',
  daughter: 'Parent',
  father: 'Child',
  mother: 'Child',
  brother: 'Sibling',
  sister: 'Sibling',
  grandfather: 'Grandchild',
  grandmother: 'Grandchild',
  grandson: 'Grandparent',
  granddaughter: 'Grandparent',
  other: 'Related',
};

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  consultation: 'Consultation',
  prescription: 'Prescription',
  order: 'Order',
  service: 'Service',
  follow_up: 'Follow-up',
  other: 'Other',
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  spectacles: 'Spectacles',
  frame_only: 'Frame only',
  lens_only: 'Lens only',
  sunglasses: 'Sunglasses',
  contact_lens: 'Contact lens',
  accessory: 'Accessory',
  other: 'Other',
};

export const LENS_TYPE_LABELS: Record<LensType, string> = {
  single_vision: 'Single vision',
  bifocal: 'Bifocal',
  progressive: 'Progressive',
  reading: 'Reading only',
  other: 'Other',
};

export const FRAME_CATEGORY_LABELS: Record<FrameCategory, string> = {
  full_rim: 'Full rim',
  half_rim: 'Half rim',
  rimless: 'Rimless',
  kids: 'Kids',
  sports: 'Sports',
  other: 'Other',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const SERVICE_TYPE_LABELS: Record<ServiceType, string> = {
  nose_pad_replacement: 'Nose pad replacement',
  frame_adjustment: 'Frame adjustment',
  screw_replacement: 'Screw replacement',
  lens_fitting: 'Lens fitting',
  frame_modification: 'Frame modification',
  welding: 'Welding',
  cleaning: 'Cleaning',
  other: 'Other repair',
};

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  received: 'Received',
  in_service: 'In service',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  paid: 'Paid',
};
