import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { LoadingState } from '@/components/ui';
import { isAdmin } from '@/utils/permissions';

/** Full-screen placeholder while the first auth state resolves. */
function Booting() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <LoadingState label="Checking your session…" />
    </div>
  );
}

/** Blocks anything under it until a user is signed in. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const { user, initialising } = useAuth();
  const location = useLocation();

  if (initialising) return <Booting />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children ?? <Outlet />}</>;
}

/**
 * Admin-only routes.
 *
 * This hides the screen; Firestore rules reject the same requests
 * independently, so bypassing this changes nothing.
 */
export function RequireAdmin({ children }: { children?: ReactNode }) {
  const { user, initialising } = useAuth();

  if (initialising) return <Booting />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin(user)) return <Navigate to="/dashboard" replace />;
  return <>{children ?? <Outlet />}</>;
}

/** Keeps a signed-in user away from the login screen. */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { user, initialising } = useAuth();

  if (initialising) return <Booting />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
