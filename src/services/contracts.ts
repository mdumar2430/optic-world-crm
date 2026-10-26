/**
 * The data-access contract.
 *
 * Both the mock adapter (`services/mock`) and the Firebase adapter
 * (`services/firebase`) implement these interfaces, so pages and hooks never
 * import Firebase directly. Switching data sources is a one-line change in
 * `services/index.ts`, driven by `VITE_DATA_SOURCE`.
 */
import type {
  AuthUser,
  Customer,
  CustomerType,
  DashboardSummary,
  Gender,
  Address,
  OrderStatus,
  Prescription,
  ProductOrder,
  RelatedCustomer,
  RelationshipType,
  ServiceJob,
  ServiceStatus,
  UserProfile,
  UserRole,
  Visit,
  VisitType,
} from '@/types';

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

export interface AuthAdapter {
  /** Emits the current principal, or null when signed out. Returns unsubscribe. */
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  signIn(email: string, password: string): Promise<AuthUser>;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

/** Everything a staff member types on the customer form. */
export interface CustomerInput {
  name: string;
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
  primaryCustomerId: string | null;
  relationship: RelationshipType | null;
  relationshipNote: string | null;
}

/** The initial visit created alongside a new customer. */
export interface VisitInput {
  visitDate: Date;
  visitType: VisitType;
  notes: string;
  existingPrescription: Prescription | null;
  prescription: Prescription | null;
  orders: OrderInput[];
  services: ServiceInput[];
}

export type OrderInput = Omit<ProductOrder, 'id' | 'orderCode'> & {
  /** Present when editing an existing order, absent when adding a new one. */
  id?: string;
  orderCode?: string;
};

export type ServiceInput = Omit<ServiceJob, 'id' | 'serviceCode'> & {
  id?: string;
  serviceCode?: string;
};

export interface CustomerListFilters {
  /** Free-text term matched against customer code, name prefix, or phone. */
  search?: string;
  /** Defaults to `active`. Only an admin may request `inactive` or `all`. */
  status?: 'active' | 'inactive' | 'all';
  pageSize?: number;
  /** Opaque cursor from a previous page. */
  cursor?: string | null;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

export interface DuplicateMatch {
  customer: Customer;
  reason: 'phone' | 'name_and_phone' | 'name';
}

export interface CustomersAdapter {
  list(filters: CustomerListFilters): Promise<Page<Customer>>;
  getById(customerId: string): Promise<Customer | null>;
  /** Lightweight lookup used by the family-member picker. */
  quickSearch(term: string, limit?: number): Promise<Customer[]>;
  findPossibleDuplicates(input: Pick<CustomerInput, 'name' | 'phone'>): Promise<DuplicateMatch[]>;

  /**
   * Creates the customer and its initial visit as one unit so the store never
   * ends up with a customer that has no visit.
   */
  createWithInitialVisit(
    customer: CustomerInput,
    initialVisit: VisitInput,
  ): Promise<{ customer: Customer; visit: Visit }>;

  update(customerId: string, input: CustomerInput): Promise<Customer>;
  /** Soft delete / restore. Admin only, enforced by rules as well as UI. */
  setActive(customerId: string, isActive: boolean): Promise<Customer>;

  /** The primary customer and family members related to this customer. */
  getRelated(customerId: string): Promise<RelatedCustomer[]>;
  /** Links an existing customer as a family member of `primaryCustomerId`. */
  linkFamilyMember(args: {
    primaryCustomerId: string;
    memberCustomerId: string;
    relationship: RelationshipType;
    relationshipNote: string | null;
  }): Promise<void>;
  unlinkFamilyMember(memberCustomerId: string): Promise<void>;
}

/* -------------------------------------------------------------------------- */
/* Visits                                                                     */
/* -------------------------------------------------------------------------- */

export interface VisitsAdapter {
  listByCustomer(customerId: string, limit?: number): Promise<Visit[]>;
  getById(customerId: string, visitId: string): Promise<Visit | null>;
  create(customerId: string, input: VisitInput): Promise<Visit>;
  update(customerId: string, visitId: string, input: VisitInput): Promise<Visit>;
  setOrderStatus(args: {
    customerId: string;
    visitId: string;
    orderId: string;
    status: OrderStatus;
  }): Promise<Visit>;
  setServiceStatus(args: {
    customerId: string;
    visitId: string;
    serviceId: string;
    status: ServiceStatus;
  }): Promise<Visit>;
}

/* -------------------------------------------------------------------------- */
/* Employees                                                                  */
/* -------------------------------------------------------------------------- */

export interface CreateEmployeeInput {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface EmployeesAdapter {
  list(): Promise<UserProfile[]>;
  getById(userId: string): Promise<UserProfile | null>;
  /** Creates the Auth account and its profile without signing the admin out. */
  create(input: CreateEmployeeInput): Promise<UserProfile>;
  setActive(userId: string, isActive: boolean): Promise<UserProfile>;
  setRole(userId: string, role: UserRole): Promise<UserProfile>;
}

/* -------------------------------------------------------------------------- */
/* Dashboard                                                                  */
/* -------------------------------------------------------------------------- */

export interface DashboardAdapter {
  getSummary(): Promise<DashboardSummary>;
  /** Most recent visits across all customers, for the dashboard feed. */
  getRecentVisits(limit?: number): Promise<Array<{ visit: Visit; customer: Customer }>>;
}

/* -------------------------------------------------------------------------- */
/* Directory of user display names (for `createdBy` rendering)                */
/* -------------------------------------------------------------------------- */

export interface DirectoryAdapter {
  /** Maps user UID to display name. Cached by the adapter. */
  getUserNames(): Promise<Record<string, string>>;
}

export interface DataProvider {
  auth: AuthAdapter;
  customers: CustomersAdapter;
  visits: VisitsAdapter;
  employees: EmployeesAdapter;
  dashboard: DashboardAdapter;
  directory: DirectoryAdapter;
}
