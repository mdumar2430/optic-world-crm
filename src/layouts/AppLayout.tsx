import { useEffect, useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { USER_ROLE_LABELS } from '@/constants/labels';
import { dataSource } from '@/services';
import { cn } from '@/utils/cn';
import { initialsOf } from '@/utils/format';
import { isAdmin } from '@/utils/permissions';
import { Button } from '@/components/ui';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  adminOnly?: boolean;
}

const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

const NAV_ITEMS: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="h-5 w-5" {...iconProps}>
        <rect x="3" y="3" width="7" height="8" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="11" width="7" height="10" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    to: '/customers',
    label: 'Customers',
    icon: (
      <svg className="h-5 w-5" {...iconProps}>
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
        <path d="M16 5.5a3 3 0 0 1 0 5.8M17.5 20a6 6 0 0 0-2-4.5" />
      </svg>
    ),
  },
  {
    to: '/employees',
    label: 'Employees',
    adminOnly: true,
    icon: (
      <svg className="h-5 w-5" {...iconProps}>
        <rect x="3" y="7" width="18" height="13" rx="2" />
        <path d="M8.5 7V5.5A1.5 1.5 0 0 1 10 4h4a1.5 1.5 0 0 1 1.5 1.5V7M3 12h18" />
      </svg>
    ),
  },
];

function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white">
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <circle cx="8" cy="12" r="4" />
          <circle cx="16.5" cy="12" r="4" />
          <path d="M12 11.4h.5" strokeLinecap="round" />
        </svg>
      </span>
      {!compact && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">Optic World</span>
          <span className="block truncate text-xs text-slate-500">Customer management</span>
        </span>
      )}
    </div>
  );
}

function navLinkClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  );
}

export function AppLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close the mobile menu whenever navigation happens.
  useEffect(() => setMenuOpen(false), [location.pathname]);

  // BrowserRouter keeps the old scroll position; a new page should open at its top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin(user));

  const profileBlock = (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
        {initialsOf(user?.fullName ?? '')}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">{user?.fullName}</span>
        <span className="block truncate text-xs text-slate-500">
          {user ? USER_ROLE_LABELS[user.role] : ''}
        </span>
      </span>
    </div>
  );

  return (
    <div className="min-h-dvh bg-slate-50">
      {dataSource === 'mock' && (
        <div className="bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-900 ring-1 ring-inset ring-amber-200">
          Demo mode — sample data stored in this browser. No Firebase project is connected.
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="border-b border-slate-200 px-5 py-4">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Main">
          {items.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="space-y-3 border-t border-slate-200 p-3">
          {profileBlock}
          <Button variant="secondary" size="sm" fullWidth onClick={() => void signOut()}>
            Log out
          </Button>
        </div>
      </aside>

      {/* Mobile / tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
        <Logo compact />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
          Optic World
        </span>
        {/* Navigation lives in the bottom bar; this opens the account panel. */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full text-xs font-semibold transition',
            menuOpen
              ? 'bg-brand-600 text-white'
              : 'bg-slate-200 text-slate-700 hover:bg-slate-300',
          )}
          aria-expanded={menuOpen}
          aria-controls="account-menu"
          aria-label={menuOpen ? 'Close account menu' : 'Open account menu'}
        >
          {menuOpen ? (
            <svg className="h-5 w-5" {...iconProps}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          ) : (
            initialsOf(user?.fullName ?? '')
          )}
        </button>

        {/* Hangs off the bar itself, so it lines up wherever the bar sits
            (the demo banner can push it down). */}
        {menuOpen && (
          <div
            id="account-menu"
            className="absolute inset-x-0 top-full space-y-3 border-b border-slate-200 bg-white p-4 shadow-panel animate-slide-up"
          >
            {profileBlock}
            <Button variant="secondary" fullWidth onClick={() => void signOut()}>
              Log out
            </Button>
          </div>
        )}
      </header>

      {menuOpen && (
        <div
          className="fixed inset-0 z-20 bg-slate-900/30 animate-fade-in lg:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <main className="px-4 pb-24 pt-5 sm:px-6 lg:ml-64 lg:pb-10 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom navigation, sized for thumbs. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-slate-200 bg-white pb-safe lg:hidden"
        aria-label="Main"
      >
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium transition',
                isActive ? 'text-brand-700' : 'text-slate-500',
              )
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
