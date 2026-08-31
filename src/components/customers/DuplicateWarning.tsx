import { Link } from 'react-router-dom';
import type { DuplicateMatch } from '@/services';
import { Button } from '@/components/ui';
import { formatPhone } from '@/utils/format';

const REASON_TEXT: Record<DuplicateMatch['reason'], string> = {
  name_and_phone: 'Same name and phone number',
  phone: 'Same phone number',
  name: 'Same name',
};

interface DuplicateWarningProps {
  matches: DuplicateMatch[];
  onDismiss: () => void;
}

/**
 * A warning, not a block. Family members legitimately share a phone number, so
 * the decision to continue stays with the staff member.
 */
export function DuplicateWarning({ matches, onDismiss }: DuplicateWarningProps) {
  if (matches.length === 0) return null;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4" role="status">
      <div className="flex items-start gap-3">
        <svg
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M10 3.5l7 12.5H3l7-12.5z" strokeLinejoin="round" />
          <path d="M10 8.5v3M10 14h.01" strokeLinecap="round" />
        </svg>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {matches.length === 1
              ? 'Possible existing customer found'
              : `${matches.length} possible existing customers found`}
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            Check whether this is the same person before creating a new record. Family members
            often share a phone number, so this may be fine.
          </p>

          <ul className="mt-3 space-y-2">
            {matches.map((match) => (
              <li
                key={match.customer.id}
                className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {match.customer.name}
                  </p>
                  <p className="font-mono text-xs text-slate-500">{match.customer.customerCode}</p>
                  <p className="text-sm tabular-nums text-slate-600">
                    {formatPhone(match.customer.phone)}
                  </p>
                  <p className="mt-0.5 text-xs text-amber-700">{REASON_TEXT[match.reason]}</p>
                </div>
                <Link
                  to={`/customers/${match.customer.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
                >
                  View existing customer
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-3">
            <Button variant="secondary" size="sm" onClick={onDismiss}>
              This is a different person — continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
