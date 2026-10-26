---
name: optic-world-ui
description: UI conventions for the Optic World CRM (React + TypeScript + Tailwind). Use whenever you build or change anything a user sees in this repo — a page, component, form, list, table, modal, toast, empty/loading/error state, or styling — so new screens match the existing design system instead of inventing new styles.
---

# Optic World UI

The app is a calm, practical tool for staff at an optical store, used on desktops
at the counter and on phones in the shop. The look is **quiet and clean**: white
cards on a pale slate background, one blue accent, and colour used only to mean
something (status, danger, success). Good UI here means fast to scan, hard to
misuse, and comfortable on a touch screen.

Before writing UI, skim the primitives in `src/components/ui/` and one page close
to what you are building (`src/pages/`). Reuse; do not restyle.

## Hard rules

1. **Build from `@/components/ui`** (`Button`, `ButtonLink`, `Input`, `Select`,
   `Textarea`, `Card`, `CardHeader`, `CardBody`, `CardFooter`, `DetailItem`,
   `FormSection`, `FormActions`, `Badge` and the status badges, `PageHeader`,
   `Modal`, `ConfirmDialog`, `LoadingState`, `SkeletonRows`, `EmptyState`,
   `ErrorState`, `FormError`, `Spinner`). Never hand-roll a button, input, card or dialog. If a
   primitive is missing a variant, add it to the primitive, not inline.
2. **Join classes with `cn()`** from `@/utils/cn`. No `clsx`, no
   template-string concatenation of conditional classes.
3. **No new UI dependencies.** No component kits, icon packs or CSS-in-JS. Icons
   are inline SVGs (see *Icons*).
4. **Pages never import Firebase.** Data comes from `@/services`, loaded with
   `useAsync` / changed with `useMutation` from `@/hooks/useAsync`.
5. **Labels and formatting come from shared helpers**: enum labels from
   `@/constants/labels`, status tones from `@/constants/workflow`, dates/phones/
   currency from `@/utils/format` (`formatDate`, `formatDateTime`,
   `formatCurrency`, `formatPhone`, `formatRelativeDay`, `initialsOf`). Never
   format a date or map an enum to text inline.
6. **Every async view handles four states**: loading, error (with retry), empty,
   and data. See *Data states*.
7. **Hide what a user cannot do** with `can('…')` from `useAuth()` (or
   `isAdmin(user)`). This is a courtesy only; `firestore.rules` is the real check.

## Design tokens

Defined in `tailwind.config.js` and `src/index.css`. Use these, not arbitrary
values (`[#…]`, `[13px]`).

| Token | Use |
|---|---|
| `bg-slate-50` | Page background (set on `body`) |
| `bg-white` + `border-slate-200` | Cards, sidebar, bars, modals |
| `brand-*` (Tailwind's blue scale) | The single accent: primary buttons (`brand-600`, hover `-700`), active nav (`bg-brand-50 text-brand-700`), links (`text-brand-700`), focus rings (`ring-brand-500/40`) |
| `slate-*` | All neutral text, borders and fills |
| `red-*` | Errors and destructive actions only |
| `emerald-*` / `amber-*` | Success / attention, via badge tones and toasts |
| `shadow-card` | Resting cards and stat tiles |
| `shadow-panel` | Floating things: modals, toasts, mobile menu |
| `animate-fade-in` / `animate-slide-up` | Overlays and things that appear (motion is disabled for `prefers-reduced-motion` globally) |
| Font | Inter (loaded in `index.html`), via Tailwind's default `font-sans` |

**Radius:** controls and buttons `rounded-lg`; cards and modals `rounded-xl`
(modals `rounded-t-2xl` as a mobile sheet); badges and avatars `rounded-full`.

**Borders and dividers:** `border-slate-200` for edges, `divide-slate-100` between
list rows.

### Type scale

| Role | Classes |
|---|---|
| Page title (via `PageHeader`) | `text-xl sm:text-2xl font-semibold text-slate-900` |
| Card / modal title | `text-base font-semibold text-slate-900` |
| Form section title | `text-sm font-semibold text-slate-900` |
| Body | `text-sm text-slate-600` (emphasis `text-slate-900 font-medium`) |
| Secondary / description | `text-sm text-slate-500` |
| Meta, hints | `text-xs text-slate-500` |
| Eyebrow label (stat tiles, `DetailItem`, table headers) | `text-xs font-medium uppercase tracking-wide text-slate-500` (headers use `font-semibold`) |
| Big number | `text-2xl font-semibold tabular-nums text-slate-900` |
| Codes and IDs (`CUST-000001`) | `font-mono text-xs text-slate-500` |
| Phone numbers, amounts, counts | add `tabular-nums` |

## Components

### Buttons

```tsx
<Button onClick={…}>Save changes</Button>                    // primary (default)
<Button variant="secondary">Cancel</Button>
<Button variant="ghost" size="sm">Clear</Button>
<Button variant="danger">Deactivate</Button>
<Button loading={save.pending} onClick={() => void save.run()}>Save</Button>
<ButtonLink to="/customers/new" icon={PlusIcon}>New customer</ButtonLink>
```

- Sizes: `sm` (h-9), `md` (h-10, default), `lg` (h-11). Nothing smaller than `sm`
  — controls stay at least ~40px tall for touch.
- One primary button per view or action row. Everything else is `secondary`
  or `ghost`.
- Pass `loading` while a mutation runs; it disables the button and shows a
  spinner, which is how double submissions are prevented.
- Navigation that looks like a button is `ButtonLink`, never `<Button onClick={navigate}>`.

### Form fields

```tsx
<Input label="Full name" required value={…} error={errors.name}
       onChange={(e) => set('name', e.target.value)} disabled={pending}
       placeholder="e.g. Ahmed Khan" autoComplete="name" />
<Select label="Gender" options={GENDER_OPTIONS} placeholder="Select…" … />
<Textarea label="Notes" rows={3} hint="Visible to all staff." … />
```

- `label` is always required — it wires up `htmlFor`, `aria-invalid` and
  `aria-describedby` for you. For a control whose label is a column header
  (the prescription grid), use `GridInput` with `aria-label`.
- Show per-field problems through `error` (red text under the field); show
  guidance through `hint`. Don't add your own helper paragraphs.
- Options arrays are built from `@/constants/labels`:
  `GENDERS.map((value) => ({ value, label: GENDER_LABELS[value] }))`.
- Set the right `type`, `inputMode` and `autoComplete` (phones:
  `type="tel" inputMode="numeric"`).
- Disable every field while the form is submitting.

### Cards and layout blocks

```tsx
<Card>
  <CardHeader title="Personal information" description="…" actions={<Button size="sm">…</Button>} />
  <CardBody className="space-y-4">…</CardBody>
  <CardFooter>…buttons…</CardFooter>
</Card>
```

- Group a long form into several `Card`s (one per topic) stacked with
  `space-y-5`, or use `FormSection` inside one card.
- Field grids: `grid gap-4 sm:grid-cols-2` (up to `sm:grid-cols-3` or
  `lg:grid-cols-4` for short fields). Always single-column on phones.
- Read-only details: a `<dl className="grid gap-4 sm:grid-cols-2">` of
  `DetailItem`s. `DetailItem` shows "—" for empty values.
- Lists inside a card: `<ul className="divide-y divide-slate-100">`, each row a
  full-width `Link` with `px-4 py-3.5 sm:px-6 transition hover:bg-slate-50`.

### Badges

`<Badge tone="neutral|info|warning|success|danger">`. For domain statuses always
use the dedicated badges — `OrderStatusBadge`, `ServiceStatusBadge`,
`PaymentStatusBadge`, `ActiveBadge` — so the colour mapping in
`constants/workflow.ts` stays the single source of truth. A new status gets a
tone in `workflow.ts` and a label in `labels.ts`, not inline colours.

### Page header

```tsx
<PageHeader
  title="Customers"
  description="Search by customer ID, name, or phone number."
  backTo={{ label: 'Back to customer', to: `/customers/${id}` }}
  actions={can('customers:create') ? <ButtonLink to="/customers/new" icon={PlusIcon}>New customer</ButtonLink> : null}
/>
```

Every page starts with one. Sub-pages use `backTo` instead of breadcrumbs.

### Modals and confirmation

- `Modal` for small focused tasks (add a family member, add an employee). It
  traps focus, closes on Escape and becomes a bottom sheet on phones. Put the
  buttons in `footer` (cancel first, primary last) and `FormError` in the body.
- `ConfirmDialog` before anything awkward to undo (deactivate, change role).
  Use `tone="danger"`, a specific `confirmLabel` ("Deactivate employee", not
  "OK"), pass `pending` and `error` from the mutation.

### Toasts

`const { notify } = useToast();` then `notify(\`${updated.name} updated.\`, 'success')`.
Use toasts for confirmation after a successful action, especially one that
navigates away. Errors in a form or a page section belong in `FormError` /
`ErrorState`. The exception is a one-click inline action with no form around it
(e.g. changing an order's status on the timeline): report its failure with
`notify(messageFromError(error, 'Unable to update the order status.'), 'error')`.

### Icons

Inline SVG, outline style, matching the existing set:

```tsx
<svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor"
     strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M10 5v10M5 10h10" />
</svg>
```

- `h-4 w-4` in buttons and inline text, `h-5 w-5` in navigation (24px viewBox,
  `strokeWidth` 1.7).
- Colour comes from `currentColor`; decorative icons get `aria-hidden="true"`;
  an icon-only button needs an `aria-label`.
- If an icon is used in more than one file, hoist it into a shared constant
  instead of pasting the path again.

## Data states

```tsx
const customer = useAsync(() => customerService.getById(id), [id]);

if (customer.loading) return <Card><LoadingState label="Loading customer…" /></Card>;
if (customer.error)   return <Card><ErrorState message={customer.error} onRetry={customer.reload} /></Card>;
if (!customer.data)   return <Card><EmptyState title="Customer not found" /></Card>;
```

- Inside a card where the shape is known (lists, feeds), use
  `<CardBody><SkeletonRows rows={4} /></CardBody>` instead of a spinner.
- Stat tiles show an `animate-pulse` block in place of the number while loading.
- Empty states say what is missing and, when the user can fix it, offer the
  action (`action={<ButtonLink size="sm" …>Create the first customer</ButtonLink>}`).
  Distinguish "no results for this search" from "nothing here yet".
- A section that fails should fail on its own (its own `ErrorState` with retry);
  don't blank the whole page because one card failed.

## Forms and mutations

```tsx
const save = useMutation(async () => {
  const validation = validateCustomerDraft(draft);
  setErrors(validation);
  if (hasErrors(validation)) return null;
  const updated = await customerService.update(id, toCustomerInput(draft, relationshipFields));
  notify(`${updated.name} updated.`, 'success');
  navigate(`/customers/${id}`);
  return updated;
});

…
<FormActions error={save.error}>
  <Button variant="secondary" onClick={cancel} disabled={save.pending}>Cancel</Button>
  <Button loading={save.pending} onClick={() => void save.run()}>Save changes</Button>
</FormActions>
```

- **Every full-page form ends with `FormActions`.** It sticks to the bottom of
  the screen while the form scrolls (above the bottom nav on phones, floating
  on desktop), so Save is always reachable, and shows the form-level error
  above the buttons. Children go secondary first, primary last; on phones they
  share one row and the primary takes the spare width.
- Short forms inside a `Modal` keep using the modal's `footer` instead.

- Keep form state in a "draft" of strings (see `components/*/draft.ts`) with a
  `validate…Draft` function returning field errors; convert to the service input
  only on submit. Client validation is for fast feedback — the rules enforce it.
- Cancel is always `secondary`. Form-level errors go through `FormActions`'
  `error` prop (or `FormError` above a modal's footer).

## Responsive behaviour

Mobile-first; the main breakpoints are `sm` (640px) and `lg` (1024px).

- `AppLayout` already provides the shell: sidebar from `lg`, top bar and bottom
  tab bar below it, page padding, and `max-w-6xl` content width. Pages render
  content only — no extra outer padding or max-width.
- Tables are desktop-only (`hidden lg:block`); below `lg` render the same data
  as a card list (`lg:hidden`). Nothing should need horizontal scrolling.
- Headers and footers stack on phones (`flex-col … sm:flex-row`).
- Use `truncate` with `min-w-0` on text that sits next to fixed-width things.
- Stat grids: `grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4`; each tile is an
  icon chip, the number and a short label (icon above on phones, beside from `sm`).
- Main-plus-side layouts (e.g. visit history beside customer details) split
  only from `xl` (`grid gap-5 xl:grid-cols-3`, main `xl:col-span-2`). With the
  256px sidebar, a split at `lg` leaves both columns too narrow. Put the content
  staff use most first in the DOM so it also comes first on phones.
- The phone top bar holds the logo and an account button (initials) that opens
  profile + Log out; navigation lives only in the bottom bar. Don't add nav
  links to the top bar.
- Phone numbers that a user may want to call are `tel:` links
  (`text-brand-700 tabular-nums`).
- Sticky elements that must clear the bottom nav use the `bottom-above-nav`
  utility (`src/index.css`) plus `lg:bottom-…` for desktop.

## Accessibility checklist

- Every input has a visible label (the primitives enforce this).
- Focus is visible everywhere — don't remove outlines; the global
  `:focus-visible` ring and the primitives already handle it.
- Use real elements: `button` for actions, `Link` for navigation, `table` with
  `scope="col"` headers for tables, `role="tablist"`/`role="tab"` +
  `aria-selected` for filter tabs.
- Live regions: loading uses `role="status"`, errors `role="alert"` (built into
  the state components).
- Don't rely on colour alone: badges carry text; errors carry text.
- Keep contrast at least `text-slate-500` on white for anything a user must read.

## Copy

- Sentence case everywhere ("New customer", "Save changes").
- Buttons say what happens: "Deactivate employee", "Create customer".
- Loading labels end with an ellipsis: "Loading customer…".
- Errors are plain and actionable: "Unable to load customers.", "Enter a
  10-digit phone number". No error codes or stack traces.
- Success toasts are short past-tense confirmations that name the thing when
  there is one: "Ahmed Khan updated.", "Priya Nair can now sign in.", "Visit recorded."
- Use "customer", "visit", "order", "service", "employee" — the words the shop
  uses — consistently.

## Avoid

- Arbitrary values (`text-[13px]`, `bg-[#1a73e8]`) and new colours outside the
  palette above; gradients, glows and heavy shadows.
- A second accent colour, or brand blue used for decoration.
- Spinners for whole pages when only one section is loading.
- Disabled buttons with no explanation — prefer hiding unavailable actions with
  `can()`, or explain via a `hint`.
- `alert()` / `confirm()` — use `ConfirmDialog` and toasts.
- Duplicating a primitive's classes inline to tweak one thing.

## Before you finish

1. `npm run typecheck` and `npm run build` pass.
2. Look at the screen in the browser at phone width (~375px) and desktop width,
   in demo mode (`VITE_DATA_SOURCE=mock`) and, if it touches data access, against
   Firebase.
3. Check the loading, empty and error states, not just the happy path, and tab
   through the screen with the keyboard.
