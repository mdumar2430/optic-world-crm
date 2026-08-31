/**
 * Chooses the data source once, at module load.
 *
 * Everything above this line in the dependency graph — pages, hooks,
 * components — imports only from here and from `./contracts`, so neither
 * Firebase nor the mock dataset leaks into the UI layer.
 */
import { isFirebaseConfigured } from '@/lib/firebase';
import type { DataProvider } from './contracts';
import { firebaseProvider } from './firebase/provider';
import { mockProvider } from './mock/provider';

export type DataSource = 'mock' | 'firebase';

function resolveDataSource(): DataSource {
  const configured = import.meta.env.VITE_DATA_SOURCE;
  if (configured === 'firebase') {
    if (!isFirebaseConfigured()) {
      // Fail loudly rather than silently serving demo data in production.
      throw new Error(
        'VITE_DATA_SOURCE=firebase but the VITE_FIREBASE_* values are missing. ' +
          'Fill them in, or set VITE_DATA_SOURCE=mock.',
      );
    }
    return 'firebase';
  }
  return 'mock';
}

export const dataSource: DataSource = resolveDataSource();

const provider: DataProvider = dataSource === 'firebase' ? firebaseProvider : mockProvider;

export const authService = provider.auth;
export const customerService = provider.customers;
export const visitService = provider.visits;
export const employeeService = provider.employees;
export const dashboardService = provider.dashboard;
export const directoryService = provider.directory;

export * from './contracts';
