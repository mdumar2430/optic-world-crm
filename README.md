# Optic World — Customer Management (V1)

A customer management system for a single optical store, replacing the shop's
paper customer form. Staff can look a customer up in seconds, see everything
that has ever happened with them, and record new visits, prescriptions, orders
and repairs.

React · TypeScript · Tailwind CSS · React Router · Firebase Auth · Cloud
Firestore · Cloud Functions · Firebase Hosting.

---

## Running the demo (no Firebase needed)

```bash
npm install
npm run dev
```

Open <http://localhost:5173>. The app starts in **demo mode**
(`VITE_DATA_SOURCE=mock` in `.env`), backed by a seeded dataset that lives in
your browser's `localStorage`.

Sign in with either account — the login screen also has a **Use** button for
each:

| Role     | Email                  | Password    |
| -------- | ---------------------- | ----------- |
| Admin    | `admin@opticworld.in`  | `Admin@123` |
| Employee | `priya@opticworld.in`  | `Staff@123` |

### What is in the demo data

13 customers across three families plus four individuals, 23 visits, and four
staff accounts — enough to exercise every screen:

- **The Khans** — Ahmed (`CUST-000001`, primary) with Fatima (spouse), Ali (son)
  and Sara (daughter). Ahmed has four visits going back nine months; Ali has his
  own two, including a frame currently in the workshop.
- **The Iyers** — Ramesh (primary) with Lakshmi and Vignesh. Ramesh has a
  progressive-lens order still `Pending`; Lakshmi has sunglasses `Ready` for
  collection.
- **The Mathews** — Joseph with his mother Anna.
- **Individuals** — Sunita (order in progress), Mohammed Rafi (repairs only),
  Grace Fernandes (new this week), and David Thomas, who is **deactivated** so
  you can see soft delete and the admin-only "Inactive" filter.
- **Deepa Rao** is a deactivated employee whose name still appears as
  "Created by" on older records.

Dates are generated relative to today, so the dashboard always has current
numbers. To start over, clear site data for `localhost:5173` — the dataset
reseeds on the next load.

### Things worth trying

- Search `9876543210` — three Khans share the household phone number.
- Open Ali Khan and note the banner naming **whose** record you are on, plus his
  own independent visit history.
- Create a customer named `Ahmed Khan` with phone `9876543210` — the duplicate
  warning appears but does not block you.
- On Ramesh Iyer's newest visit, try to move the pending order straight to
  Delivered. Only valid next steps are offered.
- Sign in as Priya (employee): no Employees tab, no deactivate button, and no
  Inactive filter.

---

## Connecting a real Firebase project

The Firebase adapter is complete; it just needs a project.

1. **Create the project**, then enable **Authentication → Email/Password** and
   **Cloud Firestore**.

2. **Configure the web app.** Copy `.env.example` to `.env` and fill in the
   `VITE_FIREBASE_*` values from your project's web app config, then set:

   ```bash
   VITE_DATA_SOURCE=firebase
   ```

   These values are identifiers, not secrets — access is enforced by Security
   Rules. A service account key must never appear in this app.

3. **Deploy the rules, indexes and functions.**

   ```bash
   npm install --prefix functions
   firebase deploy --only firestore:rules,firestore:indexes,functions
   ```

4. **Create the first admin.** Add one user in the Firebase console
   (Authentication → Add user), sign in to the app, and call the
   `bootstrapFirstAdmin` callable once. It promotes the caller to admin **only
   while no admin exists**, so it cannot be used to escalate later. Sign out and
   back in to pick up the claim. From then on, every account is created from
   the Employees screen.

5. **Deploy the app.**

   ```bash
   npm run build
   firebase deploy --only hosting
   ```

### Local emulators

Set `VITE_USE_FIREBASE_EMULATORS=true` and run `firebase emulators:start`. The
app connects to Auth on 9099, Firestore on 8080 and Functions on 5001.

---

## Security model

Frontend role checks only decide what to *show*. Every boundary is enforced
again on the server, so an employee who edits the bundle still gets rejected.

**Authorisation comes from a custom claim.** `role` is set on the ID token by
the Admin SDK inside a Cloud Function and is never writable from the client. The
Firestore `users/{uid}` profile mirrors it for display only, and no client may
write to `users` at all — that would be a privilege-escalation path.

**Privileged operations are callables.** `createEmployee`, `setEmployeeActive`
and `setEmployeeRole` each re-verify that the caller is authenticated, holds the
`admin` claim, and is not themselves disabled. Employee creation lives on the
server for a second reason: `createUserWithEmailAndPassword` in the browser
signs the *current* user out, so an admin would be logged out on every save.

**Deactivation revokes access immediately.** The Auth user is disabled and their
refresh tokens revoked, so an existing session dies rather than lasting until
the token expires. Because a deactivated user can no longer get a token,
`firestore.rules` does not need a per-request `get()` on their profile.

**Firestore rules** (`firestore.rules`) enforce that:

- unauthenticated requests read and write nothing;
- employees can read and write customers and visits, but only **active**
  customers — an inactive document fails the read rule, so it is excluded from
  their queries too;
- only an admin can change `isActive`, i.e. soft-delete or restore a customer;
- `customerCode`, `createdAt` and `createdBy` are immutable, so a code is never
  reassigned and authorship cannot be rewritten;
- `createdBy`/`updatedBy` must equal the caller and the timestamps must be the
  server clock;
- customers and visits can never be deleted — history is permanent;
- counters may only ever increment by exactly one, which is what makes
  concurrently generated customer codes unique and non-reusable.

**Known boundary.** Order and service status transitions are validated in the
service layer and constrained by the UI (only reachable statuses are offered),
but not re-checked inside `firestore.rules`, because the statuses live in arrays
inside the visit document and rules cannot iterate them. Rules do enforce *who*
may write a visit and the document's overall shape. If transition legality needs
server enforcement later, the clean fix is a callable for status changes.

---

## Architecture

```
React app
    │
    ├── pages / components        UI only, no Firebase imports
    ├── hooks, context            auth state, toasts, async loading
    │
    └── services/                 the only layer that talks to a backend
         ├── contracts.ts         the data-access interface
         ├── mock/                seeded in-browser dataset
         └── firebase/            Auth, Firestore, callable functions
```

`services/index.ts` picks one implementation at module load based on
`VITE_DATA_SOURCE`. Nothing above that line knows which is in use, which is why
the demo and production behave the same.

The mock adapter deliberately reproduces the real constraints — counter-based
codes, prefix-only search, status transition rules, admin-only employee
management, employees blocked from inactive records — so what you see in the
demo is what you get against Firestore, rather than a flattering simulation.

Dates are `Date` objects everywhere in the app. Conversion to and from Firestore
`Timestamp` happens only in `services/firebase/converters.ts`.

### Data model

```
users/{uid}                              profile; role mirrors the custom claim
counters/{customer|visit|order|service}   monotonic code sources
customers/{CUST-000001}                   one document per customer
customers/{CUST-000001}/visits/{VISIT-000001}
                                          visit + its prescription, orders, services
```

A visit holds its own prescription, orders and services, because they describe
what happened *that day* — a prescription stored at customer level would erase
the history the shop needs. Orders and services are embedded arrays, capped at
20 each by the rules, which keeps a visit comfortably inside Firestore's 1 MB
document limit while avoiding a read per order.

Family members are **independent customers**. A member stores
`primaryCustomerId` and `relationship`; the relationship only links the records.
Ali Khan has his own customer ID, visits, prescriptions, orders and services —
nothing is nested under Ahmed.

### Performance

The customer list never loads visit histories. Each customer carries
denormalised `visitCount` and `lastVisitAt`, maintained transactionally when a
visit is written. Search runs three bounded, indexed queries (customer code,
name prefix, phone prefix) rather than downloading the collection to filter in
the browser. Visits load only when a customer is opened, newest first.

---

## Scripts

| Command          | What it does                                            |
| ---------------- | ------------------------------------------------------- |
| `npm run dev`    | Dev server on port 5173                                 |
| `npm run build`  | Typecheck, then production build to `dist/`             |
| `npm run preview`| Serve the production build locally                      |
| `npm run typecheck` | TypeScript, strict, no emit                          |
| `npm run smoke`  | Runtime checks against the mock data layer              |

`npm run smoke` exercises the acceptance criteria end to end — sign-in by role,
employee permission denials, search by ID/name/phone, family independence,
duplicate detection, customer + initial visit creation, code uniqueness, status
transition rules, admin-only actions and soft delete.

---

## Not in V1

Deliberately excluded: inventory, stock, suppliers, purchasing, accounting, GST,
invoicing, payment gateways, WhatsApp/SMS, automated reminders, a customer
portal, appointment booking, multi-store, loyalty and analytics beyond the four
dashboard counters.
