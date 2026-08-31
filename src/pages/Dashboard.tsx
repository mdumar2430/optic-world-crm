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

function SummaryCard({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  tone: 'brand' | 'amber' | 'emerald' | 'slate';
}) {
  const toneStyles = {
    brand: 'bg-brand-50 text-brand-700',
    amber: 'bg-amber-50 text-amber-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    slate: 'bg-slate-100 text-slate-700',
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-12 animate-pulse rounded bg-slate-100" />
      ) : (
        <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">{value ?? 0}</p>
      )}
      <span
        className={`mt-3 inline-flex h-1.5 w-10 rounded-full ${toneStyles}`}
        aria-hidden="true"
      />
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
            label="Today's visits"
            value={summary.data?.todaysVisits}
            loading={summary.loading}
            tone="brand"
          />
          <SummaryCard
            label="New customers (7 days)"
            value={summary.data?.newCustomersThisWeek}
            loading={summary.loading}
            tone="emerald"
          />
          <SummaryCard
            label="Pending orders"
            value={summary.data?.pendingOrders}
            loading={summary.loading}
            tone="amber"
          />
          <SummaryCard
            label="Services ready"
            value={summary.data?.servicesReady}
            loading={summary.loading}
            tone="slate"
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
