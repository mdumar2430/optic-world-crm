import { useState } from 'react';
import type { UserProfile, UserRole } from '@/types';
import { USER_ROLES } from '@/types';
import { employeeService, dataSource } from '@/services';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useAsync, useMutation } from '@/hooks/useAsync';
import { USER_ROLE_LABELS } from '@/constants/labels';
import {
  ActiveBadge,
  Badge,
  Button,
  Card,
  CardBody,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  FormError,
  Input,
  Modal,
  PageHeader,
  Select,
  SkeletonRows,
} from '@/components/ui';
import { formatDate } from '@/utils/format';
import {
  generateTemporaryPassword,
  isValidEmail,
  isBlank,
  passwordProblem,
} from '@/utils/validation';

const ROLE_OPTIONS = USER_ROLES.map((value) => ({ value, label: USER_ROLE_LABELS[value] }));

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

interface CreateFormState {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

function emptyForm(): CreateFormState {
  return { fullName: '', email: '', password: '', role: 'employee' };
}

export function EmployeesPage() {
  const { user } = useAuth();
  const { notify } = useToast();

  const employees = useAsync(() => employeeService.list(), []);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CreateFormState, string>>>({});
  const [pendingDeactivate, setPendingDeactivate] = useState<UserProfile | null>(null);

  const replaceEmployee = (updated: UserProfile) => {
    if (!employees.data) return;
    employees.setData(
      employees.data.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
  };

  const create = useMutation(async () => {
    const errors: Partial<Record<keyof CreateFormState, string>> = {};
    if (isBlank(form.fullName)) errors.fullName = 'Full name is required';
    if (!isValidEmail(form.email)) errors.email = 'Enter a valid email address';
    const passwordIssue = passwordProblem(form.password);
    if (passwordIssue) errors.password = passwordIssue;
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return null;

    const created = await employeeService.create({
      fullName: form.fullName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      role: form.role,
    });
    employees.setData([created, ...(employees.data ?? [])]);
    setCreateOpen(false);
    setForm(emptyForm());
    notify(`${created.fullName} can now sign in.`, 'success');
    return created;
  });

  const setActive = useMutation(async (target: UserProfile, isActive: boolean) => {
    const updated = await employeeService.setActive(target.id, isActive);
    replaceEmployee(updated);
    setPendingDeactivate(null);
    notify(
      isActive ? `${updated.fullName} reactivated.` : `${updated.fullName} deactivated.`,
      'success',
    );
    return updated;
  });

  const setRole = useMutation(async (target: UserProfile, role: UserRole) => {
    const updated = await employeeService.setRole(target.id, role);
    replaceEmployee(updated);
    notify(`${updated.fullName} is now ${USER_ROLE_LABELS[role].toLowerCase()}.`, 'success');
    return updated;
  });

  const rows = employees.data ?? [];

  return (
    <>
      <PageHeader
        title="Employees"
        description="Only admins can create accounts or change roles."
        actions={
          <Button icon={PlusIcon} onClick={() => setCreateOpen(true)}>
            Add employee
          </Button>
        }
      />

      <Card>
        {employees.loading ? (
          <CardBody>
            <SkeletonRows rows={4} />
          </CardBody>
        ) : employees.error ? (
          <ErrorState message={employees.error} onRetry={employees.reload} />
        ) : rows.length === 0 ? (
          <EmptyState title="No employees yet" description="Add the first staff account." />
        ) : (
          <>
            <div className="hidden lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th scope="col" className="px-6 py-3">Name</th>
                    <th scope="col" className="px-6 py-3">Email</th>
                    <th scope="col" className="px-6 py-3">Role</th>
                    <th scope="col" className="px-6 py-3">Status</th>
                    <th scope="col" className="px-6 py-3">Created</th>
                    <th scope="col" className="px-6 py-3 text-right">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((employee) => {
                    const isSelf = employee.id === user?.uid;
                    return (
                      <tr key={employee.id} className="transition hover:bg-slate-50">
                        <td className="px-6 py-3 font-medium text-slate-900">
                          {employee.fullName}
                          {isSelf && <span className="ml-2 text-xs text-slate-500">(you)</span>}
                        </td>
                        <td className="px-6 py-3 text-slate-600">{employee.email}</td>
                        <td className="px-6 py-3">
                          <Select
                            label="Role"
                            containerClassName="[&>label]:sr-only"
                            className="h-9 w-32"
                            value={employee.role}
                            options={ROLE_OPTIONS}
                            disabled={isSelf || setRole.pending || !employee.isActive}
                            onChange={(event) =>
                              void setRole.run(employee, event.target.value as UserRole)
                            }
                          />
                        </td>
                        <td className="px-6 py-3">
                          <ActiveBadge isActive={employee.isActive} />
                        </td>
                        <td className="px-6 py-3 text-slate-600">
                          {formatDate(employee.createdAt)}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {employee.isActive ? (
                            <Button
                              variant="danger"
                              size="sm"
                              disabled={isSelf}
                              onClick={() => setPendingDeactivate(employee)}
                            >
                              Deactivate
                            </Button>
                          ) : (
                            <Button
                              variant="secondary"
                              size="sm"
                              loading={setActive.pending}
                              onClick={() => void setActive.run(employee, true)}
                            >
                              Reactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-slate-100 lg:hidden">
              {rows.map((employee) => {
                const isSelf = employee.id === user?.uid;
                return (
                  <li key={employee.id} className="px-4 py-4 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900">{employee.fullName}</span>
                      {isSelf && <span className="text-xs text-slate-500">(you)</span>}
                      <Badge tone={employee.role === 'admin' ? 'info' : 'neutral'}>
                        {USER_ROLE_LABELS[employee.role]}
                      </Badge>
                      <ActiveBadge isActive={employee.isActive} />
                    </div>
                    <p className="mt-1 break-all text-sm text-slate-600">{employee.email}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Added {formatDate(employee.createdAt)}
                    </p>

                    {!isSelf && (
                      <div className="mt-3 flex flex-wrap items-end gap-2">
                        <Select
                          label="Role"
                          containerClassName="w-36"
                          value={employee.role}
                          options={ROLE_OPTIONS}
                          disabled={setRole.pending || !employee.isActive}
                          onChange={(event) =>
                            void setRole.run(employee, event.target.value as UserRole)
                          }
                        />
                        {employee.isActive ? (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setPendingDeactivate(employee)}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            loading={setActive.pending}
                            onClick={() => void setActive.run(employee, true)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <FormError message={setRole.error ?? setActive.error} />

      <Modal
        open={createOpen}
        onClose={() => {
          if (!create.pending) setCreateOpen(false);
        }}
        title="Add employee"
        description="The account is created on the server, so you stay signed in."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCreateOpen(false)}
              disabled={create.pending}
            >
              Cancel
            </Button>
            <Button loading={create.pending} onClick={() => void create.run()}>
              Create employee
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full name"
            required
            value={form.fullName}
            error={formErrors.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            disabled={create.pending}
            placeholder="e.g. Priya Nair"
          />
          <Input
            label="Email"
            type="email"
            required
            autoComplete="off"
            value={form.email}
            error={formErrors.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            disabled={create.pending}
            placeholder="name@opticworld.in"
          />
          <div className="space-y-2">
            <Input
              label="Temporary password"
              type="text"
              required
              autoComplete="off"
              value={form.password}
              error={formErrors.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              disabled={create.pending}
              hint="Share this with the employee. They can change it from the login screen."
            />
            <Button
              variant="ghost"
              size="sm"
              disabled={create.pending}
              onClick={() => setForm({ ...form, password: generateTemporaryPassword() })}
            >
              Generate a password
            </Button>
          </div>
          <Select
            label="Role"
            required
            value={form.role}
            options={ROLE_OPTIONS}
            onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}
            disabled={create.pending}
            hint="Admins can manage employees. Employees cannot."
          />

          {dataSource === 'mock' && (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              In demo mode the account is stored in this browser only. With Firebase connected,
              this creates a Firebase login and a profile that only an admin is allowed to write.
            </p>
          )}

          <FormError message={create.error} />
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDeactivate !== null}
        title="Deactivate this employee?"
        description={
          pendingDeactivate
            ? `${pendingDeactivate.fullName} will no longer be able to sign in. Their name stays on the records they created.`
            : ''
        }
        confirmLabel="Deactivate"
        tone="danger"
        pending={setActive.pending}
        error={setActive.error}
        onConfirm={() => {
          if (pendingDeactivate) void setActive.run(pendingDeactivate, false);
        }}
        onCancel={() => setPendingDeactivate(null)}
      />
    </>
  );
}
