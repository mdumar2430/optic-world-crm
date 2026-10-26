/**
 * Firebase implementation of the data contract.
 *
 * Everything goes straight to Firestore and Firebase Auth, guarded by Security
 * Rules. The project runs on the free Spark plan without Cloud Functions, so
 * a user's role and active state live in their `users/{uid}` profile, which
 * only an admin may write.
 */
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged as onFirebaseAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  collectionGroup,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit as limitTo,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  Timestamp,
  updateDoc,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Transaction,
} from 'firebase/firestore';

import type {
  AuthUser,
  Customer,
  DashboardSummary,
  RelatedCustomer,
  UserProfile,
  Visit,
} from '@/types';
import { AppError } from '@/types';
import { canTransitionOrder, canTransitionService } from '@/constants/workflow';
import { getDb, getFirebaseAuth, paths, withSecondaryAuth } from '@/lib/firebase';
import type {
  AuthAdapter,
  CustomerInput,
  CustomersAdapter,
  DashboardAdapter,
  DataProvider,
  DirectoryAdapter,
  DuplicateMatch,
  EmployeesAdapter,
  OrderInput,
  Page,
  ServiceInput,
  VisitInput,
  VisitsAdapter,
} from '../contracts';
import {
  customerFromDoc,
  orderToFirestore,
  serviceToFirestore,
  toFirestoreDate,
  userFromDoc,
  visitFromDoc,
} from './converters';

/* -------------------------------------------------------------------------- */
/* Error translation                                                          */
/* -------------------------------------------------------------------------- */

interface CodedError {
  code?: string;
  message?: string;
}

function toAppError(error: unknown, fallback: string): AppError {
  if (error instanceof AppError) return error;
  const coded = error as CodedError;
  switch (coded.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return new AppError('unauthenticated', 'Incorrect email or password.');
    case 'auth/user-disabled':
      return new AppError(
        'account-disabled',
        'This account has been deactivated. Contact your administrator.',
      );
    case 'auth/too-many-requests':
      return new AppError('unknown', 'Too many attempts. Please wait a moment and try again.');
    case 'auth/email-already-in-use':
      return new AppError('already-exists', 'An account with this email already exists.');
    case 'auth/weak-password':
    case 'auth/password-does-not-meet-requirements':
      return new AppError('invalid-argument', 'That password is too weak.');
    case 'permission-denied':
      return new AppError('permission-denied', 'You do not have permission to do that.');
    case 'not-found':
      return new AppError('not-found', 'That record no longer exists.');
    case 'already-exists':
      return new AppError('already-exists', coded.message ?? 'That record already exists.');
    case 'invalid-argument':
      return new AppError('invalid-argument', coded.message ?? 'Some details were not valid.');
    case 'unauthenticated':
      return new AppError('unauthenticated', 'Your session has expired. Please sign in again.');
    default:
      return new AppError('unknown', fallback);
  }
}

async function guard<T>(fallback: string, work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw toAppError(error, fallback);
  }
}

/* -------------------------------------------------------------------------- */
/* Auth                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Builds the principal from the user's Firestore profile, which is the
 * authority on `role` — the same document the Security Rules read.
 *
 * No profile means no access: that is an Auth account an admin never set up
 * (or one someone registered themselves). An inactive profile also ends the
 * session; the rules reject its reads and writes regardless.
 */
async function toAuthUser(user: User): Promise<AuthUser | null> {
  const profileSnap = await getDoc(doc(getDb(), paths.user(user.uid)));
  if (!profileSnap.exists()) return null;
  const profile = userFromDoc(profileSnap as QueryDocumentSnapshot<DocumentData>);
  if (!profile.isActive) return null;

  return {
    uid: user.uid,
    email: user.email ?? profile.email,
    fullName: profile.fullName || user.displayName || user.email || 'User',
    role: profile.role,
    isActive: true,
  };
}

const auth: AuthAdapter = {
  onAuthStateChanged(callback) {
    return onFirebaseAuthStateChanged(getFirebaseAuth(), (user) => {
      if (!user) {
        callback(null);
        return;
      }
      void toAuthUser(user)
        .then(async (principal) => {
          if (!principal) {
            await firebaseSignOut(getFirebaseAuth());
            callback(null);
            return;
          }
          callback(principal);
        })
        .catch(() => callback(null));
    });
  },

  async signIn(email, password) {
    return guard('Unable to sign in. Please try again.', async () => {
      const credential = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        email.trim(),
        password,
      );
      const principal = await toAuthUser(credential.user);
      if (!principal) {
        await firebaseSignOut(getFirebaseAuth());
        throw new AppError(
          'account-disabled',
          'This account is deactivated or has not been set up. Contact your administrator.',
        );
      }
      return principal;
    });
  },

  async signOut() {
    await firebaseSignOut(getFirebaseAuth());
  },

  async sendPasswordReset(email) {
    await guard('Unable to send the reset email. Please try again.', async () => {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim());
    });
  },
};

function requireUid(): string {
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new AppError('unauthenticated', 'You are signed out. Please sign in again.');
  return user.uid;
}

/* -------------------------------------------------------------------------- */
/* Cursor handling                                                            */
/* -------------------------------------------------------------------------- */

/**
 * `startAfter` needs the snapshot of the last row, which cannot be serialised
 * into a URL. Snapshots are held here and referenced by an opaque token.
 */
const cursorStore = new Map<string, QueryDocumentSnapshot<DocumentData>>();
let cursorSeq = 0;

function storeCursor(snapshot: QueryDocumentSnapshot<DocumentData>): string {
  cursorSeq += 1;
  const token = `cursor_${cursorSeq}`;
  cursorStore.set(token, snapshot);
  // Keep the map small; only recent pages are ever resumed.
  if (cursorStore.size > 50) {
    const oldest = cursorStore.keys().next().value;
    if (oldest) cursorStore.delete(oldest);
  }
  return token;
}

/* -------------------------------------------------------------------------- */
/* Customers                                                                  */
/* -------------------------------------------------------------------------- */

function customerToFirestore(input: CustomerInput, uid: string, isCreate: boolean): DocumentData {
  const name = input.name.trim();
  const base: DocumentData = {
    name,
    nameLower: name.toLowerCase(),
    phone: input.phone,
    alternatePhone: input.alternatePhone,
    dateOfBirth: toFirestoreDate(input.dateOfBirth),
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
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  if (isCreate) {
    base.createdAt = serverTimestamp();
    base.createdBy = uid;
    base.isActive = true;
    base.visitCount = 0;
    base.lastVisitAt = null;
  }
  return base;
}

function visitToFirestore(
  input: VisitInput,
  uid: string,
  codes: { visitCode: string; orders: OrderInput[]; services: ServiceInput[] },
  isCreate: boolean,
): DocumentData {
  const base: DocumentData = {
    visitCode: codes.visitCode,
    visitDate: Timestamp.fromDate(input.visitDate),
    visitType: input.visitType,
    prescription: input.prescription,
    orders: codes.orders.map((order) =>
      orderToFirestore({ ...order, id: order.id ?? '', orderCode: order.orderCode ?? '' }),
    ),
    services: codes.services.map((job) =>
      serviceToFirestore({ ...job, id: job.id ?? '', serviceCode: job.serviceCode ?? '' }),
    ),
    notes: input.notes,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  };
  if (isCreate) {
    base.createdAt = serverTimestamp();
    base.createdBy = uid;
  }
  return base;
}

/** Reserves the next value of a counter inside an open transaction. */
async function reserveCode(
  transaction: Transaction,
  counterName: string,
  prefix: string,
  width: number,
): Promise<string> {
  const ref = doc(getDb(), paths.counter(counterName));
  const snapshot = await transaction.get(ref);
  const current = snapshot.exists() ? Number(snapshot.data().value ?? 0) : 0;
  const next = current + 1;
  transaction.set(ref, { value: next, updatedAt: serverTimestamp() }, { merge: true });
  return `${prefix}-${`${next}`.padStart(width, '0')}`;
}

function localId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

const customers: CustomersAdapter = {
  async list(filters): Promise<Page<Customer>> {
    return guard('Unable to load customers.', async () => {
      const term = (filters.search ?? '').trim();
      const pageSize = filters.pageSize ?? 20;
      const status = filters.status ?? 'active';

      if (term) {
        const found = await searchCustomers(term, status, pageSize);
        return { items: found, nextCursor: null };
      }

      const constraints = [];
      if (status !== 'all') constraints.push(where('isActive', '==', status === 'active'));
      constraints.push(orderBy('lastVisitAt', 'desc'));
      if (filters.cursor) {
        const snapshot = cursorStore.get(filters.cursor);
        if (snapshot) constraints.push(startAfter(snapshot));
      }
      constraints.push(limitTo(pageSize));

      const snapshot = await getDocs(query(collection(getDb(), paths.customers), ...constraints));
      const lastDoc = snapshot.docs[snapshot.docs.length - 1];
      return {
        items: snapshot.docs.map(customerFromDoc),
        nextCursor:
          snapshot.docs.length === pageSize && lastDoc ? storeCursor(lastDoc) : null,
      };
    });
  },

  async getById(customerId) {
    return guard('Unable to load this customer.', async () => {
      const snapshot = await getDoc(doc(getDb(), paths.customer(customerId)));
      if (!snapshot.exists()) return null;
      return customerFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
    });
  },

  async quickSearch(term, limit = 8) {
    if (term.trim().length < 2) return [];
    return guard('Unable to search customers.', async () => searchCustomers(term, 'active', limit));
  },

  async findPossibleDuplicates(input) {
    return guard('Unable to check for existing customers.', async () => {
      const phone = input.phone.replace(/\D/g, '');
      const name = input.name.trim().toLowerCase();
      const matches = new Map<string, DuplicateMatch>();

      if (phone.length >= 10) {
        const byPhone = await getDocs(
          query(
            collection(getDb(), paths.customers),
            where('isActive', '==', true),
            where('phone', '==', phone),
            limitTo(5),
          ),
        );
        for (const snapshot of byPhone.docs) {
          const record = customerFromDoc(snapshot);
          matches.set(record.id, {
            customer: record,
            reason: record.nameLower === name ? 'name_and_phone' : 'phone',
          });
        }
      }

      if (name.length >= 3) {
        const byName = await getDocs(
          query(
            collection(getDb(), paths.customers),
            where('isActive', '==', true),
            where('nameLower', '==', name),
            limitTo(5),
          ),
        );
        for (const snapshot of byName.docs) {
          const record = customerFromDoc(snapshot);
          if (!matches.has(record.id)) matches.set(record.id, { customer: record, reason: 'name' });
        }
      }

      const weight = { name_and_phone: 0, phone: 1, name: 2 } as const;
      return [...matches.values()].sort((a, b) => weight[a.reason] - weight[b.reason]);
    });
  },

  async createWithInitialVisit(input, initialVisit) {
    const uid = requireUid();
    return guard('Unable to save this customer. Please try again.', async () => {
      const result = await runTransaction(getDb(), async (transaction) => {
        // All reads must precede writes inside a Firestore transaction.
        const customerCode = await reserveCode(transaction, 'customer', 'CUST', 6);
        const visitCode = await reserveCode(transaction, 'visit', 'VISIT', 6);

        const orderCodes: OrderInput[] = [];
        for (const order of initialVisit.orders) {
          orderCodes.push({
            ...order,
            id: order.id ?? localId('ord'),
            orderCode: order.orderCode ?? (await reserveCode(transaction, 'order', 'ORD', 5)),
          });
        }
        const serviceCodes: ServiceInput[] = [];
        for (const job of initialVisit.services) {
          serviceCodes.push({
            ...job,
            id: job.id ?? localId('srv'),
            serviceCode: job.serviceCode ?? (await reserveCode(transaction, 'service', 'SRV', 5)),
          });
        }

        const customerRef = doc(getDb(), paths.customer(customerCode));
        const visitRef = doc(getDb(), paths.visit(customerCode, visitCode));

        transaction.set(customerRef, {
          ...customerToFirestore(input, uid, true),
          customerCode,
          visitCount: 1,
          lastVisitAt: Timestamp.fromDate(initialVisit.visitDate),
        });
        transaction.set(
          visitRef,
          visitToFirestore(
            initialVisit,
            uid,
            { visitCode, orders: orderCodes, services: serviceCodes },
            true,
          ),
        );

        return { customerCode, visitCode };
      });

      const [customerSnap, visitSnap] = await Promise.all([
        getDoc(doc(getDb(), paths.customer(result.customerCode))),
        getDoc(doc(getDb(), paths.visit(result.customerCode, result.visitCode))),
      ]);
      return {
        customer: customerFromDoc(customerSnap as QueryDocumentSnapshot<DocumentData>),
        visit: visitFromDoc(
          visitSnap as QueryDocumentSnapshot<DocumentData>,
          result.customerCode,
        ),
      };
    });
  },

  async update(customerId, input) {
    const uid = requireUid();
    return guard('Unable to save changes. Please try again.', async () => {
      const ref = doc(getDb(), paths.customer(customerId));
      await runTransaction(getDb(), async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new AppError('not-found', 'Customer not found.');
        transaction.update(ref, customerToFirestore(input, uid, false));
      });
      const updated = await getDoc(ref);
      return customerFromDoc(updated as QueryDocumentSnapshot<DocumentData>);
    });
  },

  async setActive(customerId, isActive) {
    const uid = requireUid();
    return guard('Unable to update this customer.', async () => {
      const ref = doc(getDb(), paths.customer(customerId));
      await runTransaction(getDb(), async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new AppError('not-found', 'Customer not found.');
        transaction.update(ref, { isActive, updatedAt: serverTimestamp(), updatedBy: uid });
      });
      const updated = await getDoc(ref);
      return customerFromDoc(updated as QueryDocumentSnapshot<DocumentData>);
    });
  },

  async getRelated(customerId) {
    return guard('Unable to load family members.', async () => {
      const snapshot = await getDoc(doc(getDb(), paths.customer(customerId)));
      if (!snapshot.exists()) return [];
      const record = customerFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
      const related: RelatedCustomer[] = [];

      if (record.customerType === 'family_member' && record.primaryCustomerId) {
        const primarySnap = await getDoc(doc(getDb(), paths.customer(record.primaryCustomerId)));
        if (primarySnap.exists()) {
          related.push({
            customer: customerFromDoc(primarySnap as QueryDocumentSnapshot<DocumentData>),
            relationship: record.relationship ?? 'other',
            relationshipNote: record.relationshipNote,
            isPrimary: true,
          });
        }
        const siblings = await getDocs(
          query(
            collection(getDb(), paths.customers),
            where('primaryCustomerId', '==', record.primaryCustomerId),
          ),
        );
        for (const sibling of siblings.docs) {
          if (sibling.id === record.id) continue;
          const value = customerFromDoc(sibling);
          related.push({
            customer: value,
            relationship: value.relationship ?? 'other',
            relationshipNote: value.relationshipNote,
            isPrimary: false,
          });
        }
      } else {
        const members = await getDocs(
          query(
            collection(getDb(), paths.customers),
            where('primaryCustomerId', '==', record.id),
          ),
        );
        for (const member of members.docs) {
          const value = customerFromDoc(member);
          related.push({
            customer: value,
            relationship: value.relationship ?? 'other',
            relationshipNote: value.relationshipNote,
            isPrimary: false,
          });
        }
      }
      return related;
    });
  },

  async linkFamilyMember({ primaryCustomerId, memberCustomerId, relationship, relationshipNote }) {
    const uid = requireUid();
    if (primaryCustomerId === memberCustomerId) {
      throw new AppError('invalid-argument', 'A customer cannot be their own family member.');
    }
    await guard('Unable to link this family member.', async () => {
      const memberRef = doc(getDb(), paths.customer(memberCustomerId));
      const primaryRef = doc(getDb(), paths.customer(primaryCustomerId));
      await runTransaction(getDb(), async (transaction) => {
        const [memberSnap, primarySnap] = await Promise.all([
          transaction.get(memberRef),
          transaction.get(primaryRef),
        ]);
        if (!memberSnap.exists() || !primarySnap.exists()) {
          throw new AppError('not-found', 'Customer not found.');
        }
        transaction.update(memberRef, {
          customerType: 'family_member',
          primaryCustomerId,
          relationship,
          relationshipNote,
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
        transaction.update(primaryRef, {
          customerType: 'primary',
          primaryCustomerId: null,
          relationship: null,
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
      });
    });
  },

  async unlinkFamilyMember(memberCustomerId) {
    const uid = requireUid();
    await guard('Unable to remove this relationship.', async () => {
      const ref = doc(getDb(), paths.customer(memberCustomerId));
      await runTransaction(getDb(), async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new AppError('not-found', 'Customer not found.');
        transaction.update(ref, {
          customerType: 'primary',
          primaryCustomerId: null,
          relationship: null,
          relationshipNote: null,
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
      });
    });
  },
};

/**
 * Server-side search over the three indexed fields. Nothing downloads the whole
 * collection: each branch is a bounded, indexed query.
 */
/**
 * Sentinel that closes a Firestore prefix range: every string beginning with
 * `p` sorts between `p` and `p + PREFIX_END`.
 */
const PREFIX_END = '\uf8ff';

async function searchCustomers(
  term: string,
  status: 'active' | 'inactive' | 'all',
  max: number,
): Promise<Customer[]> {
  const trimmed = term.trim();
  const lower = trimmed.toLowerCase();
  const digits = trimmed.replace(/\D/g, '');
  const results = new Map<string, Customer>();
  const base = collection(getDb(), paths.customers);
  const activeFilter =
    status === 'all' ? [] : [where('isActive', '==', status === 'active')];

  // 1. Customer code, exact or by document-id prefix.
  if (/^cust/i.test(trimmed)) {
    const upper = trimmed.toUpperCase();
    const byCode = await getDocs(
      query(
        base,
        orderBy(documentId()),
        where(documentId(), '>=', upper),
        where(documentId(), '<=', `${upper}${PREFIX_END}`),
        limitTo(max),
      ),
    );
    for (const snapshot of byCode.docs) {
      const record = customerFromDoc(snapshot);
      if (status !== 'all' && record.isActive !== (status === 'active')) continue;
      results.set(record.id, record);
    }
  }

  // 2. Phone prefix.
  if (digits.length >= 3) {
    const byPhone = await getDocs(
      query(
        base,
        ...activeFilter,
        orderBy('phone'),
        where('phone', '>=', digits),
        where('phone', '<=', `${digits}${PREFIX_END}`),
        limitTo(max),
      ),
    );
    for (const snapshot of byPhone.docs) results.set(snapshot.id, customerFromDoc(snapshot));
  }

  // 3. Name prefix.
  if (lower.length >= 2 && !/^\d+$/.test(lower)) {
    const byName = await getDocs(
      query(
        base,
        ...activeFilter,
        orderBy('nameLower'),
        where('nameLower', '>=', lower),
        where('nameLower', '<=', `${lower}${PREFIX_END}`),
        limitTo(max),
      ),
    );
    for (const snapshot of byName.docs) results.set(snapshot.id, customerFromDoc(snapshot));
  }

  return [...results.values()].slice(0, max);
}

/* -------------------------------------------------------------------------- */
/* Visits                                                                     */
/* -------------------------------------------------------------------------- */

const visits: VisitsAdapter = {
  async listByCustomer(customerId, limit = 50) {
    return guard('Unable to load visit history.', async () => {
      const snapshot = await getDocs(
        query(
          collection(getDb(), paths.visits(customerId)),
          orderBy('visitDate', 'desc'),
          limitTo(limit),
        ),
      );
      return snapshot.docs.map((entry) => visitFromDoc(entry, customerId));
    });
  },

  async getById(customerId, visitId) {
    return guard('Unable to load this visit.', async () => {
      const snapshot = await getDoc(doc(getDb(), paths.visit(customerId, visitId)));
      if (!snapshot.exists()) return null;
      return visitFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>, customerId);
    });
  },

  async create(customerId, input) {
    const uid = requireUid();
    return guard('Unable to save this visit. Please try again.', async () => {
      const customerRef = doc(getDb(), paths.customer(customerId));

      const visitCode = await runTransaction(getDb(), async (transaction) => {
        const customerSnap = await transaction.get(customerRef);
        if (!customerSnap.exists()) throw new AppError('not-found', 'Customer not found.');

        const code = await reserveCode(transaction, 'visit', 'VISIT', 6);
        const orderCodes: OrderInput[] = [];
        for (const order of input.orders) {
          orderCodes.push({
            ...order,
            id: order.id ?? localId('ord'),
            orderCode: order.orderCode ?? (await reserveCode(transaction, 'order', 'ORD', 5)),
          });
        }
        const serviceCodes: ServiceInput[] = [];
        for (const job of input.services) {
          serviceCodes.push({
            ...job,
            id: job.id ?? localId('srv'),
            serviceCode: job.serviceCode ?? (await reserveCode(transaction, 'service', 'SRV', 5)),
          });
        }

        const currentCount = Number(customerSnap.data().visitCount ?? 0);
        const currentLast = customerSnap.data().lastVisitAt as Timestamp | null | undefined;
        const isNewer = !currentLast || input.visitDate > currentLast.toDate();

        transaction.set(
          doc(getDb(), paths.visit(customerId, code)),
          visitToFirestore(
            input,
            uid,
            { visitCode: code, orders: orderCodes, services: serviceCodes },
            true,
          ),
        );
        transaction.update(customerRef, {
          visitCount: currentCount + 1,
          lastVisitAt: isNewer ? Timestamp.fromDate(input.visitDate) : currentLast ?? null,
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
        return code;
      });

      const created = await getDoc(doc(getDb(), paths.visit(customerId, visitCode)));
      return visitFromDoc(created as QueryDocumentSnapshot<DocumentData>, customerId);
    });
  },

  async update(customerId, visitId, input) {
    const uid = requireUid();
    return guard('Unable to save changes to this visit.', async () => {
      const visitRef = doc(getDb(), paths.visit(customerId, visitId));
      await runTransaction(getDb(), async (transaction) => {
        const snapshot = await transaction.get(visitRef);
        if (!snapshot.exists()) throw new AppError('not-found', 'Visit not found.');
        const existing = visitFromDoc(
          snapshot as QueryDocumentSnapshot<DocumentData>,
          customerId,
        );

        const orderCodes: OrderInput[] = [];
        for (const order of input.orders) {
          orderCodes.push({
            ...order,
            id: order.id ?? localId('ord'),
            orderCode: order.orderCode ?? (await reserveCode(transaction, 'order', 'ORD', 5)),
          });
        }
        const serviceCodes: ServiceInput[] = [];
        for (const job of input.services) {
          serviceCodes.push({
            ...job,
            id: job.id ?? localId('srv'),
            serviceCode: job.serviceCode ?? (await reserveCode(transaction, 'service', 'SRV', 5)),
          });
        }

        transaction.update(
          visitRef,
          visitToFirestore(
            input,
            uid,
            { visitCode: existing.visitCode, orders: orderCodes, services: serviceCodes },
            false,
          ),
        );
      });

      const updated = await getDoc(visitRef);
      return visitFromDoc(updated as QueryDocumentSnapshot<DocumentData>, customerId);
    });
  },

  async setOrderStatus({ customerId, visitId, orderId, status }) {
    const uid = requireUid();
    return guard('Unable to update the order status.', async () => {
      const ref = doc(getDb(), paths.visit(customerId, visitId));
      await runTransaction(getDb(), async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new AppError('not-found', 'Visit not found.');
        const visit = visitFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>, customerId);
        const orders = visit.orders.map((order) => {
          if (order.id !== orderId) return order;
          if (order.status !== status && !canTransitionOrder(order.status, status)) {
            throw new AppError(
              'invalid-argument',
              `An order cannot move from ${order.status} to ${status}.`,
            );
          }
          return {
            ...order,
            status,
            deliveredDate: status === 'delivered' ? new Date() : null,
          };
        });
        transaction.update(ref, {
          orders: orders.map(orderToFirestore),
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
      });
      const updated = await getDoc(ref);
      return visitFromDoc(updated as QueryDocumentSnapshot<DocumentData>, customerId);
    });
  },

  async setServiceStatus({ customerId, visitId, serviceId, status }) {
    const uid = requireUid();
    return guard('Unable to update the service status.', async () => {
      const ref = doc(getDb(), paths.visit(customerId, visitId));
      await runTransaction(getDb(), async (transaction) => {
        const snapshot = await transaction.get(ref);
        if (!snapshot.exists()) throw new AppError('not-found', 'Visit not found.');
        const visit = visitFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>, customerId);
        const services = visit.services.map((job) => {
          if (job.id !== serviceId) return job;
          if (job.status !== status && !canTransitionService(job.status, status)) {
            throw new AppError(
              'invalid-argument',
              `A service cannot move from ${job.status} to ${status}.`,
            );
          }
          return {
            ...job,
            status,
            deliveredDate: status === 'delivered' ? new Date() : null,
          };
        });
        transaction.update(ref, {
          services: services.map(serviceToFirestore),
          updatedAt: serverTimestamp(),
          updatedBy: uid,
        });
      });
      const updated = await getDoc(ref);
      return visitFromDoc(updated as QueryDocumentSnapshot<DocumentData>, customerId);
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Employees — profile writes are admin-only in the Security Rules            */
/* -------------------------------------------------------------------------- */

async function readUserProfile(userId: string): Promise<UserProfile> {
  const snapshot = await getDoc(doc(getDb(), paths.user(userId)));
  if (!snapshot.exists()) throw new AppError('not-found', 'Employee profile not found.');
  return userFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
}

async function updateUserProfile(userId: string, fields: DocumentData): Promise<UserProfile> {
  const uid = requireUid();
  await updateDoc(doc(getDb(), paths.user(userId)), {
    ...fields,
    updatedAt: serverTimestamp(),
    updatedBy: uid,
  });
  return readUserProfile(userId);
}

const employees: EmployeesAdapter = {
  async list() {
    return guard('Unable to load employees.', async () => {
      const snapshot = await getDocs(
        query(collection(getDb(), paths.users), orderBy('createdAt', 'desc')),
      );
      return snapshot.docs.map(userFromDoc);
    });
  },

  async getById(userId) {
    return guard('Unable to load this employee.', async () => {
      const snapshot = await getDoc(doc(getDb(), paths.user(userId)));
      if (!snapshot.exists()) return null;
      return userFromDoc(snapshot as QueryDocumentSnapshot<DocumentData>);
    });
  },

  async create(input) {
    return guard('Unable to create this employee.', async () => {
      const callerUid = requireUid();
      const fullName = input.fullName.trim();
      const email = input.email.trim().toLowerCase();

      // The new account is created and signed in on a throwaway Auth instance,
      // so the admin stays signed in here.
      return withSecondaryAuth(async (secondaryAuth) => {
        const credential = await createUserWithEmailAndPassword(
          secondaryAuth,
          email,
          input.password,
        );
        const newUid = credential.user.uid;

        try {
          await setDoc(doc(getDb(), paths.user(newUid)), {
            fullName,
            email,
            role: input.role,
            isActive: true,
            createdAt: serverTimestamp(),
            createdBy: callerUid,
            updatedAt: serverTimestamp(),
            updatedBy: callerUid,
          });
        } catch (error) {
          // Roll back so the email is not left taken by an account with no
          // profile. The new user is still signed in on the throwaway instance,
          // which is what allows it to delete itself.
          await deleteUser(credential.user).catch(() => undefined);
          throw error;
        }

        return readUserProfile(newUid);
      });
    });
  },

  async setActive(userId, isActive) {
    return guard('Unable to update this employee.', async () => {
      if (userId === requireUid() && !isActive) {
        throw new AppError('invalid-argument', 'You cannot deactivate your own account.');
      }
      return updateUserProfile(userId, { isActive });
    });
  },

  async setRole(userId, role) {
    return guard('Unable to update this role.', async () => {
      if (userId === requireUid() && role !== 'admin') {
        throw new AppError('invalid-argument', 'You cannot remove your own admin access.');
      }
      return updateUserProfile(userId, { role });
    });
  },
};

/* -------------------------------------------------------------------------- */
/* Dashboard and directory                                                    */
/* -------------------------------------------------------------------------- */

const dashboard: DashboardAdapter = {
  async getSummary(): Promise<DashboardSummary> {
    return guard('Unable to load the dashboard.', async () => {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfWeek.getDate() - 7);

      // A collection-group count keeps each card to one indexed aggregate read.
      const [todays, newCustomers] = await Promise.all([
        getCountFromServer(
          query(
            collectionGroup(getDb(), 'visits'),
            where('visitDate', '>=', Timestamp.fromDate(startOfToday)),
          ),
        ),
        getCountFromServer(
          query(
            collection(getDb(), paths.customers),
            where('isActive', '==', true),
            where('createdAt', '>=', Timestamp.fromDate(startOfWeek)),
          ),
        ),
      ]);

      // Order/service statuses live inside arrays, so they are counted from a
      // bounded window of recent visits rather than a full scan.
      const recent = await getDocs(
        query(collectionGroup(getDb(), 'visits'), orderBy('visitDate', 'desc'), limitTo(200)),
      );
      let pendingOrders = 0;
      let servicesReady = 0;
      for (const snapshot of recent.docs) {
        const visit = visitFromDoc(snapshot, snapshot.ref.parent.parent?.id ?? '');
        for (const order of visit.orders) {
          if (order.status === 'pending' || order.status === 'in_progress') pendingOrders += 1;
        }
        for (const job of visit.services) {
          if (job.status === 'ready') servicesReady += 1;
        }
      }

      return {
        todaysVisits: todays.data().count,
        newCustomersThisWeek: newCustomers.data().count,
        pendingOrders,
        servicesReady,
      };
    });
  },

  async getRecentVisits(limit = 6) {
    return guard('Unable to load recent activity.', async () => {
      const snapshot = await getDocs(
        query(collectionGroup(getDb(), 'visits'), orderBy('visitDate', 'desc'), limitTo(limit)),
      );

      const results: Array<{ visit: Visit; customer: Customer }> = [];
      for (const entry of snapshot.docs) {
        const customerId = entry.ref.parent.parent?.id;
        if (!customerId) continue;
        const customerSnap = await getDoc(doc(getDb(), paths.customer(customerId)));
        if (!customerSnap.exists()) continue;
        results.push({
          visit: visitFromDoc(entry, customerId),
          customer: customerFromDoc(customerSnap as QueryDocumentSnapshot<DocumentData>),
        });
      }
      return results;
    });
  },
};

let directoryCache: Record<string, string> | null = null;

const directory: DirectoryAdapter = {
  async getUserNames() {
    if (directoryCache) return directoryCache;
    try {
      const snapshot = await getDocs(collection(getDb(), paths.users));
      const names: Record<string, string> = {};
      for (const entry of snapshot.docs) names[entry.id] = userFromDoc(entry).fullName;
      directoryCache = names;
      return names;
    } catch {
      // Employees may only read their own profile; fall back to raw UIDs.
      return {};
    }
  },
};

export const firebaseProvider: DataProvider = {
  auth,
  customers,
  visits,
  employees,
  dashboard,
  directory,
};
