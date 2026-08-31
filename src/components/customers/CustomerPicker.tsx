import { useEffect, useId, useState } from 'react';
import type { Customer } from '@/types';
import { customerService } from '@/services';
import { useDebounced } from '@/hooks/useDebounced';
import { messageFromError } from '@/hooks/useAsync';
import { Spinner } from '@/components/ui';
import { formatPhone } from '@/utils/format';
import { cn } from '@/utils/cn';

interface CustomerPickerProps {
  label: string;
  /** Customer ids that cannot be chosen, e.g. the customer being edited. */
  excludeIds?: string[];
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
  disabled?: boolean;
}

/**
 * Type-ahead over the same server-side search used by the customer list, so
 * linking a family member never loads the whole collection.
 */
export function CustomerPicker({
  label,
  excludeIds = [],
  selected,
  onSelect,
  disabled,
}: CustomerPickerProps) {
  const inputId = useId();
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounced = useDebounced(term, 300);

  useEffect(() => {
    if (selected) return;
    const query = debounced.trim();
    if (query.length < 2) {
      setResults([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    customerService
      .quickSearch(query)
      .then((found) => {
        if (cancelled) return;
        setResults(found.filter((customer) => !excludeIds.includes(customer.id)));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(messageFromError(caught, 'Unable to search customers.'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // `excludeIds` is a fresh array each render; its contents are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, selected]);

  if (selected) {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <div className="flex items-center justify-between gap-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{selected.name}</p>
            <p className="font-mono text-xs text-slate-500">{selected.customerCode}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setTerm('');
            }}
            disabled={disabled}
            className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="search"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          disabled={disabled}
          autoComplete="off"
          placeholder="Search by name, phone, or customer ID"
          aria-describedby={`${inputId}-hint`}
          className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Spinner className="h-4 w-4" />
          </span>
        )}
      </div>

      <p id={`${inputId}-hint`} className="text-xs text-slate-500">
        Type at least 2 characters.
      </p>

      {error && <p className="text-xs font-medium text-red-600">{error}</p>}

      {debounced.trim().length >= 2 && !loading && results.length === 0 && !error && (
        <p className="text-sm text-slate-500">No matching customers.</p>
      )}

      {results.length > 0 && (
        <ul className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          {results.map((customer, index) => (
            <li key={customer.id}>
              <button
                type="button"
                onClick={() => onSelect(customer)}
                className={cn(
                  'flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50',
                  index > 0 && 'border-t border-slate-100',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-900">
                    {customer.name}
                  </span>
                  <span className="block font-mono text-xs text-slate-500">
                    {customer.customerCode}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-slate-600">
                  {formatPhone(customer.phone)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
