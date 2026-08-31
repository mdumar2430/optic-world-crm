import type { ServiceJob, ServiceStatus } from '@/types';
import { SERVICE_STATUSES } from '@/types';
import { SERVICE_STATUS_LABELS, SERVICE_TYPE_LABELS } from '@/constants/labels';
import { SERVICE_STATUS_TRANSITIONS } from '@/constants/workflow';
import { PaymentStatusBadge, ServiceStatusBadge, Spinner } from '@/components/ui';
import { formatCurrency, formatDate, formatRelativeDay } from '@/utils/format';

interface ServiceCardProps {
  job: ServiceJob;
  canUpdateStatus: boolean;
  updating: boolean;
  onStatusChange: (status: ServiceStatus) => void;
}

export function ServiceCard({ job, canUpdateStatus, updating, onStatusChange }: ServiceCardProps) {
  const nextStatuses = SERVICE_STATUS_TRANSITIONS[job.status];
  const isTerminal = nextStatuses.length === 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">{job.serviceCode}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {SERVICE_TYPE_LABELS[job.serviceType]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ServiceStatusBadge status={job.status} />
          {job.charge > 0 ? (
            <>
              <PaymentStatusBadge status={job.paymentStatus} />
              <span className="text-sm font-semibold tabular-nums text-slate-900">
                {formatCurrency(job.charge)}
              </span>
            </>
          ) : (
            <span className="text-sm text-slate-500">No charge</span>
          )}
        </div>
      </div>

      {job.description && <p className="mt-2 text-sm text-slate-700">{job.description}</p>}

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {job.expectedReadyDate && !job.deliveredDate && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Expected ready</dt>
            <dd className="text-slate-800">
              {formatDate(job.expectedReadyDate)}
              <span className="ml-1.5 text-slate-500">
                ({formatRelativeDay(job.expectedReadyDate)})
              </span>
            </dd>
          </div>
        )}
        {job.deliveredDate && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Collected</dt>
            <dd className="text-slate-800">{formatDate(job.deliveredDate)}</dd>
          </div>
        )}
      </dl>

      {job.notes && <p className="mt-3 text-sm text-slate-600">{job.notes}</p>}

      {canUpdateStatus && !isTerminal && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <label
            htmlFor={`service-status-${job.id}`}
            className="text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Move to
          </label>
          <select
            id={`service-status-${job.id}`}
            value=""
            disabled={updating}
            onChange={(event) => {
              const next = event.target.value as ServiceStatus;
              if (next) onStatusChange(next);
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60"
          >
            <option value="">Select…</option>
            {SERVICE_STATUSES.filter((status) => nextStatuses.includes(status)).map((status) => (
              <option key={status} value={status}>
                {SERVICE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {updating && <Spinner className="h-4 w-4" />}
        </div>
      )}
    </div>
  );
}
