/**
 * Mock implementation of the data contract.
 *
 * It deliberately reproduces the constraints of the real backend — counter-based
 * codes, prefix-only search, status-transition rules, admin-only employee
 * management — so that behaviour observed in the demo matches the Firebase
 * adapter rather than flattering it.
 */
import type {
  AuthUser,
  Customer,
  DashboardSummary,
  RelatedCustomer,
  UserProfile,
  UserRole,
  Visit,
} from '@/types';
import { AppError } from '@/types';
import { canTransitionOrder, canTransitionService } from '@/constants/workflow';
import type {
  AuthAdapter,
  CreateEmployeeInput,
  CustomerInput,
  CustomerListFilters,
  CustomersAdapter,
  DashboardAdapter,
  DataProvider,
  DirectoryAdapter,
  DuplicateMatch,
  EmployeesAdapter,
  OrderInput,
  Page,
  ServiceInput,
  VisitsAdapter,
} from '../contracts';
import {
  delay,
  getDb,
  mutate,
  nextCustomerCode,
  nextOrderCode,
  nextServiceCode,
  nextVisitCode,
  randomId,
  readSessionUid,
  writeSessionUid,
  type MockDb,
  type MockUser,
} from './store';

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

type Listener = (user: AuthUser | null) => void;

const listeners = new Set<Listener>();
let currentUid: string | null = null;
let sessionRestored = false;

function toAuthUser(user: MockUser): AuthUser {
  return {
    uid: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    isActive: user.isActive,
  };
}

function restoreSession(): void {
  if (sessionRestored) return;
  sessionRestored = true;
  const uid = readSessionUid();
  if (!uid) return;
  const user = getDb().users.find((candidate) => candidate.id === uid);
  // A deactivated account must not survive a page refresh.
  currentUid = user?.isActive ? user.id : null;
  if (!currentUid) writeSessionUid(null);
}

function currentAuthUser(): AuthUser | null {
  restoreSession();
  if (!currentUid) return null;
  const user = getDb().users.find((candidate) => candidate.id === currentUid);
  return user ? toAuthUser(user) : null;
}

function emit(): void {
  const user = currentAuthUser();
  for (const listener of listeners) listener(user);
}

/** Every mutating call goes through this, mirroring `request.auth` in rules. */
function requireUser(): AuthUser {
  const user = currentAuthUser();
  if (!user) throw new AppError('unauthenticated', 'You are signed out. Please sign in again.');
  if (!user.isActive) {
    throw new AppError('account-disabled', 'This account has been deactivated.');
  }
  return user;
}

function requireAdmin(): AuthUser {
  const user = requireUser();
  if (user.role !== 'admin') {
    throw new AppError('permission-denied', 'Only an admin can perform this action.');
  }
  return user;
}

const auth: AuthAdapter = {
  onAuthStateChanged(callback) {
    listeners.add(callback);
    // Match Firebase: the first emission is asynchronous.
    window.setTimeout(() => callback(currentAuthUser()), 0);
    return () => listeners.delete(callback);
  },

  async signIn(email, password) {
    await delay(null, 400);
    const user = getDb().users.find(
      (candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!user || user.password !== password) {
      throw new AppError('unauthenticated', 'Incorrect email or password.');
    }
    if (!user.isActive) {
      throw new AppError(
        'account-disabled',
        'This account has been deactivated. Contact your administrator.',
      );
    }
    currentUid = user.id;
    writeSessionUid(user.id);
    emit();
    return toAuthUser(user);
  },

  async signOut() {
    currentUid = null;
    writeSessionUid(null);
    emit();
  },

  async sendPasswordReset(email) {
    await delay(null, 300);
    if (!email.trim()) {
      throw new AppError('invalid-argument', 'Enter the email address for your account.');
    }
    // Never reveal whether an address is registered.
  },
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function clone<T>(value: T): T {
  return structuredClone(value);
}

function sortByLastVisitDesc(a: Customer, b: Customer): number {
  const left = a.lastVisitAt?.getTime() ?? 0;
  const right = b.lastVisitAt?.getTime() ?? 0;
  if (right !== left) return right - left;
  return b.createdAt.getTime() - a.createdAt.getTime();
}

function matchesSearch(record: Customer, term: string): boolean {
  const needle = term.trim().toLowerCase();
  if (!needle) return true;
  // Mirrors the three Firestore queries: exact code, name prefix, phone prefix.
  const digits = needle.replace(/\D/g, '');
  return (
    record.customerCode.toLowerCase() === needle ||
    record.customerCode.toLowerCase().includes(needle) ||
    record.nameLower.startsWith(needle) ||
    record.nameLower.split(' ').some((part) => part.startsWith(needle)) ||
    (digits.length >= 3 &&
      (record.phone.startsWith(digits) || record.alternatePhone.startsWith(digits)))
  );
}

function toOrder(input: OrderInput, db: MockDb) {
  return {
    ...input,
    id: input.id ?? randomId('ord'),
    orderCode: input.orderCode ?? nextOrderCode(db),
  };
}

function toService(input: ServiceInput, db: MockDb) {
  return {
    ...input,
    id: input.id ?? randomId('srv'),
    serviceCode: input.serviceCode ?? nextServiceCode(db),
  };
}

/** Recomputes `visitCount` / `lastVisitAt` after any visit mutation. */
function refreshVisitSummary(db: MockDb, customerId: string): void {
  const record = db.customers.find((candidate) => candidate.id === customerId);
  if (!record) return;
  const own = db.visits.filter((visit) => visit.customerId === customerId);
  record.visitCount = own.length;
  record.lastVisitAt = own.reduce<Date | null>(
    (latest, visit) => (latest === null || visit.visitDate > latest ? visit.visitDate : latest),
    null,
  );
}

function applyCustomerInput(target: Customer, input: CustomerInput, uid: string): Customer {
  target.name = input.name.trim();
  target.nameLower = target.name.toLowerCase();
  target.phone = input.phone;
  target.alternatePhone = input.alternatePhone;
  target.dateOfBirth = input.dateOfBirth;
  target.age = input.age;
  target.gender = input.gender;
  target.address = { ...input.address };
  target.hospital = input.hospital;
  target.referredBy = input.referredBy;
  target.referralDetails = input.referralDetails;
  target.notes = input.notes;
  target.customerType = input.customerType;
  target.primaryCustomerId = input.primaryCustomerId;
  target.relationship = input.relationship;
  target.relationshipNote = input.relationshipNote;
  target.updatedAt = new Date();
  target.updatedBy = uid;
  return target;
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

const customers: CustomersAdapter = {
  async list(filters: CustomerListFilters): Promise<Page<Customer>> {
    const user = requireUser();
    const db = getDb();
    const status = filters.status ?? 'active';

    // Only an admin may look at soft-deleted records, as in the security rules.
    const effectiveStatus = user.role === 'admin' ? status : 'active';

    let results = db.customers.filter((record) => {
      if (effectiveStatus === 'active' && !record.isActive) return false;
      if (effectiveStatus === 'inactive' && record.isActive) return false;
      return matchesSearch(record, filters.search ?? '');
    });

    results = results.sort(sortByLastVisitDesc);

    const pageSize = filters.pageSize ?? 20;
    const offset = filters.cursor ? Number(filters.cursor) : 0;
    const items = results.slice(offset, offset + pageSize);
    const nextOffset = offset + items.length;

    return delay({
      items: clone(items),
      nextCursor: nextOffset < results.length ? String(nextOffset) : null,
    });
  },

  async getById(customerId) {
    const user = requireUser();
    const record = getDb().customers.find((candidate) => candidate.id === customerId);
    if (!record) return delay(null);
    if (!record.isActive && user.role !== 'admin') {
      throw new AppError('permission-denied', 'This customer record is not available.');
    }
    return delay(clone(record));
  },

  async quickSearch(term, limit = 8) {
    requireUser();
    if (term.trim().length < 2) return delay([]);
    const results = getDb()
      .customers.filter((record) => record.isActive && matchesSearch(record, term))
      .sort(sortByLastVisitDesc)
      .slice(0, limit);
    return delay(clone(results), 150);
  },

  async findPossibleDuplicates(input) {
    requireUser();
    const phone = input.phone.replace(/\D/g, '');
    const name = input.name.trim().toLowerCase();
    if (phone.length < 10 && name.length < 3) return delay([]);

    const matches: DuplicateMatch[] = [];
    for (const record of getDb().customers) {
      if (!record.isActive) continue;
      const samePhone = phone.length >= 10 && record.phone === phone;
      const sameName = name.length >= 3 && record.nameLower === name;
      if (samePhone && sameName) matches.push({ customer: clone(record), reason: 'name_and_phone' });
      else if (samePhone) matches.push({ customer: clone(record), reason: 'phone' });
      else if (sameName) matches.push({ customer: clone(record), reason: 'name' });
    }
    // Strongest signal first.
    const weight = { name_and_phone: 0, phone: 1, name: 2 } as const;
    matches.sort((a, b) => weight[a.reason] - weight[b.reason]);
    return delay(matches, 200);
  },

  async createWithInitialVisit(input, initialVisit) {
    const user = requireUser();
    if (!input.name.trim()) throw new AppError('invalid-argument', 'Customer name is required.');
    if (!input.phone.trim()) throw new AppError('invalid-argument', 'Phone number is required.');

    const created = mutate((db) => {
      const code = nextCustomerCode(db);
      const timestamp = new Date();
      const record: Customer = {
        id: code,
        customerCode: code,
        name: input.name.trim(),
        nameLower: input.name.trim().toLowerCase(),
        phone: input.phone,
        alternatePhone: input.alternatePhone,
        dateOfBirth: input.dateOfBirth,
        age: input.age,
        gender: input.gender,
        address: { ...input.address },
        hospital: input.hospital,
        referredBy: input.referredBy,
        referralDetails: input.referralDetails,
        notes: input.notes,
        customerType: input.customerType,
        primaryCustomerId: input.primaryCustomerId,
        relationship: input.relationship,
        relationshipNote: input.relationshipNote,
        visitCount: 0,
        lastVisitAt: null,
        isActive: true,
        createdAt: timestamp,
        createdBy: user.uid,
        updatedAt: timestamp,
        updatedBy: user.uid,
      };

      const visitCode = nextVisitCode(db);
      const visit: Visit = {
        id: visitCode,
        visitCode,
        customerId: code,
        visitDate: initialVisit.visitDate,
        visitType: initialVisit.visitType,
        existingPrescription: initialVisit.existingPrescription,
        prescription: initialVisit.prescription,
        orders: initialVisit.orders.map((order) => toOrder(order, db)),
        services: initialVisit.services.map((entry) => toService(entry, db)),
        notes: initialVisit.notes,
        createdAt: timestamp,
        createdBy: user.uid,
        updatedAt: timestamp,
        updatedBy: user.uid,
      };

      db.customers.push(record);
      db.visits.push(visit);
      refreshVisitSummary(db, code);
      return { customer: clone(record), visit: clone(visit) };
    });

    return delay(created, 450);
  },

  async update(customerId, input) {
    const user = requireUser();
    const updated = mutate((db) => {
      const record = db.customers.find((candidate) => candidate.id === customerId);
      if (!record) throw new AppError('not-found', 'Customer not found.');
      if (!record.isActive && user.role !== 'admin') {
        throw new AppError('permission-denied', 'This customer record is not available.');
      }
      return clone(applyCustomerInput(record, input, user.uid));
    });
    return delay(updated, 350);
  },

  async setActive(customerId, isActive) {
    const user = requireAdmin();
    const updated = mutate((db) => {
      const record = db.customers.find((candidate) => candidate.id === customerId);
      if (!record) throw new AppError('not-found', 'Customer not found.');
      record.isActive = isActive;
      record.updatedAt = new Date();
      record.updatedBy = user.uid;
      return clone(record);
    });
    return delay(updated, 300);
  },

  async getRelated(customerId) {
    requireUser();
    const db = getDb();
    const record = db.customers.find((candidate) => candidate.id === customerId);
    if (!record) return delay([]);

    const related: RelatedCustomer[] = [];

    if (record.customerType === 'family_member' && record.primaryCustomerId) {
      const primary = db.customers.find(
        (candidate) => candidate.id === record.primaryCustomerId,
      );
      if (primary) {
        related.push({
          customer: clone(primary),
          relationship: record.relationship ?? 'other',
          relationshipNote: record.relationshipNote,
          isPrimary: true,
        });
      }
      // Siblings: other members of the same primary customer.
      for (const sibling of db.customers) {
        if (sibling.id === record.id) continue;
        if (sibling.primaryCustomerId !== record.primaryCustomerId) continue;
        related.push({
          customer: clone(sibling),
          relationship: sibling.relationship ?? 'other',
          relationshipNote: sibling.relationshipNote,
          isPrimary: false,
        });
      }
    } else {
      for (const member of db.customers) {
        if (member.primaryCustomerId !== record.id) continue;
        related.push({
          customer: clone(member),
          relationship: member.relationship ?? 'other',
          relationshipNote: member.relationshipNote,
          isPrimary: false,
        });
      }
    }

    return delay(related);
  },

  async linkFamilyMember({ primaryCustomerId, memberCustomerId, relationship, relationshipNote }) {
    const user = requireUser();
    if (primaryCustomerId === memberCustomerId) {
      throw new AppError('invalid-argument', 'A customer cannot be their own family member.');
    }
    mutate((db) => {
      const primary = db.customers.find((candidate) => candidate.id === primaryCustomerId);
      const member = db.customers.find((candidate) => candidate.id === memberCustomerId);
      if (!primary || !member) throw new AppError('not-found', 'Customer not found.');
      // Relationships are one level deep, so a customer who is already the
      // head of a family cannot also be filed under someone else.
      const hasOwnFamily = db.customers.some(
        (candidate) => candidate.primaryCustomerId === member.id,
      );
      if (hasOwnFamily) {
        throw new AppError(
          'invalid-argument',
          `${member.name} already has family members linked and cannot be added under another customer.`,
        );
      }
      member.customerType = 'family_member';
      member.primaryCustomerId = primary.id;
      member.relationship = relationship;
      member.relationshipNote = relationshipNote;
      member.updatedAt = new Date();
      member.updatedBy = user.uid;

      primary.customerType = 'primary';
      primary.primaryCustomerId = null;
      primary.relationship = null;
      primary.updatedAt = new Date();
      primary.updatedBy = user.uid;
    });
    await delay(null, 300);
  },

  async unlinkFamilyMember(memberCustomerId) {
    const user = requireUser();
    mutate((db) => {
      const member = db.customers.find((candidate) => candidate.id === memberCustomerId);
      if (!member) throw new AppError('not-found', 'Customer not found.');
      member.customerType = 'primary';
      member.primaryCustomerId = null;
      member.relationship = null;
      member.relationshipNote = null;
      member.updatedAt = new Date();
      member.updatedBy = user.uid;
    });
    await delay(null, 300);
  },
};

/* -------------------------------------------------------------------------- */
/* Visits                                                                     */
/* -------------------------------------------------------------------------- */

const visits: VisitsAdapter = {
  async listByCustomer(customerId, limit = 50) {
    requireUser();
    const results = getDb()
      .visits.filter((visit) => visit.customerId === customerId)
      .sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime())
      .slice(0, limit);
    return delay(clone(results));
  },

  async getById(customerId, visitId) {
    requireUser();
    const found = getDb().visits.find(
      (visit) => visit.customerId === customerId && visit.id === visitId,
    );
    return delay(found ? clone(found) : null);
  },

  async create(customerId, input) {
    const user = requireUser();
    const created = mutate((db) => {
      const record = db.customers.find((candidate) => candidate.id === customerId);
      if (!record) throw new AppError('not-found', 'Customer not found.');
      if (!record.isActive && user.role !== 'admin') {
        throw new AppError('permission-denied', 'Cannot add a visit to an inactive customer.');
      }

      const timestamp = new Date();
      const visitCode = nextVisitCode(db);
      const visit: Visit = {
        id: visitCode,
        visitCode,
        customerId,
        visitDate: input.visitDate,
        visitType: input.visitType,
        existingPrescription: input.existingPrescription,
        prescription: input.prescription,
        orders: input.orders.map((order) => toOrder(order, db)),
        services: input.services.map((entry) => toService(entry, db)),
        notes: input.notes,
        createdAt: timestamp,
        createdBy: user.uid,
        updatedAt: timestamp,
        updatedBy: user.uid,
      };
      db.visits.push(visit);
      refreshVisitSummary(db, customerId);
      return clone(visit);
    });
    return delay(created, 450);
  },

  async update(customerId, visitId, input) {
    const user = requireUser();
    const updated = mutate((db) => {
      const visit = db.visits.find(
        (candidate) => candidate.customerId === customerId && candidate.id === visitId,
      );
      if (!visit) throw new AppError('not-found', 'Visit not found.');

      visit.visitDate = input.visitDate;
      visit.visitType = input.visitType;
      visit.existingPrescription = input.existingPrescription;
      visit.prescription = input.prescription;
      visit.orders = input.orders.map((order) => toOrder(order, db));
      visit.services = input.services.map((entry) => toService(entry, db));
      visit.notes = input.notes;
      visit.updatedAt = new Date();
      visit.updatedBy = user.uid;

      refreshVisitSummary(db, customerId);
      return clone(visit);
    });
    return delay(updated, 400);
  },

  async setOrderStatus({ customerId, visitId, orderId, status }) {
    const user = requireUser();
    const updated = mutate((db) => {
      const visit = db.visits.find(
        (candidate) => candidate.customerId === customerId && candidate.id === visitId,
      );
      if (!visit) throw new AppError('not-found', 'Visit not found.');
      const order = visit.orders.find((candidate) => candidate.id === orderId);
      if (!order) throw new AppError('not-found', 'Order not found.');
      if (order.status !== status && !canTransitionOrder(order.status, status)) {
        throw new AppError(
          'invalid-argument',
          `An order cannot move from ${order.status} to ${status}.`,
        );
      }
      order.status = status;
      order.deliveredDate = status === 'delivered' ? new Date() : null;
      visit.updatedAt = new Date();
      visit.updatedBy = user.uid;
      return clone(visit);
    });
    return delay(updated, 250);
  },

  async setServiceStatus({ customerId, visitId, serviceId, status }) {
    const user = requireUser();
    const updated = mutate((db) => {
      const visit = db.visits.find(
        (candidate) => candidate.customerId === customerId && candidate.id === visitId,
      );
      if (!visit) throw new AppError('not-found', 'Visit not found.');
      const job = visit.services.find((candidate) => candidate.id === serviceId);
      if (!job) throw new AppError('not-found', 'Service job not found.');
      if (job.status !== status && !canTransitionService(job.status, status)) {
        throw new AppError(
          'invalid-argument',
          `A service cannot move from ${job.status} to ${status}.`,
        );
      }
      job.status = status;
      job.deliveredDate = status === 'delivered' ? new Date() : null;
      visit.updatedAt = new Date();
      visit.updatedBy = user.uid;
      return clone(visit);
    });
    return delay(updated, 250);
  },
};

/* -------------------------------------------------------------------------- */
/* Employees                                                                  */
/* -------------------------------------------------------------------------- */

function toProfile(user: MockUser): UserProfile {
  const { password: _password, ...profile } = user;
  return clone(profile);
}

const employees: EmployeesAdapter = {
  async list() {
    requireAdmin();
    const results = getDb()
      .users.slice()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(toProfile);
    return delay(results);
  },

  async getById(userId) {
    requireAdmin();
    const user = getDb().users.find((candidate) => candidate.id === userId);
    return delay(user ? toProfile(user) : null);
  },

  async create(input: CreateEmployeeInput) {
    const admin = requireAdmin();
    const created = mutate((db) => {
      const email = input.email.trim().toLowerCase();
      if (db.users.some((candidate) => candidate.email.toLowerCase() === email)) {
        throw new AppError('already-exists', 'An account with this email already exists.');
      }
      const timestamp = new Date();
      const user: MockUser = {
        id: randomId('uid'),
        fullName: input.fullName.trim(),
        email,
        role: input.role,
        isActive: true,
        password: input.password,
        createdAt: timestamp,
        createdBy: admin.uid,
        updatedAt: timestamp,
        updatedBy: admin.uid,
      };
      db.users.push(user);
      return toProfile(user);
    });
    return delay(created, 600);
  },

  async setActive(userId, isActive) {
    const admin = requireAdmin();
    const updated = mutate((db) => {
      const user = db.users.find((candidate) => candidate.id === userId);
      if (!user) throw new AppError('not-found', 'Employee not found.');
      if (user.id === admin.uid && !isActive) {
        throw new AppError('invalid-argument', 'You cannot deactivate your own account.');
      }
      user.isActive = isActive;
      user.updatedAt = new Date();
      user.updatedBy = admin.uid;
      return toProfile(user);
    });
    // A deactivated user must lose their session immediately.
    if (!isActive && userId === currentUid) {
      currentUid = null;
      writeSessionUid(null);
      emit();
    }
    return delay(updated, 350);
  },

  async setRole(userId, role: UserRole) {
    const admin = requireAdmin();
    const updated = mutate((db) => {
      const user = db.users.find((candidate) => candidate.id === userId);
      if (!user) throw new AppError('not-found', 'Employee not found.');
      if (user.id === admin.uid && role !== 'admin') {
        throw new AppError('invalid-argument', 'You cannot remove your own admin access.');
      }
      user.role = role;
      user.updatedAt = new Date();
      user.updatedBy = admin.uid;
      return toProfile(user);
    });
    emit();
    return delay(updated, 350);
  },
};

/* -------------------------------------------------------------------------- */
/* Dashboard and directory                                                    */
/* -------------------------------------------------------------------------- */

const dashboard: DashboardAdapter = {
  async getSummary(): Promise<DashboardSummary> {
    requireUser();
    const db = getDb();

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const todaysVisits = db.visits.filter((visit) => visit.visitDate >= startOfToday).length;
    const newCustomersThisWeek = db.customers.filter(
      (record) => record.isActive && record.createdAt >= startOfWeek,
    ).length;

    let pendingOrders = 0;
    let servicesReady = 0;
    for (const visit of db.visits) {
      for (const order of visit.orders) {
        if (order.status === 'pending' || order.status === 'in_progress') pendingOrders += 1;
      }
      for (const job of visit.services) {
        if (job.status === 'ready') servicesReady += 1;
      }
    }

    return delay({ todaysVisits, newCustomersThisWeek, pendingOrders, servicesReady });
  },

  async getRecentVisits(limit = 6) {
    requireUser();
    const db = getDb();
    const byId = new Map(db.customers.map((record) => [record.id, record]));
    const results = db.visits
      .slice()
      .sort((a, b) => b.visitDate.getTime() - a.visitDate.getTime())
      .slice(0, limit)
      .flatMap((visit) => {
        const record = byId.get(visit.customerId);
        return record ? [{ visit: clone(visit), customer: clone(record) }] : [];
      });
    return delay(results);
  },
};

const directory: DirectoryAdapter = {
  async getUserNames() {
    const names: Record<string, string> = {};
    for (const user of getDb().users) names[user.id] = user.fullName;
    return Promise.resolve(names);
  },
};

export const mockProvider: DataProvider = {
  auth,
  customers,
  visits,
  employees,
  dashboard,
  directory,
};
