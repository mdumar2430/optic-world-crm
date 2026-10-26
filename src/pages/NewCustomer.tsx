import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Customer, RelationshipType } from '@/types';
import { RELATIONSHIP_TYPES } from '@/types';
import { customerService, type DuplicateMatch } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { messageFromError, useMutation } from '@/hooks/useAsync';
import { RELATIONSHIP_LABELS } from '@/constants/labels';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  FormActions,
  Input,
  PageHeader,
  Select,
} from '@/components/ui';
import { CustomerFormFields } from '@/components/customers/CustomerFormFields';
import { DuplicateWarning } from '@/components/customers/DuplicateWarning';
import {
  emptyCustomerDraft,
  toCustomerInput,
  validateCustomerDraft,
  type CustomerDraft,
  type CustomerDraftErrors,
} from '@/components/customers/draft';
import { VisitFormFields } from '@/components/visits/VisitFormFields';
import {
  emptyVisitDraft,
  suggestVisitType,
  toVisitInput,
  validateVisitDraft,
  visitDraftHasErrors,
  type VisitDraft,
} from '@/components/visits/draft';
import { hasErrors } from '@/utils/validation';

const RELATIONSHIP_OPTIONS = RELATIONSHIP_TYPES.map((value) => ({
  value,
  label: RELATIONSHIP_LABELS[value],
}));

type Step = 'details' | 'visit';

/** True when `candidate` is `primary`, or belongs to the same family group. */
function isSameHousehold(candidate: Customer, primary: Customer): boolean {
  const headId = primary.primaryCustomerId ?? primary.id;
  return candidate.id === headId || candidate.primaryCustomerId === headId;
}

/**
 * Creates a customer and their first visit together.
 *
 * A customer with no visit is not a complete business record, so both are
 * written as one unit by `createWithInitialVisit`.
 */
export function NewCustomerPage() {
  const navigate = useNavigate();
  const { notify } = useToast();
  const { can } = useAuth();
  const [searchParams] = useSearchParams();

  // Set when arriving from "Add family member" on a customer's page.
  const primaryId = searchParams.get('primaryId');

  const [step, setStep] = useState<Step>('details');
  const [customerDraft, setCustomerDraft] = useState<CustomerDraft>(emptyCustomerDraft);
  const [visitDraft, setVisitDraft] = useState<VisitDraft>(emptyVisitDraft);
  const [customerErrors, setCustomerErrors] = useState<CustomerDraftErrors>({});
  const [relationship, setRelationship] = useState<RelationshipType>('son');
  const [relationshipNote, setRelationshipNote] = useState('');

  const [primary, setPrimary] = useState<Customer | null>(null);
  const [primaryError, setPrimaryError] = useState<string | null>(null);

  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [duplicatesAcknowledged, setDuplicatesAcknowledged] = useState(false);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);

  const visitErrors = useMemo(() => validateVisitDraft(visitDraft), [visitDraft]);

  useEffect(() => {
    if (!primaryId) return;
    let cancelled = false;
    customerService
      .getById(primaryId)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setPrimaryError('The primary customer could not be found.');
          return;
        }
        setPrimary(found);
        // A child or elderly parent often has no phone of their own, and a
        // household shares an address: start from the primary's, never
        // overwriting anything already typed.
        setCustomerDraft((current) => ({
          ...current,
          phone: current.phone || found.phone,
          line1: current.line1 || found.address.line1,
          line2: current.line2 || found.address.line2,
          city: current.city || found.address.city,
          state: current.state || found.address.state,
          postalCode: current.postalCode || found.address.postalCode,
        }));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setPrimaryError(messageFromError(caught));
      });
    return () => {
      cancelled = true;
    };
  }, [primaryId]);

  const create = useMutation(async () => {
    const relationshipFields = primary
      ? {
          customerType: 'family_member' as const,
          primaryCustomerId: primary.id,
          relationship,
          relationshipNote: relationship === 'other' ? relationshipNote.trim() || null : null,
        }
      : {
          customerType: 'primary' as const,
          primaryCustomerId: null,
          relationship: null,
          relationshipNote: null,
        };

    const result = await customerService.createWithInitialVisit(
      toCustomerInput(customerDraft, relationshipFields),
      toVisitInput({ ...visitDraft, visitType: suggestVisitType(visitDraft) }),
    );
    notify(`${result.customer.name} created as ${result.customer.customerCode}.`, 'success');
    navigate(`/customers/${result.customer.id}`, { replace: true });
    return result;
  });

  const goToVisitStep = async () => {
    const errors = validateCustomerDraft(customerDraft);
    setCustomerErrors(errors);
    if (hasErrors(errors)) return;

    // Warn about likely duplicates before the record is created, not after.
    if (!duplicatesAcknowledged) {
      setCheckingDuplicates(true);
      try {
        const found = await customerService.findPossibleDuplicates({
          name: customerDraft.name,
          phone: customerDraft.phone,
        });
        // The household's shared number is expected when adding a family
        // member; only a name match is worth stopping for.
        const matches = primary
          ? found.filter(
              (match) => !(match.reason === 'phone' && isSameHousehold(match.customer, primary)),
            )
          : found;
        setDuplicates(matches);
        if (matches.length > 0) {
          setCheckingDuplicates(false);
          return;
        }
      } catch {
        // A failed duplicate check must not block the staff member.
      } finally {
        setCheckingDuplicates(false);
      }
    }

    setStep('visit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (!can('customers:create')) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">You do not have permission to create customers.</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={primary ? 'New family member' : 'New customer'}
        description={
          step === 'details'
            ? 'Step 1 of 2 — customer information'
            : 'Step 2 of 2 — first visit'
        }
        backTo={
          primary
            ? { label: `Back to ${primary.name}`, to: `/customers/${primary.id}` }
            : { label: 'Back to customers', to: '/customers' }
        }
      />

      {primaryId && (
        <Card className="mb-5 border-brand-200 bg-brand-50/60">
          <CardBody>
            {primaryError ? (
              <p className="text-sm text-red-700">{primaryError}</p>
            ) : primary ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                    Adding a family member of
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{primary.name}</p>
                  <p className="font-mono text-xs text-slate-500">{primary.customerCode}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Phone number and address start as {primary.name}&apos;s — change them below
                    if this family member has their own.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Select
                    label="Relationship to this customer"
                    required
                    value={relationship}
                    options={RELATIONSHIP_OPTIONS}
                    onChange={(event) =>
                      setRelationship(event.target.value as RelationshipType)
                    }
                    disabled={create.pending}
                    hint={`The new customer is the ${RELATIONSHIP_LABELS[
                      relationship
                    ].toLowerCase()} of ${primary.name}`}
                  />
                  {relationship === 'other' && (
                    <Input
                      label="Describe the relationship"
                      value={relationshipNote}
                      onChange={(event) => setRelationshipNote(event.target.value)}
                      disabled={create.pending}
                      placeholder="e.g. Guardian"
                    />
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">Loading primary customer…</p>
            )}
          </CardBody>
        </Card>
      )}

      {step === 'details' ? (
        <>
          {duplicates.length > 0 && !duplicatesAcknowledged && (
            <div className="mb-5">
              <DuplicateWarning
                matches={duplicates}
                onDismiss={() => {
                  setDuplicatesAcknowledged(true);
                  setDuplicates([]);
                  setStep('visit');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          )}

          <CustomerFormFields
            value={customerDraft}
            errors={customerErrors}
            onChange={setCustomerDraft}
            phoneHint={
              primary && customerDraft.phone === primary.phone
                ? `Same as ${primary.name}'s number. Change it if they have their own.`
                : undefined
            }
          />

          <FormActions>
            <Button variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button loading={checkingDuplicates} onClick={() => void goToVisitStep()}>
              Continue to first visit
            </Button>
          </FormActions>
        </>
      ) : (
        <>
          <Card className="mb-5">
            <CardHeader
              title="Customer"
              description="This visit will be recorded against the customer below."
              actions={
                <Button variant="secondary" size="sm" onClick={() => setStep('details')}>
                  Edit details
                </Button>
              }
            />
            <CardBody>
              <p className="text-sm font-semibold text-slate-900">{customerDraft.name}</p>
              <p className="text-sm text-slate-600">{customerDraft.phone}</p>
              <p className="mt-1 text-xs text-slate-500">
                A customer ID will be assigned automatically when you save.
              </p>
            </CardBody>
          </Card>

          <VisitFormFields
            value={visitDraft}
            errors={visitErrors}
            disabled={create.pending}
            onChange={setVisitDraft}
          />

          <FormActions error={create.error}>
            <Button
              variant="secondary"
              onClick={() => setStep('details')}
              disabled={create.pending}
            >
              Back
            </Button>
            <Button
              loading={create.pending}
              disabled={visitDraftHasErrors(visitErrors)}
              onClick={() => void create.run()}
            >
              Save customer and visit
            </Button>
          </FormActions>
        </>
      )}
    </>
  );
}
