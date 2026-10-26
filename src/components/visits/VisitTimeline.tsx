import { useState } from 'react';
import type { OrderStatus, ServiceStatus, Visit } from '@/types';
import { visitService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useUserNames } from '@/hooks/useUserNames';
import { messageFromError } from '@/hooks/useAsync';
import { LENS_TYPE_LABELS, VISIT_TYPE_LABELS } from '@/constants/labels';
import { Badge, Button, ButtonLink, DetailItem } from '@/components/ui';
import { OrderCard } from '@/components/orders/OrderCard';
import { ServiceCard } from '@/components/services/ServiceCard';
import { formatDate, formatDateTime, summariseVisitActivities } from '@/utils/format';
import { PrescriptionView } from './PrescriptionView';

interface VisitTimelineProps {
  customerId: string;
  visits: Visit[];
  /** Replaces one visit in the parent's state after a status change. */
  onVisitUpdated: (visit: Visit) => void;
}

export function VisitTimeline({ customerId, visits, onVisitUpdated }: VisitTimelineProps) {
  const { can } = useAuth();
  const { notify } = useToast();
  const nameOf = useUserNames();

  // The newest visit starts expanded; older ones are collapsed.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(visits.slice(1).map((visit) => [visit.id, true])),
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const canUpdateOrders = can('orders:updateStatus');
  const canUpdateServices = can('services:updateStatus');
  const canEditVisit = can('visits:edit');

  const toggle = (visitId: string) => {
    setCollapsed((current) => ({ ...current, [visitId]: !current[visitId] }));
  };

  const changeOrderStatus = async (visitId: string, orderId: string, status: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      const updated = await visitService.setOrderStatus({
        customerId,
        visitId,
        orderId,
        status,
      });
      onVisitUpdated(updated);
      notify('Order status updated.', 'success');
    } catch (error) {
      notify(messageFromError(error, 'Unable to update the order status.'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  const changeServiceStatus = async (visitId: string, serviceId: string, status: ServiceStatus) => {
    setUpdatingId(serviceId);
    try {
      const updated = await visitService.setServiceStatus({
        customerId,
        visitId,
        serviceId,
        status,
      });
      onVisitUpdated(updated);
      notify('Service status updated.', 'success');
    } catch (error) {
      notify(messageFromError(error, 'Unable to update the service status.'), 'error');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <ol className="space-y-4">
      {visits.map((visit) => {
        const isCollapsed = collapsed[visit.id] ?? false;
        const summary = summariseVisitActivities({
          hasPrescription: visit.prescription !== null,
          orderCount: visit.orders.length,
          serviceCount: visit.services.length,
        });

        return (
          <li
            key={visit.id}
            className="relative rounded-xl border border-slate-200 bg-white shadow-card"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {formatDate(visit.visitDate)}
                  </h3>
                  <Badge tone="info">{VISIT_TYPE_LABELS[visit.visitType]}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {summary}
                  <span className="mx-1.5 text-slate-300">·</span>
                  <span className="font-mono text-xs">{visit.visitCode}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {canEditVisit && (
                  <ButtonLink
                    to={`/customers/${customerId}/visits/${visit.id}/edit`}
                    variant="secondary"
                    size="sm"
                  >
                    Edit
                  </ButtonLink>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggle(visit.id)}
                  aria-expanded={!isCollapsed}
                  aria-controls={`visit-body-${visit.id}`}
                >
                  {isCollapsed ? 'Show details' : 'Hide details'}
                </Button>
              </div>
            </div>

            {!isCollapsed && (
              <div id={`visit-body-${visit.id}`} className="space-y-5 px-4 py-4 sm:px-5">
                {visit.oldGlasses && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Old glasses
                    </h4>
                    <div className="space-y-3">
                      <PrescriptionView prescription={visit.oldGlasses.prescription} />
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                        <DetailItem
                          label="Lens type"
                          value={
                            visit.oldGlasses.lensType
                              ? LENS_TYPE_LABELS[visit.oldGlasses.lensType]
                              : ''
                          }
                        />
                        <DetailItem label="Lens brand" value={visit.oldGlasses.lensCompany} />
                        <DetailItem label="Lens name" value={visit.oldGlasses.lensName} />
                        {visit.oldGlasses.lensDetails && (
                          <DetailItem
                            label="Lens details"
                            className="col-span-2 sm:col-span-3"
                            value={visit.oldGlasses.lensDetails}
                          />
                        )}
                      </dl>
                    </div>
                  </section>
                )}

                {visit.arReading && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      AR machine reading
                    </h4>
                    <PrescriptionView prescription={visit.arReading} />
                  </section>
                )}

                {visit.prescription && (
                  <section>
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Prescribed power
                      </h4>
                      {visit.oldGlasses && (
                        <span className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span
                            className="h-3 w-3 rounded-sm bg-amber-50 ring-1 ring-inset ring-amber-200"
                            aria-hidden="true"
                          />
                          Changed from old glasses
                        </span>
                      )}
                    </div>
                    <PrescriptionView
                      prescription={visit.prescription}
                      compareWith={visit.oldGlasses?.prescription ?? null}
                    />
                  </section>
                )}

                {visit.orders.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Orders
                    </h4>
                    <div className="space-y-3">
                      {visit.orders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          canUpdateStatus={canUpdateOrders}
                          updating={updatingId === order.id}
                          onStatusChange={(status) =>
                            void changeOrderStatus(visit.id, order.id, status)
                          }
                        />
                      ))}
                    </div>
                  </section>
                )}

                {visit.services.length > 0 && (
                  <section>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Services
                    </h4>
                    <div className="space-y-3">
                      {visit.services.map((job) => (
                        <ServiceCard
                          key={job.id}
                          job={job}
                          canUpdateStatus={canUpdateServices}
                          updating={updatingId === job.id}
                          onStatusChange={(status) =>
                            void changeServiceStatus(visit.id, job.id, status)
                          }
                        />
                      ))}
                    </div>
                  </section>
                )}

                {visit.notes && (
                  <section>
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Notes
                    </h4>
                    <p className="whitespace-pre-line text-sm text-slate-700">{visit.notes}</p>
                  </section>
                )}

                {!visit.prescription &&
                  !visit.oldGlasses &&
                  !visit.arReading &&
                  visit.orders.length === 0 &&
                  visit.services.length === 0 &&
                  !visit.notes && (
                    <p className="text-sm text-slate-500">
                      No prescription, order, or service was recorded for this visit.
                    </p>
                  )}

                <footer className="border-t border-slate-100 pt-3 text-xs text-slate-500">
                  Created by {nameOf(visit.createdBy)} on {formatDateTime(visit.createdAt)}
                  {visit.updatedAt.getTime() !== visit.createdAt.getTime() && (
                    <>
                      <span className="mx-1.5 text-slate-300">·</span>
                      Last updated by {nameOf(visit.updatedBy)} on{' '}
                      {formatDateTime(visit.updatedAt)}
                    </>
                  )}
                </footer>
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
