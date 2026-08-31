import { Outlet } from 'react-router-dom';

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-white">
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
                <circle cx="8" cy="12" r="4" />
                <circle cx="16.5" cy="12" r="4" />
                <path d="M12 11.4h.5" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">Optic World</h1>
              <p className="text-sm text-slate-500">Customer management</p>
            </div>
          </div>
          <Outlet />
        </div>
      </div>
      <footer className="px-4 pb-6 text-center text-xs text-slate-400">
        Staff access only. Contact your store admin if you cannot sign in.
      </footer>
    </div>
  );
}
