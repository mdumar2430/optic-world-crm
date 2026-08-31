import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customerService } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAsync, useMutation } from '@/hooks/useAsync';
import {
  Button,
  Card,
  CardBody,
  EmptyState,
  ErrorState,
  FormError,
  LoadingState,
  PageHeader,
} from '@/components/ui';
import { CustomerFormFields } from '@/components/customers/CustomerFormFields';
import {
  customerToDraft,
  emptyCustomerDraft,
  toCustomerInput,
  validateCustomerDraft,
  type CustomerDraft,
  type CustomerDraftErrors,
} from '@/components/customers/draft';
import { hasErrors } from '@/utils/validation';

export function EditCustomerPage() {
  const { customerId = '' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { can } = useAuth();

  const customer = useAsync(() => customerService.getById(customerId), [customerId]);
  const [draft, setDraft] = useState<CustomerDraft>(emptyCustomerDraft);
  const [errors, setErrors] = useState<CustomerDraftErrors>({});

  useEffect(() => {
    if (customer.data) setDraft(customerToDraft(customer.data));
  }, [customer.data]);

  const save = useMutation(async () => {
    const record = customer.data;
    if (!record) return null;

    const validation = validateCustomerDraft(draft);
    setErrors(validation);
    if (hasErrors(validation)) return null;

    // Relationship fields are managed from the family section, not this form.
    const updated = await customerService.update(
      customerId,
      toCustomerInput(draft, {
        customerType: record.customerType,
        primaryCustomerId: record.primaryCustomerId,
        relationship: record.relationship,
        relationshipNote: record.relationshipNote,
      }),
    );
    notify(`${updated.name} updated.`, 'success');
    navigate(`/customers/${customerId}`);
    return updated;
  });

  if (!can('customers:edit')) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-slate-600">You do not have permission to edit customers.</p>
        </CardBody>
      </Card>
    );
  }

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

  if (!customer.data) {
    return (
      <Card>
        <EmptyState title="Customer not found" />
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        title={`Edit ${customer.data.name}`}
        description={customer.data.customerCode}
        backTo={{ label: 'Back to customer', to: `/customers/${customerId}` }}
      />

      <CustomerFormFields
        value={draft}
        errors={errors}
        disabled={save.pending}
        onChange={setDraft}
      />

      <div className="mt-5 space-y-3">
        <FormError message={save.error} />
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            onClick={() => navigate(`/customers/${customerId}`)}
            disabled={save.pending}
          >
            Cancel
          </Button>
          <Button loading={save.pending} onClick={() => void save.run()}>
            Save changes
          </Button>
        </div>
      </div>
    </>
  );
}
