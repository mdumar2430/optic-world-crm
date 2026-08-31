import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useMutation } from '@/hooks/useAsync';
import { Button, Card, CardBody, FormError, Input } from '@/components/ui';
import { isValidEmail } from '@/utils/validation';

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [sent, setSent] = useState(false);

  const { run, pending, error } = useMutation(async (address: string) => {
    await resetPassword(address);
    setSent(true);
  });

  const emailError = touched && !isValidEmail(email) ? 'Enter a valid email address' : undefined;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (!isValidEmail(email)) return;
    void run(email);
  };

  return (
    <Card>
      <CardBody>
        <h2 className="text-lg font-semibold text-slate-900">Reset your password</h2>

        {sent ? (
          <>
            <p className="mt-2 text-sm text-slate-600">
              If an account exists for <span className="font-medium">{email}</span>, a reset link
              is on its way. Check the inbox and the spam folder.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-block text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate-500">
              Enter your email and we will send you a link to set a new password.
            </p>
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
              <FormError message={error} />
              <Button type="submit" fullWidth size="lg" loading={pending}>
                Send reset link
              </Button>
            </form>
            <div className="mt-4 text-center">
              <Link
                to="/login"
                className="text-sm font-medium text-brand-700 underline-offset-2 hover:underline"
              >
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}
