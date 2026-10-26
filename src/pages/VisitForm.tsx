import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerService, visitService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAsync, useMutation } from '@/hooks/useAsync';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  FormActions,
  LoadingState,
  PageHeader,
} from '@/components/ui';
import { VisitFormFields } from '@/components/visits/VisitFormFields';
import {
  emptyVisitDraft,
  isPrescriptionEmpty,
  prescriptionToDraft,
  suggestVisitType,
  toVisitInput,
  validateVisitDraft,
  visitDraftHasErrors,
  visitToDraft,
  type VisitDraft,
} from '@/components/visits/draft';
import { RELATIONSHIP_LABELS } from '@/constants/labels';
import { formatDate, formatPhone } from '@/utils/format';
import { findLatestPrescription } from '@/utils/prescriptions';

interface VisitFormPageProps {
  mode: 'create' | 'edit';
}

/**
 * Creates or edits one visit. The customer is shown prominently throughout, so
 * a visit is never recorded against the wrong family member.
 */
export function VisitFormPage({ mode }: VisitFormPageProps) {
  const { customerId = '', visitId = '' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { can } = useAuth();

  const customer = useAsync(() => customerService.getById(customerId), [customerId]);
  const existingVisit = useAsync(
    () => visitService.getById(customerId, visitId),
    [customerId, visitId],
    { enabled: mode === 'edit' },
  );

  // Only needed to pre-fill the customer's current power on a new visit.
  const pastVisits = useAsync(
    () => visitService.listByCustomer(customerId, 20),
    [customerId],
    { enabled: mode === 'create' },
  );

  const [draft, setDraft] = useState<VisitDraft>(emptyVisitDraft);
  const [loadedVisitId, setLoadedVisitId] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Start the "existing prescription" from the latest one on record. Staff
  // check it against the customer's glasses and edit or clear it as needed.
  useEffect(() => {
    if (mode !== 'create' || prefilled || !pastVisits.data) return;
    setPrefilled(true);
    const latest = findLatestPrescription(pastVisits.data);
    if (!latest) return;
    const from = `${latest.visit.visitCode} on ${formatDate(latest.visit.visitDate)}`;
    setDraft((current) => {
      if (current.includeExistingPrescription || !isPrescriptionEmpty(current.existingPrescription)) {
        return current;
      }
      return {
        ...current,
        includeExistingPrescription: true,
        existingPrescription: {
          ...prescriptionToDraft(latest.prescription),
          // The old visit's advice doesn't belong here; record where the
          // values came from instead.
          notes: `As recorded at ${from}.`,
        },
        existingPrefilledFrom: from,
      };
    });
  }, [mode, prefilled, pastVisits.data]);

  useEffect(() => {
    if (mode !== 'edit') return;
    const visit = existingVisit.data;
    if (visit && visit.id !== loadedVisitId) {
      setDraft(visitToDraft(visit));
      setLoadedVisitId(visit.id);
    }
  }, [mode, existingVisit.data, loadedVisitId]);

  const errors = useMemo(() => validateVisitDraft(draft), [draft]);

  const save = useMutation(async () => {
    const input = toVisitInput({ ...draft, visitType: suggestVisitType(draft) });
    if (mode === 'create') {
      await visitService.create(customerId, input);
      notify('Visit recorded.', 'success');
    } else {
      await visitService.update(customerId, visitId, input);
      notify('Visit updated.', 'success');
    }
    navigate(`/customers/${customerId}`);
  });

  const capability = mode === 'create' ? 'visits:create' : 'visits:edit';
  if (!can(capability)) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">
            You do not have permission to {mode === 'create' ? 'record' : 'edit'} visits.
          </p>
        </CardBody>
      </Card>
    );
  }

  if (customer.loading || (mode === 'edit' && existingVisit.loading)) {
    return (
      <Card>
        <LoadingState label="Loading…" />
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

  if (!customer.data) {
    return (
      <Card>
        <EmptyState title="Customer not found" />
      </Card>
    );
  }

  if (mode === 'edit' && !existingVisit.loading && !existingVisit.data) {
    return (
      <Card>
        <EmptyState title="Visit not found" />
      </Card>
    );
  }

  const record = customer.data;

  return (
    <>
      <PageHeader
        title={mode === 'create' ? 'New visit' : 'Edit visit'}
        description={
          mode === 'create'
            ? 'Record what happened during this visit.'
            : existingVisit.data?.visitCode
        }
        backTo={{ label: `Back to ${record.name}`, to: `/customers/${customerId}` }}
      />

      {/* Identity banner — which customer this visit belongs to. */}
      <Card className="mb-5 border-brand-200 bg-brand-50/60">
        <CardHeader
          title="Customer"
          description="This visit will be recorded against this customer only."
        />
        <CardBody>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-base font-semibold text-slate-900">{record.name}</span>
            <span className="font-mono text-xs text-slate-500">{record.customerCode}</span>
            <span className="text-sm tabular-nums text-slate-600">
              {formatPhone(record.phone)}
            </span>
            {record.customerType === 'family_member' && record.relationship && (
              <Badge tone="neutral">{RELATIONSHIP_LABELS[record.relationship]}</Badge>
            )}
          </div>
          {!record.isActive && (
            <p className="mt-2 text-sm text-amber-800">
              This customer is deactivated. Only an admin can record against this record.
            </p>
          )}
        </CardBody>
      </Card>

      <VisitFormFields
        value={draft}
        errors={errors}
        disabled={save.pending}
        onChange={setDraft}
      />

      <FormActions error={save.error}>
        <Button
          variant="secondary"
          onClick={() => navigate(`/customers/${customerId}`)}
          disabled={save.pending}
        >
          Cancel
        </Button>
        <Button
          loading={save.pending}
          disabled={visitDraftHasErrors(errors)}
          onClick={() => void save.run()}
        >
          {mode === 'create' ? 'Save visit' : 'Save changes'}
        </Button>
      </FormActions>
    </>
  );
}
