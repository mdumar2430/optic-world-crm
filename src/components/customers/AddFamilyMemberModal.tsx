import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Customer, RelationshipType } from '@/types';
import { RELATIONSHIP_TYPES } from '@/types';
import { customerService } from '@/services';
import { useMutation } from '@/hooks/useAsync';
import { RELATIONSHIP_LABELS } from '@/constants/labels';
import { Button, FormError, Input, Modal, Select } from '@/components/ui';
import { CustomerPicker } from './CustomerPicker';

const RELATIONSHIP_OPTIONS = RELATIONSHIP_TYPES.map((value) => ({
  value,
  label: RELATIONSHIP_LABELS[value],
}));

interface AddFamilyMemberModalProps {
  open: boolean;
  primary: Customer;
  /** Ids already related, so they cannot be linked twice. */
  excludeIds: string[];
  onClose: () => void;
  onLinked: () => void;
}

/**
 * Two ways to add a family member: link a customer who already exists, or
 * create a new one. Both keep the family member as an independent customer
 * record with their own visits, orders and services.
 */
export function AddFamilyMemberModal({
  open,
  primary,
  excludeIds,
  onClose,
  onLinked,
}: AddFamilyMemberModalProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Customer | null>(null);
  const [relationship, setRelationship] = useState<RelationshipType>('son');
  const [relationshipNote, setRelationshipNote] = useState('');

  const link = useMutation(async () => {
    if (!selected) return;
    await customerService.linkFamilyMember({
      primaryCustomerId: primary.id,
      memberCustomerId: selected.id,
      relationship,
      relationshipNote: relationship === 'other' ? relationshipNote.trim() || null : null,
    });
    setSelected(null);
    setRelationshipNote('');
    onLinked();
  });

  const close = () => {
    if (link.pending) return;
    setSelected(null);
    setRelationshipNote('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Link an existing customer"
      description={`Link a customer who is already in the system to ${primary.name}.`}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={link.pending}>
            Cancel
          </Button>
          <Button loading={link.pending} disabled={!selected} onClick={() => void link.run()}>
            Save relationship
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-4">
          <CustomerPicker
            label="Existing customer"
            excludeIds={[primary.id, ...excludeIds]}
            selected={selected}
            onSelect={setSelected}
            disabled={link.pending}
          />

          {selected && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Relationship"
                required
                value={relationship}
                options={RELATIONSHIP_OPTIONS}
                onChange={(event) => setRelationship(event.target.value as RelationshipType)}
                disabled={link.pending}
                hint={`${selected.name} is the ${RELATIONSHIP_LABELS[
                  relationship
                ].toLowerCase()} of ${primary.name}`}
              />
              {relationship === 'other' && (
                <Input
                  label="Describe the relationship"
                  value={relationshipNote}
                  onChange={(event) => setRelationshipNote(event.target.value)}
                  disabled={link.pending}
                  placeholder="e.g. Guardian"
                />
              )}
            </div>
          )}

          <FormError message={link.error} />
        </div>

        <div className="border-t border-slate-200 pt-4">
          <p className="text-sm font-medium text-slate-900">Not in the system yet?</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Create them as a new customer with their own record and visit history.
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            disabled={link.pending}
            onClick={() => navigate(`/customers/new?primaryId=${primary.id}`)}
          >
            Create a new family member
          </Button>
        </div>
      </div>
    </Modal>
  );
}
