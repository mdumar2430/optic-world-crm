import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Customer } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { customerService, type CustomerListFilters } from '@/services';
import { messageFromError } from '@/hooks/useAsync';
import { useDebounced } from '@/hooks/useDebounced';
import { isAdmin } from '@/utils/permissions';
import { CustomerList } from '@/components/customers/CustomerList';
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonRows,
} from '@/components/ui';

const PlusIcon = (
  <svg
    className="h-4 w-4"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M10 5v10M5 10h10" />
  </svg>
);

type StatusFilter = NonNullable<CustomerListFilters['status']>;

const STATUS_TABS: ReadonlyArray<{ value: StatusFilter; label: string; adminOnly?: boolean }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive', adminOnly: true },
  { value: 'all', label: 'All', adminOnly: true },
];

const PAGE_SIZE = 20;

export function CustomersPage() {
  const { user, can } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('q') ?? '';
  const status = (searchParams.get('status') as StatusFilter | null) ?? 'active';
  const debouncedSearch = useDebounced(search, 300);

  const [items, setItems] = useState<Customer[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Discards the result of a query that has already been superseded.
  const runId = useRef(0);

  const load = useCallback(
    async (cursor: string | null) => {
      runId.current += 1;
      const currentRun = runId.current;
      const isFirstPage = cursor === null;

      if (isFirstPage) setLoading(true);
      else setLoadingMore(true);
      setError(null);

      try {
        const page = await customerService.list({
          search: debouncedSearch,
          status,
          pageSize: PAGE_SIZE,
          cursor,
        });
        if (currentRun !== runId.current) return;
        setItems((current) => (isFirstPage ? page.items : [...current, ...page.items]));
        setNextCursor(page.nextCursor);
      } catch (caught) {
        if (currentRun !== runId.current) return;
        setError(messageFromError(caught, 'Unable to load customers.'));
      } finally {
        if (currentRun === runId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [debouncedSearch, status],
  );

  useEffect(() => {
    void load(null);
  }, [load]);

  const updateParams = (mutateParams: (params: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams);
    mutateParams(next);
    setSearchParams(next, { replace: true });
  };

  const tabs = STATUS_TABS.filter((tab) => !tab.adminOnly || isAdmin(user));
  const isSearching = debouncedSearch.trim().length > 0;

  return (
    <>
      <PageHeader
        title="Customers"
        description="Search by customer ID, name, or phone number."
        actions={
          can('customers:create') ? (
            <ButtonLink to="/customers/new" icon={PlusIcon}>
              New customer
            </ButtonLink>
          ) : null
        }
      />

      <Card className="mb-4">
        <CardBody className="space-y-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                aria-hidden="true"
              >
                <circle cx="9" cy="9" r="6" />
                <path d="M13.5 13.5L17 17" strokeLinecap="round" />
              </svg>
            </span>
            <input
              type="search"
              value={search}
              onChange={(event) =>
                updateParams((params) => {
                  if (event.target.value) params.set('q', event.target.value);
                  else params.delete('q');
                })
              }
              placeholder="Search customers…"
              aria-label="Search customers"
              className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
            />
          </div>

          {tabs.length > 1 && (
            <div className="flex gap-1" role="tablist" aria-label="Filter by status">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={status === tab.value}
                  onClick={() =>
                    updateParams((params) => {
                      if (tab.value === 'active') params.delete('status');
                      else params.set('status', tab.value);
                    })
                  }
                  className={
                    status === tab.value
                      ? 'rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700'
                      : 'rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100'
                  }
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        {loading ? (
          <CardBody>
            <SkeletonRows rows={5} />
          </CardBody>
        ) : error ? (
          <ErrorState message={error} onRetry={() => void load(null)} />
        ) : items.length === 0 ? (
          <EmptyState
            title={isSearching ? 'No customers found' : 'No customers yet'}
            description={
              isSearching
                ? 'Try a different name, phone number, or customer ID.'
                : 'Create the first customer record to get started.'
            }
            action={
              !isSearching && can('customers:create') ? (
                <ButtonLink to="/customers/new" size="sm" icon={PlusIcon}>
                  New customer
                </ButtonLink>
              ) : null
            }
          />
        ) : (
          <>
            <CustomerList customers={items} />
            <div className="border-t border-slate-200 px-4 py-3 text-center sm:px-6">
              {nextCursor ? (
                <Button
                  variant="secondary"
                  size="sm"
                  loading={loadingMore}
                  onClick={() => void load(nextCursor)}
                >
                  Load more
                </Button>
              ) : (
                <p className="text-sm text-slate-500">
                  Showing all {items.length} {items.length === 1 ? 'customer' : 'customers'}.
                </p>
              )}
            </div>
          </>
        )}
      </Card>
    </>
  );
}
