import type { OrderStatus, ProductOrder } from '@/types';
import { ORDER_STATUSES } from '@/types';
import { ORDER_STATUS_LABELS, ORDER_TYPE_LABELS } from '@/constants/labels';
import { ORDER_STATUS_TRANSITIONS } from '@/constants/workflow';
import { OrderStatusBadge, Spinner } from '@/components/ui';
import { formatCurrency, formatDate, formatRelativeDay } from '@/utils/format';

interface OrderCardProps {
  order: ProductOrder;
  canUpdateStatus: boolean;
  updating: boolean;
  onStatusChange: (status: OrderStatus) => void;
}

export function OrderCard({ order, canUpdateStatus, updating, onStatusChange }: OrderCardProps) {
  const nextStatuses = ORDER_STATUS_TRANSITIONS[order.status];
  const isTerminal = nextStatuses.length === 0;

  const frame = [order.frameCompany, order.frameModel].filter(Boolean).join(' · ');
  const lens = [order.lensCompany, order.lensName].filter(Boolean).join(' · ');

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">{order.orderCode}</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-900">
            {ORDER_TYPE_LABELS[order.orderType]}
            {order.quantity > 1 && (
              <span className="ml-1.5 font-normal text-slate-500">× {order.quantity}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <span className="text-sm font-semibold tabular-nums text-slate-900">
            {formatCurrency(order.amount)}
          </span>
        </div>
      </div>

      <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {frame && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Frame</dt>
            <dd className="min-w-0 break-words text-slate-800">{frame}</dd>
          </div>
        )}
        {lens && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Lens</dt>
            <dd className="min-w-0 break-words text-slate-800">{lens}</dd>
          </div>
        )}
        {order.expectedDeliveryDate && !order.deliveredDate && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Expected</dt>
            <dd className="text-slate-800">
              {formatDate(order.expectedDeliveryDate)}
              <span className="ml-1.5 text-slate-500">
                ({formatRelativeDay(order.expectedDeliveryDate)})
              </span>
            </dd>
          </div>
        )}
        {order.deliveredDate && (
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Delivered</dt>
            <dd className="text-slate-800">{formatDate(order.deliveredDate)}</dd>
          </div>
        )}
      </dl>

      {order.notes && <p className="mt-3 text-sm text-slate-600">{order.notes}</p>}

      {canUpdateStatus && !isTerminal && (
        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
          <label
            htmlFor={`order-status-${order.id}`}
            className="text-xs font-medium uppercase tracking-wide text-slate-500"
          >
            Move to
          </label>
          <select
            id={`order-status-${order.id}`}
            value=""
            disabled={updating}
            onChange={(event) => {
              const next = event.target.value as OrderStatus;
              if (next) onStatusChange(next);
            }}
            className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-60"
          >
            <option value="">Select…</option>
            {ORDER_STATUSES.filter((status) => nextStatuses.includes(status)).map((status) => (
              <option key={status} value={status}>
                {ORDER_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          {updating && <Spinner className="h-4 w-4" />}
        </div>
      )}
    </div>
  );
}
