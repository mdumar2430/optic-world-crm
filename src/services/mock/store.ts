/**
 * In-browser database for the mock data source.
 *
 * State is held in memory and mirrored to localStorage so that a demo survives
 * a page refresh. Nothing here runs when `VITE_DATA_SOURCE=firebase`.
 */
import type { Customer, UserProfile, Visit } from '@/types';
import { buildSeed } from './seed';

export interface MockUser extends UserProfile {
  /** Demo-only. Real credentials never live in the client. */
  password: string;
}

export interface MockDb {
  version: number;
  users: MockUser[];
  customers: Customer[];
  visits: Visit[];
  counters: {
    customer: number;
    visit: number;
    order: number;
    service: number;
  };
}

const STORAGE_KEY = 'optic-world:mock-db';
const SESSION_KEY = 'optic-world:mock-session';
/** Bumping this discards an older cached demo dataset. */
export const SCHEMA_VERSION = 3;

/* -------------------------------------------------------------------------- */
/* Date-aware JSON                                                            */
/* -------------------------------------------------------------------------- */

interface SerialisedDate {
  __type: 'date';
  value: string;
}

function replacer(this: Record<string, unknown>, key: string, value: unknown): unknown {
  // `this[key]` is the pre-toJSON value, so Dates are still Dates here.
  const raw = this[key];
  if (raw instanceof Date) {
    return { __type: 'date', value: raw.toISOString() } satisfies SerialisedDate;
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as SerialisedDate).__type === 'date' &&
    typeof (value as SerialisedDate).value === 'string'
  ) {
    return new Date((value as SerialisedDate).value);
  }
  return value;
}

/* -------------------------------------------------------------------------- */
/* Load / persist                                                             */
/* -------------------------------------------------------------------------- */

let db: MockDb | null = null;

function readFromStorage(): MockDb | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw, reviver) as MockDb;
    if (parsed.version !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    // Corrupt or unavailable storage simply falls back to a fresh seed.
    return null;
  }
}

function writeToStorage(next: MockDb): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next, replacer));
  } catch {
    // Private-mode browsers can refuse writes; the in-memory copy still works.
  }
}

export function getDb(): MockDb {
  if (db) return db;
  db = readFromStorage() ?? buildSeed(SCHEMA_VERSION);
  writeToStorage(db);
  return db;
}

/** Applies a mutation and persists the result. */
export function mutate<T>(fn: (current: MockDb) => T): T {
  const current = getDb();
  const result = fn(current);
  writeToStorage(current);
  return result;
}

/** Wipes the demo dataset and reseeds it. */
export function resetDb(): MockDb {
  db = buildSeed(SCHEMA_VERSION);
  writeToStorage(db);
  return db;
}

/* -------------------------------------------------------------------------- */
/* Session                                                                    */
/* -------------------------------------------------------------------------- */

export function readSessionUid(): string | null {
  try {
    return window.localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function writeSessionUid(uid: string | null): void {
  try {
    if (uid) window.localStorage.setItem(SESSION_KEY, uid);
    else window.localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore: the in-memory listener state still drives the session.
  }
}

/* -------------------------------------------------------------------------- */
/* Code generation                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Mirrors the Firestore counter transaction: codes come from a monotonic
 * counter, never from `array.length + 1`, so they are never reused.
 */
export function nextCustomerCode(current: MockDb): string {
  current.counters.customer += 1;
  return `CUST-${`${current.counters.customer}`.padStart(6, '0')}`;
}

export function nextVisitCode(current: MockDb): string {
  current.counters.visit += 1;
  return `VISIT-${`${current.counters.visit}`.padStart(6, '0')}`;
}

export function nextOrderCode(current: MockDb): string {
  current.counters.order += 1;
  return `ORD-${`${current.counters.order}`.padStart(5, '0')}`;
}

export function nextServiceCode(current: MockDb): string {
  current.counters.service += 1;
  return `SRV-${`${current.counters.service}`.padStart(5, '0')}`;
}

/** Opaque-enough id for embedded orders and services. */
export function randomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Simulated network latency so loading states are visible in the demo. */
export function delay<T>(value: T, ms = 220): Promise<T> {
  return new Promise((resolve) => {
    window.setTimeout(() => resolve(value), ms);
  });
}

export type { Customer, Visit, UserProfile };
