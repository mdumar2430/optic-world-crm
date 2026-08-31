/**
 * Firebase bootstrap.
 *
 * Initialisation is lazy so that the demo (`VITE_DATA_SOURCE=mock`) never needs
 * a Firebase project, and so a missing config fails with a clear message rather
 * than a cryptic SDK error at module-load time.
 *
 * The values below are the Firebase *web* config. They are identifiers, not
 * secrets — access is enforced by Security Rules and Cloud Functions. Service
 * account credentials must never appear in this app.
 */
import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, type Functions } from 'firebase/functions';

const env = import.meta.env;

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const FUNCTIONS_REGION = env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';
const USE_EMULATORS = env.VITE_USE_FIREBASE_EMULATORS === 'true';

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let functionsInstance: Functions | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
}

function getApp(): FirebaseApp {
  if (app) return app;
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase is not configured. Copy .env.example to .env and fill in the VITE_FIREBASE_* values, ' +
        'or set VITE_DATA_SOURCE=mock to run against the built-in demo dataset.',
    );
  }
  app = initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (authInstance) return authInstance;
  authInstance = getAuth(getApp());
  if (USE_EMULATORS) {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return authInstance;
}

export function getDb(): Firestore {
  if (firestoreInstance) return firestoreInstance;
  firestoreInstance = getFirestore(getApp());
  if (USE_EMULATORS) connectFirestoreEmulator(firestoreInstance, '127.0.0.1', 8080);
  return firestoreInstance;
}

export function getFns(): Functions {
  if (functionsInstance) return functionsInstance;
  functionsInstance = getFunctions(getApp(), FUNCTIONS_REGION);
  if (USE_EMULATORS) connectFunctionsEmulator(functionsInstance, '127.0.0.1', 5001);
  return functionsInstance;
}

/** Collection and document paths, in one place so they never drift. */
export const paths = {
  users: 'users',
  user: (uid: string) => `users/${uid}`,
  customers: 'customers',
  customer: (customerId: string) => `customers/${customerId}`,
  visits: (customerId: string) => `customers/${customerId}/visits`,
  visit: (customerId: string, visitId: string) => `customers/${customerId}/visits/${visitId}`,
  counters: 'counters',
  counter: (name: string) => `counters/${name}`,
} as const;
