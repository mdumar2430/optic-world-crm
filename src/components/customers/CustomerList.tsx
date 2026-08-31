import { Link } from 'react-router-dom';
import type { Customer } from '@/types';
import { ActiveBadge, Badge, ButtonLink } from '@/components/ui';
import { RELATIONSHIP_LABELS } from '@/constants/labels';
import { formatDate, formatPhone } from '@/utils/format';

function RelationshipChip({ customer }: { customer: Customer }) {
  if (customer.customerType !== 'family_member' || !customer.relationship) {
    return <Badge tone="info">Primary</Badge>;
  }
  return <Badge tone="neutral">{RELATIONSHIP_LABELS[customer.relationship]}</Badge>;
}

function VisitSummary({ customer }: { customer: Customer }) {
  return (
    <span className="whitespace-nowrap">
      {customer.visitCount} {customer.visitCount === 1 ? 'visit' : 'visits'}
    </span>
  );
}

interface CustomerListProps {
  customers: Customer[];
}

/**
 * Desktop shows a scannable table; tablet and mobile switch to cards so nothing
 * needs horizontal scrolling.
 */
export function CustomerList({ customers }: CustomerListProps) {
  return (
    <>
      <div className="hidden lg:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th scope="col" className="px-6 py-3">Customer ID</th>
              <th scope="col" className="px-6 py-3">Name</th>
              <th scope="col" className="px-6 py-3">Phone</th>
              <th scope="col" className="px-6 py-3">Visits</th>
              <th scope="col" className="px-6 py-3">Last visit</th>
              <th scope="col" className="px-6 py-3">Status</th>
              <th scope="col" className="px-6 py-3 text-right">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {customers.map((customer) => (
              <tr key={customer.id} className="transition hover:bg-slate-50">
                <td className="px-6 py-3 font-mono text-xs text-slate-600">
                  {customer.customerCode}
                </td>
                <td className="px-6 py-3">
                  <Link
                    to={`/customers/${customer.id}`}
                    className="font-medium text-slate-900 hover:text-brand-700"
                  >
                    {customer.name}
                  </Link>
                  <div className="mt-1">
                    <RelationshipChip customer={customer} />
                  </div>
                </td>
                <td className="px-6 py-3 tabular-nums text-slate-600">
                  {formatPhone(customer.phone)}
                </td>
                <td className="px-6 py-3 text-slate-600">
                  <VisitSummary customer={customer} />
                </td>
                <td className="px-6 py-3 text-slate-600">{formatDate(customer.lastVisitAt)}</td>
                <td className="px-6 py-3">
                  <ActiveBadge isActive={customer.isActive} />
                </td>
                <td className="px-6 py-3 text-right">
                  <ButtonLink to={`/customers/${customer.id}`} variant="secondary" size="sm">
                    View
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 lg:hidden">
        {customers.map((customer) => (
          <li key={customer.id}>
            <Link
              to={`/customers/${customer.id}`}
              className="flex items-start justify-between gap-3 px-4 py-4 transition hover:bg-slate-50 sm:px-6"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium text-slate-900">{customer.name}</span>
                  <RelationshipChip customer={customer} />
                  {!customer.isActive && <ActiveBadge isActive={false} />}
                </div>
                <p className="mt-1 font-mono text-xs text-slate-500">{customer.customerCode}</p>
                <p className="mt-1 text-sm tabular-nums text-slate-600">
                  {formatPhone(customer.phone)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  <VisitSummary customer={customer} /> · Last visit{' '}
                  {formatDate(customer.lastVisitAt)}
                </p>
              </div>
              <svg
                className="mt-1 h-5 w-5 shrink-0 text-slate-400"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M8 5l5 5-5 5" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
