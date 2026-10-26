import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { dashboardService } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { VISIT_TYPE_LABELS } from '@/constants/labels';
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  PageHeader,
  SkeletonRows,
} from '@/components/ui';
import { cn } from '@/utils/cn';
import { formatDate, summariseVisitActivities } from '@/utils/format';

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

const statIconProps = {
  className: 'h-5 w-5',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const STAT_ICONS = {
  visits: (
    <svg {...statIconProps}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  ),
  customers: (
    <svg {...statIconProps}>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 20a6.5 6.5 0 0 1 11.5-4.2M18.5 14v6M15.5 17h6" />
    </svg>
  ),
  orders: (
    <svg {...statIconProps}>
      <path d="M4 7.5l8-4 8 4v9l-8 4-8-4z" />
      <path d="M4 7.5l8 4 8-4M12 11.5v9" />
    </svg>
  ),
  services: (
    <svg {...statIconProps}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
    </svg>
  ),
};

function SummaryCard({
  label,
  value,
  loading,
  tone,
  icon,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  tone: 'brand' | 'amber' | 'emerald' | 'slate';
  icon: ReactNode;
}) {
  const toneStyles = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  }[tone];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card sm:flex-row sm:items-center">
      <span
        className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneStyles)}
      >
        {icon}
      </span>
      <div className="min-w-0">
        {loading ? (
          <div className="h-7 w-10 animate-pulse rounded bg-slate-100" />
        ) : (
          <p className="text-2xl font-semibold leading-7 tabular-nums text-slate-900">
            {value ?? 0}
          </p>
        )}
        <p className="mt-0.5 text-sm leading-snug text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user, can } = useAuth();
  const summary = useAsync(() => dashboardService.getSummary(), []);
  const recent = useAsync(() => dashboardService.getRecentVisits(6), []);

  const firstName = user?.fullName.split(' ')[0] ?? '';

  return (
    <>
      <PageHeader
        title={`Good day${firstName ? `, ${firstName}` : ''}`}
        description="Here is what is happening in the store today."
        actions={
          can('customers:create') ? (
            <ButtonLink to="/customers/new" icon={PlusIcon}>
              New customer
            </ButtonLink>
          ) : null
        }
      />

      {summary.error ? (
        <Card className="mb-5">
          <ErrorState message={summary.error} onRetry={summary.reload} />
        </Card>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <SummaryCard
            label="Visits today"
            value={summary.data?.todaysVisits}
            loading={summary.loading}
            tone="brand"
            icon={STAT_ICONS.visits}
          />
          <SummaryCard
            label="New customers, last 7 days"
            value={summary.data?.newCustomersThisWeek}
            loading={summary.loading}
            tone="emerald"
            icon={STAT_ICONS.customers}
          />
          <SummaryCard
            label="Open orders"
            value={summary.data?.pendingOrders}
            loading={summary.loading}
            tone="amber"
            icon={STAT_ICONS.orders}
          />
          <SummaryCard
            label="Services ready for pickup"
            value={summary.data?.servicesReady}
            loading={summary.loading}
            tone="slate"
            icon={STAT_ICONS.services}
          />
        </div>
      )}

      <Card>
        <CardHeader
          title="Recent activity"
          description="The latest visits across all customers."
          actions={
            <ButtonLink to="/customers" variant="secondary" size="sm">
              All customers
            </ButtonLink>
          }
        />
        {recent.loading ? (
          <CardBody>
            <SkeletonRows rows={4} />
          </CardBody>
        ) : recent.error ? (
          <ErrorState message={recent.error} onRetry={recent.reload} />
        ) : !recent.data || recent.data.length === 0 ? (
          <EmptyState
            title="No visits recorded yet"
            description="Once staff start recording visits, the most recent ones appear here."
            action={
              can('customers:create') ? (
                <ButtonLink to="/customers/new" size="sm">
                  Create the first customer
                </ButtonLink>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.data.map(({ visit, customer }) => (
              <li key={`${customer.id}-${visit.id}`}>
                <Link
                  to={`/customers/${customer.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-6"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">{customer.name}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {customer.customerCode}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {summariseVisitActivities({
                        hasPrescription: visit.prescription !== null,
                        orderCount: visit.orders.length,
                        serviceCount: visit.services.length,
                      })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge tone="info">{VISIT_TYPE_LABELS[visit.visitType]}</Badge>
                    <span className="text-xs text-slate-500">{formatDate(visit.visitDate)}</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
