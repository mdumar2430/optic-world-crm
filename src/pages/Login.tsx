import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useMutation } from '@/hooks/useAsync';
import { dataSource } from '@/services';
import { Button, Card, CardBody, FormError, Input } from '@/components/ui';
import { isValidEmail } from '@/utils/validation';

interface LocationState {
  from?: string;
}

/** Demo accounts, shown only when the app runs against the mock dataset. */
const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@opticworld.in', password: 'Admin@123' },
  { label: 'Employee', email: 'priya@opticworld.in', password: 'Staff@123' },
];

export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);

  const { run, pending, error } = useMutation(async (nextEmail: string, nextPassword: string) => {
    await signIn(nextEmail, nextPassword);
    const state = location.state as LocationState | null;
    navigate(state?.from ?? '/dashboard', { replace: true });
  });

  const emailError = touched && !isValidEmail(email) ? 'Enter a valid email address' : undefined;
  const passwordError = touched && password.length === 0 ? 'Enter your password' : undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!isValidEmail(email) || password.length === 0) return;
    void run(email, password);
  };

  const useDemoAccount = (account: (typeof DEMO_ACCOUNTS)[number]) => {
    setEmail(account.email);
    setPassword(account.password);
    setTouched(false);
  };

  return (
    <Card>
      <CardBody>
        <h2 className="text-lg font-semibold text-slate-900">Sign in</h2>
        <p className="mt-1 text-sm text-slate-500">Use the account your store admin gave you.</p>

        <form className="mt-5 space-y-4" onSubmit={onSubmit} noValidate>
          <Input
            label="Email"
            type="email"
            required
            autoComplete="username"
            autoFocus
            value={email}
            error={emailError}
            onChange={(event) => setEmail(event.target.value)}
            disabled={pending}
            placeholder="you@opticworld.in"
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            error={passwordError}
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
          />

          <FormError message={error} />

          <Button type="submit" fullWidth size="lg" loading={pending}>
            Sign in
          </Button>
        </form>

        <div className="mt-4 text-center">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {dataSource === 'mock' && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Demo accounts
            </p>
            <ul className="mt-2 space-y-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <li key={account.email} className="flex items-center justify-between gap-3">
                  <span className="min-w-0 text-sm text-slate-600">
                    <span className="font-medium text-slate-800">{account.label}</span>
                    <span className="mx-1.5 text-slate-300">·</span>
                    <span className="truncate">{account.email}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => useDemoAccount(account)}
                    disabled={pending}
                    className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-800 disabled:opacity-50"
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
