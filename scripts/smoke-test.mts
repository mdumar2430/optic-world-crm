/**
 * Temporary runtime check of the mock data layer.
 * Run with: npm run smoke
 */

// Minimal browser shims: the mock store persists to localStorage and uses
// window timers to simulate latency.
const store = new Map<string, string>();
const globals = globalThis as unknown as { window: unknown };
globals.window = {
  localStorage: {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  },
  setTimeout: (fn: () => void, ms?: number) => setTimeout(fn, ms),
  clearTimeout: (id: number) => clearTimeout(id),
};

const { mockProvider: p } = await import('../src/services/mock/provider');

let failures = 0;

function assert(condition: unknown, message: string): void {
  if (condition) {
    console.log(`  ok    ${message}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${message}`);
  }
}

function section(name: string): void {
  console.log(`\n${name}`);
}

async function main(): Promise<void> {
  section('Authentication');
  const admin = await p.auth.signIn('admin@opticworld.in', 'Admin@123');
  assert(admin.role === 'admin', 'admin signs in with the admin role');

  const employee = await p.auth.signIn('priya@opticworld.in', 'Staff@123');
  assert(employee.role === 'employee', 'employee signs in with the employee role');

  let rejected = false;
  await p.auth.signIn('deepa@opticworld.in', 'Staff@123').catch(() => {
    rejected = true;
  });
  assert(rejected, 'a deactivated employee cannot sign in');

  let wrongPassword = false;
  await p.auth.signIn('priya@opticworld.in', 'nope').catch(() => {
    wrongPassword = true;
  });
  assert(wrongPassword, 'a wrong password is rejected');

  section('Employee permissions (signed in as an employee)');
  await p.auth.signIn('priya@opticworld.in', 'Staff@123');

  let denied = '';
  await p.employees.list().catch((error) => {
    denied = error.code;
  });
  assert(denied === 'permission-denied', 'an employee is denied the employee list');

  denied = '';
  await p.employees
    .create({ fullName: 'Sneaky', email: 'x@y.in', password: 'Passw0rd1', role: 'admin' })
    .catch((error) => {
      denied = error.code;
    });
  assert(denied === 'permission-denied', 'an employee cannot create an employee');

  denied = '';
  await p.customers.setActive('CUST-000012', false).catch((error) => {
    denied = error.code;
  });
  assert(denied === 'permission-denied', 'an employee cannot deactivate a customer');

  section('Customer list and search');
  const page = await p.customers.list({ status: 'active', pageSize: 20 });
  assert(page.items.length === 12, `active list holds 12 customers (got ${page.items.length})`);
  assert(page.items.every((c) => c.isActive), 'every listed customer is active');
  assert(
    !page.items.some((c) => c.customerCode === 'CUST-000013'),
    'the soft-deleted customer is hidden from employees',
  );

  const byName = await p.customers.list({ search: 'ahmed' });
  assert(byName.items[0]?.customerCode === 'CUST-000001', 'name search finds Ahmed Khan');

  const byPhone = await p.customers.list({ search: '9840012345' });
  assert(
    byPhone.items.some((c) => c.customerCode === 'CUST-000005'),
    'phone search finds Ramesh Iyer',
  );

  const byCode = await p.customers.list({ search: 'CUST-000003' });
  assert(byCode.items[0]?.name === 'Ali Khan', 'customer-ID search finds Ali Khan');

  const paged = await p.customers.list({ status: 'active', pageSize: 5 });
  assert(paged.items.length === 5 && paged.nextCursor !== null, 'pagination returns a cursor');
  const second = await p.customers.list({ status: 'active', pageSize: 5, cursor: paged.nextCursor });
  assert(
    second.items.every((c) => !paged.items.some((first) => first.id === c.id)),
    'the second page does not repeat the first',
  );

  section('Family relationships');
  const ahmedFamily = await p.customers.getRelated('CUST-000001');
  assert(ahmedFamily.length === 3, `Ahmed has 3 family members (got ${ahmedFamily.length})`);

  const aliRelations = await p.customers.getRelated('CUST-000003');
  const aliPrimary = aliRelations.find((r) => r.isPrimary);
  assert(aliPrimary?.customer.name === 'Ahmed Khan', 'Ali resolves back to Ahmed as primary');
  assert(aliRelations.filter((r) => !r.isPrimary).length === 2, 'Ali also sees his two siblings');

  const ahmedVisits = await p.visits.listByCustomer('CUST-000001');
  const aliVisits = await p.visits.listByCustomer('CUST-000003');
  assert(ahmedVisits.length === 4, `Ahmed keeps his own 4 visits (got ${ahmedVisits.length})`);
  assert(aliVisits.length === 2, `Ali keeps his own 2 visits (got ${aliVisits.length})`);
  assert(
    aliVisits.every((v) => v.customerId === 'CUST-000003'),
    'a family member history is never merged into the primary',
  );
  assert(
    (ahmedVisits[0]?.visitDate.getTime() ?? 0) >= (ahmedVisits[1]?.visitDate.getTime() ?? 0),
    'visits are ordered newest first',
  );

  section('Duplicate detection');
  const dupes = await p.customers.findPossibleDuplicates({
    name: 'Ahmed Khan',
    phone: '9876543210',
  });
  assert(dupes.length >= 1, 'a matching name and phone is flagged');
  assert(dupes[0]?.reason === 'name_and_phone', 'the strongest match ranks first');

  const sharedPhone = await p.customers.findPossibleDuplicates({
    name: 'Someone New',
    phone: '9876543210',
  });
  assert(
    sharedPhone.length > 0 && sharedPhone.every((m) => m.reason === 'phone'),
    'a shared household phone warns but is only a phone match',
  );

  section('Creating a customer with an initial visit');
  const beforeCount = (await p.customers.list({ pageSize: 50 })).items.length;
  const created = await p.customers.createWithInitialVisit(
    {
      name: 'Test Person',
      phone: '9000000001',
      alternatePhone: '',
      dateOfBirth: null,
      age: 30,
      gender: 'other',
      address: { line1: '', line2: '', city: '', state: '', postalCode: '' },
      hospital: '',
      referredBy: '',
      referralDetails: '',
      notes: '',
      customerType: 'primary',
      primaryCustomerId: null,
      relationship: null,
      relationshipNote: null,
    },
    {
      visitDate: new Date(),
      visitType: 'consultation',
      notes: 'First visit',
      prescription: null,
      orders: [],
      services: [],
    },
  );
  assert(
    created.customer.customerCode === 'CUST-000014',
    `the code comes from the counter (got ${created.customer.customerCode})`,
  );
  assert(created.customer.visitCount === 1, 'the initial visit is counted on the customer');
  assert(created.visit.customerId === created.customer.id, 'the visit attaches to the customer');
  assert(
    (await p.customers.list({ pageSize: 50 })).items.length === beforeCount + 1,
    'the new customer appears in the list',
  );

  const another = await p.customers.createWithInitialVisit(
    {
      name: 'Test Two',
      phone: '9000000002',
      alternatePhone: '',
      dateOfBirth: null,
      age: null,
      gender: null,
      address: { line1: '', line2: '', city: '', state: '', postalCode: '' },
      hospital: '',
      referredBy: '',
      referralDetails: '',
      notes: '',
      customerType: 'primary',
      primaryCustomerId: null,
      relationship: null,
      relationshipNote: null,
    },
    {
      visitDate: new Date(),
      visitType: 'consultation',
      notes: '',
      prescription: null,
      orders: [],
      services: [],
    },
  );
  assert(another.customer.customerCode === 'CUST-000015', 'customer codes are never reused');

  section('Adding a visit to an existing customer');
  const graceBefore = await p.customers.getById('CUST-000012');
  await p.visits.create('CUST-000012', {
    visitDate: new Date(),
    visitType: 'service',
    notes: 'Walk-in repair',
    prescription: null,
    orders: [],
    services: [
      {
        serviceType: 'cleaning',
        description: 'Ultrasonic clean',
        charge: 0,
        paymentStatus: 'paid',
        expectedReadyDate: null,
        deliveredDate: null,
        status: 'received',
        notes: '',
      },
    ],
  });
  const graceAfter = await p.customers.getById('CUST-000012');
  assert(
    (graceAfter?.visitCount ?? 0) === (graceBefore?.visitCount ?? 0) + 1,
    'the visit count increments',
  );
  const graceVisits = await p.visits.listByCustomer('CUST-000012');
  assert(
    graceVisits[0]?.services[0]?.serviceCode?.startsWith('SRV-') === true,
    'the new service gets a generated service code',
  );

  section('Order and service status transitions');
  const rameshVisits = await p.visits.listByCustomer('CUST-000005');
  const pendingVisit = rameshVisits.find((v) => v.orders.some((o) => o.status === 'pending'));
  const pendingOrder = pendingVisit?.orders.find((o) => o.status === 'pending');
  assert(pendingVisit !== undefined && pendingOrder !== undefined, 'a pending order exists in the seed');

  if (pendingVisit && pendingOrder) {
    let badTransition = '';
    await p.visits
      .setOrderStatus({
        customerId: 'CUST-000005',
        visitId: pendingVisit.id,
        orderId: pendingOrder.id,
        status: 'delivered',
      })
      .catch((error) => {
        badTransition = error.code;
      });
    assert(badTransition === 'invalid-argument', 'pending to delivered is rejected');

    const moved = await p.visits.setOrderStatus({
      customerId: 'CUST-000005',
      visitId: pendingVisit.id,
      orderId: pendingOrder.id,
      status: 'in_progress',
    });
    assert(
      moved.orders.find((o) => o.id === pendingOrder.id)?.status === 'in_progress',
      'pending to in progress is allowed',
    );
  }

  section('Admin-only actions');
  await p.auth.signIn('admin@opticworld.in', 'Admin@123');

  const staff = await p.employees.list();
  assert(staff.length === 4, `an admin sees all 4 staff accounts (got ${staff.length})`);
  assert(
    staff.every((entry) => !Object.prototype.hasOwnProperty.call(entry, 'password')),
    'passwords are never returned to the client',
  );

  const newStaff = await p.employees.create({
    fullName: 'New Starter',
    email: 'new@opticworld.in',
    password: 'Passw0rd1',
    role: 'employee',
  });
  assert(newStaff.role === 'employee', 'an admin can create an employee');
  const signedInNew = await p.auth.signIn('new@opticworld.in', 'Passw0rd1');
  assert(signedInNew.uid === newStaff.id, 'the new employee can sign in');

  await p.auth.signIn('admin@opticworld.in', 'Admin@123');
  let selfDeactivate = '';
  await p.employees.setActive(staff.find((s) => s.role === 'admin')!.id, false).catch((error) => {
    selfDeactivate = error.code;
  });
  assert(selfDeactivate === 'invalid-argument', 'an admin cannot deactivate their own account');

  section('Soft delete');
  const deactivated = await p.customers.setActive('CUST-000012', false);
  assert(deactivated.isActive === false, 'an admin can deactivate a customer');
  const historyKept = await p.visits.listByCustomer('CUST-000012');
  assert(historyKept.length > 0, 'deactivating preserves the visit history');
  const activeNow = await p.customers.list({ status: 'active', pageSize: 50 });
  assert(
    !activeNow.items.some((c) => c.id === 'CUST-000012'),
    'the deactivated customer leaves the active list',
  );
  const inactiveNow = await p.customers.list({ status: 'inactive', pageSize: 50 });
  assert(
    inactiveNow.items.some((c) => c.id === 'CUST-000012'),
    'an admin can still view inactive customers',
  );
  const restored = await p.customers.setActive('CUST-000012', true);
  assert(restored.isActive === true, 'a customer can be restored');

  section('Dashboard');
  const summary = await p.dashboard.getSummary();
  assert(typeof summary.todaysVisits === 'number', 'the dashboard summary computes');
  assert(summary.pendingOrders >= 0, 'pending orders are counted');
  const recent = await p.dashboard.getRecentVisits(5);
  assert(recent.length === 5, 'recent visits are returned');
  assert(recent[0]?.customer !== undefined, 'recent visits resolve their customer');

  console.log(
    failures === 0
      ? '\nAll smoke checks passed.'
      : `\n${failures} smoke check(s) failed.`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

await main();
