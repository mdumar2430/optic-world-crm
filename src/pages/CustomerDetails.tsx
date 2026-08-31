import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Visit } from '@/types';
import { customerService, visitService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAsync, useMutation } from '@/hooks/useAsync';
import { useUserNames } from '@/hooks/useUserNames';
import {
  CUSTOMER_TYPE_LABELS,
  GENDER_LABELS,
  INVERSE_RELATIONSHIP_LABELS,
  RELATIONSHIP_LABELS,
} from '@/constants/labels';
import {
  ActiveBadge,
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DetailItem,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  SkeletonRows,
} from '@/components/ui';
import { AddFamilyMemberModal } from '@/components/customers/AddFamilyMemberModal';
import { VisitTimeline } from '@/components/visits/VisitTimeline';
import { formatDate, formatDateTime, formatPhone } from '@/utils/format';

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

export function CustomerDetailsPage() {
  const { customerId = '' } = useParams();
  const { can } = useAuth();
  const { notify } = useToast();
  const nameOf = useUserNames();

  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

  const customer = useAsync(() => customerService.getById(customerId), [customerId]);
  const visits = useAsync(() => visitService.listByCustomer(customerId), [customerId]);
  const related = useAsync(() => customerService.getRelated(customerId), [customerId]);

  const record = customer.data;

  const toggleActive = useMutation(async (nextActive: boolean) => {
    const updated = await customerService.setActive(customerId, nextActive);
    customer.setData(updated);
    setConfirmDeactivate(false);
    notify(
      nextActive ? `${updated.name} restored.` : `${updated.name} deactivated.`,
      'success',
    );
    return updated;
  });

  const replaceVisit = (updated: Visit) => {
    if (!visits.data) return;
    visits.setData(visits.data.map((visit) => (visit.id === updated.id ? updated : visit)));
  };

  if (customer.loading) {
    return (
      <Card>
        <LoadingState label="Loading customer…" />
      </Card>
    );
  }

  if (customer.error) {
    return (
      <Card>
        <ErrorState message={customer.error} onRetry={customer.reload} />
      </Card>
    );
  }

  if (!record) {
    return (
      <Card>
        <EmptyState
          title="Customer not found"
          description="This record may have been removed, or the link is out of date."
          action={
            <ButtonLink to="/customers" size="sm" variant="secondary">
              Back to customers
            </ButtonLink>
          }
        />
      </Card>
    );
  }

  const primaryRelation = related.data?.find((entry) => entry.isPrimary) ?? null;
  const familyMembers = related.data?.filter((entry) => !entry.isPrimary) ?? [];
  const relatedIds = related.data?.map((entry) => entry.customer.id) ?? [];

  return (
    <>
      <PageHeader
        title={record.name}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs">{record.customerCode}</span>
            <span className="text-slate-300">·</span>
            <span className="tabular-nums">{formatPhone(record.phone)}</span>
          </span>
        }
        backTo={{ label: 'Back to customers', to: '/customers' }}
        actions={
          <>
            {can('customers:edit') && (
              <ButtonLink to={`/customers/${record.id}/edit`} variant="secondary">
                Edit customer
              </ButtonLink>
            )}
            {can('visits:create') && record.isActive && (
              <ButtonLink to={`/customers/${record.id}/visits/new`} icon={PlusIcon}>
                New visit
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <ActiveBadge isActive={record.isActive} />
        <Badge tone={record.customerType === 'primary' ? 'info' : 'neutral'}>
          {CUSTOMER_TYPE_LABELS[record.customerType]}
        </Badge>
        <span className="text-sm text-slate-500">
          {record.visitCount} {record.visitCount === 1 ? 'visit' : 'visits'} · Last visit{' '}
          {formatDate(record.lastVisitAt)}
        </span>
      </div>

      {!record.isActive && (
        <Card className="mb-5 border-slate-300 bg-slate-100">
          <CardBody className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-700">
              This customer is deactivated. Their history is preserved and they are hidden from
              the default customer list.
            </p>
            {can('customers:deactivate') && (
              <Button
                variant="secondary"
                size="sm"
                loading={toggleActive.pending}
                onClick={() => void toggleActive.run(true)}
              >
                Restore customer
              </Button>
            )}
          </CardBody>
        </Card>
      )}

      {/* Makes it unmistakable whose record is open before a visit is recorded. */}
      {primaryRelation && (
        <Card className="mb-5 border-brand-200 bg-brand-50/60">
          <CardBody>
            <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
              You are viewing
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {record.name}
              <span className="ml-2 font-mono text-xs font-normal text-slate-500">
                {record.customerCode}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-700">
              {record.relationship ? RELATIONSHIP_LABELS[record.relationship] : 'Related'} of{' '}
              <Link
                to={`/customers/${primaryRelation.customer.id}`}
                className="font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                {primaryRelation.customer.name}
              </Link>
              {record.relationshipNote && (
                <span className="text-slate-500"> — {record.relationshipNote}</span>
              )}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              This customer has their own independent visits, prescriptions, orders and services.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="space-y-5">
        <Card>
          <CardHeader title="Customer information" />
          <CardBody>
            <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem label="Customer ID" value={<span className="font-mono">{record.customerCode}</span>} />
              <DetailItem label="Full name" value={record.name} />
              <DetailItem label="Phone" value={formatPhone(record.phone)} />
              <DetailItem
                label="Alternate phone"
                value={record.alternatePhone ? formatPhone(record.alternatePhone) : ''}
              />
              <DetailItem label="Date of birth" value={formatDate(record.dateOfBirth)} />
              <DetailItem label="Age" value={record.age === null ? '' : `${record.age} years`} />
              <DetailItem
                label="Gender"
                value={record.gender ? GENDER_LABELS[record.gender] : ''}
              />
              <DetailItem
                label="Address"
                className="sm:col-span-2"
                value={
                  [
                    record.address.line1,
                    record.address.line2,
                    record.address.city,
                    record.address.state,
                    record.address.postalCode,
                  ]
                    .filter(Boolean)
                    .join(', ') || ''
                }
              />
              <DetailItem label="Hospital / organisation" value={record.hospital} />
              <DetailItem label="Referred by" value={record.referredBy} />
              <DetailItem label="Referral details" value={record.referralDetails} />
              <DetailItem label="Notes" className="sm:col-span-2 lg:col-span-3" value={record.notes} />
            </dl>

            <p className="mt-5 border-t border-slate-100 pt-3 text-xs text-slate-500">
              Created by {nameOf(record.createdBy)} on {formatDateTime(record.createdAt)}
              <span className="mx-1.5 text-slate-300">·</span>
              Last updated by {nameOf(record.updatedBy)} on {formatDateTime(record.updatedAt)}
            </p>
          </CardBody>
          {can('customers:deactivate') && record.isActive && (
            <div className="border-t border-slate-200 px-4 py-3 sm:px-6">
              <Button variant="danger" size="sm" onClick={() => setConfirmDeactivate(true)}>
                Deactivate customer
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Family and related customers"
            description="Each family member is a separate customer with their own history."
            actions={
              can('relationships:manage') ? (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={PlusIcon}
                  onClick={() => setFamilyModalOpen(true)}
                >
                  Add family member
                </Button>
              ) : null
            }
          />
          {related.loading ? (
            <CardBody>
              <SkeletonRows rows={2} />
            </CardBody>
          ) : related.error ? (
            <ErrorState message={related.error} onRetry={related.reload} />
          ) : familyMembers.length === 0 && !primaryRelation ? (
            <EmptyState
              title="No family members linked"
              description="Link an existing customer, or create a new one, to keep a household together."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {primaryRelation && (
                <li>
                  <Link
                    to={`/customers/${primaryRelation.customer.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {primaryRelation.customer.name}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {primaryRelation.customer.customerCode}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone="info">Primary customer</Badge>
                      <Badge>
                        {record.relationship
                          ? INVERSE_RELATIONSHIP_LABELS[record.relationship]
                          : 'Related'}
                      </Badge>
                    </div>
                  </Link>
                </li>
              )}
              {familyMembers.map((entry) => (
                <li key={entry.customer.id}>
                  <Link
                    to={`/customers/${entry.customer.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 transition hover:bg-slate-50 sm:px-6"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {entry.customer.name}
                      </p>
                      <p className="font-mono text-xs text-slate-500">
                        {entry.customer.customerCode}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {entry.customer.visitCount}{' '}
                        {entry.customer.visitCount === 1 ? 'visit' : 'visits'}
                      </p>
                    </div>
                    <Badge>
                      {RELATIONSHIP_LABELS[entry.relationship]}
                      {entry.relationshipNote ? ` — ${entry.relationshipNote}` : ''}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Visit history</h2>
            {can('visits:create') && record.isActive && (
              <ButtonLink to={`/customers/${record.id}/visits/new`} variant="secondary" size="sm">
                New visit
              </ButtonLink>
            )}
          </div>

          {visits.loading ? (
            <Card>
              <CardBody>
                <SkeletonRows rows={3} />
              </CardBody>
            </Card>
          ) : visits.error ? (
            <Card>
              <ErrorState message={visits.error} onRetry={visits.reload} />
            </Card>
          ) : !visits.data || visits.data.length === 0 ? (
            <Card>
              <EmptyState
                title="No visits recorded for this customer"
                description="Record a visit whenever this customer comes into the store."
                action={
                  can('visits:create') && record.isActive ? (
                    <ButtonLink to={`/customers/${record.id}/visits/new`} size="sm">
                      Record a visit
                    </ButtonLink>
                  ) : null
                }
              />
            </Card>
          ) : (
            <VisitTimeline
              customerId={record.id}
              visits={visits.data}
              onVisitUpdated={replaceVisit}
            />
          )}
        </div>
      </div>

      <AddFamilyMemberModal
        open={familyModalOpen}
        primary={record}
        excludeIds={relatedIds}
        onClose={() => setFamilyModalOpen(false)}
        onLinked={() => {
          setFamilyModalOpen(false);
          related.reload();
          notify('Family member linked.', 'success');
        }}
      />

      <ConfirmDialog
        open={confirmDeactivate}
        title="Deactivate this customer?"
        description={`${record.name} will be hidden from the default customer list. All visits, prescriptions, orders and services are kept, and an admin can restore the record at any time.`}
        confirmLabel="Deactivate"
        tone="danger"
        pending={toggleActive.pending}
        error={toggleActive.error}
        onConfirm={() => void toggleActive.run(false)}
        onCancel={() => setConfirmDeactivate(false)}
      />
    </>
  );
}
