/**
 * Privileged operations for Optic World.
 *
 * Everything here runs with the Admin SDK, which bypasses Security Rules, so
 * each callable re-verifies the caller before doing anything:
 *
 *   1. The request is authenticated.
 *   2. The caller's `role` custom claim is `admin`.
 *   3. The caller's own account is still enabled.
 *
 * Employee creation lives here rather than in the browser because
 * `createUserWithEmailAndPassword` signs the *current* user out — an admin
 * adding staff would be logged out on every save.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { logger } from 'firebase-functions';

initializeApp();

// Keep this in step with VITE_FIREBASE_FUNCTIONS_REGION in the web app.
setGlobalOptions({ region: 'asia-south1', maxInstances: 10 });

const auth = getAuth();
const db = getFirestore();

type UserRole = 'admin' | 'employee';

interface UserProfilePayload {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

/* -------------------------------------------------------------------------- */
/* Guards                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Confirms the caller is a signed-in, enabled admin.
 *
 * The role is read from the verified ID token, never from the request body —
 * a client-supplied role or admin flag is not evidence of anything.
 */
async function requireAdmin(request: CallableRequest<unknown>): Promise<string> {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  if (request.auth?.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only an admin can perform this action.');
  }

  // A token stays valid until it expires, so re-check the account is enabled.
  const caller = await auth.getUser(callerUid);
  if (caller.disabled) {
    throw new HttpsError('permission-denied', 'This account has been deactivated.');
  }

  return callerUid;
}

/* -------------------------------------------------------------------------- */
/* Validation                                                                 */
/* -------------------------------------------------------------------------- */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function assertString(value: unknown, field: string, max: number): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', `${field} is required.`);
  }
  const trimmed = value.trim();
  if (trimmed.length > max) {
    throw new HttpsError('invalid-argument', `${field} is too long.`);
  }
  return trimmed;
}

function assertRole(value: unknown): UserRole {
  if (value !== 'admin' && value !== 'employee') {
    throw new HttpsError('invalid-argument', 'Role must be either admin or employee.');
  }
  return value;
}

function assertPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 8) {
    throw new HttpsError('invalid-argument', 'Password must be at least 8 characters.');
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    throw new HttpsError('invalid-argument', 'Password must contain a letter and a number.');
  }
  return value;
}

function toPayload(
  id: string,
  data: FirebaseFirestore.DocumentData,
): UserProfilePayload {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : createdAt;
  return {
    id,
    fullName: String(data.fullName ?? ''),
    email: String(data.email ?? ''),
    role: data.role === 'admin' ? 'admin' : 'employee',
    isActive: data.isActive !== false,
    createdAt: createdAt.toISOString(),
    createdBy: typeof data.createdBy === 'string' ? data.createdBy : null,
    updatedAt: updatedAt.toISOString(),
    updatedBy: typeof data.updatedBy === 'string' ? data.updatedBy : null,
  };
}

async function readProfile(userId: string): Promise<UserProfilePayload> {
  const snapshot = await db.doc(`users/${userId}`).get();
  if (!snapshot.exists) {
    throw new HttpsError('not-found', 'Employee profile not found.');
  }
  return toPayload(snapshot.id, snapshot.data() ?? {});
}

/* -------------------------------------------------------------------------- */
/* createEmployee                                                             */
/* -------------------------------------------------------------------------- */

interface CreateEmployeeData {
  fullName?: unknown;
  email?: unknown;
  password?: unknown;
  role?: unknown;
}

export const createEmployee = onCall<CreateEmployeeData>(async (request) => {
  const callerUid = await requireAdmin(request);

  const fullName = assertString(request.data.fullName, 'Full name', 120);
  const email = assertString(request.data.email, 'Email', 200).toLowerCase();
  const password = assertPassword(request.data.password);
  const role = assertRole(request.data.role);

  if (!EMAIL_PATTERN.test(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }

  let created;
  try {
    created = await auth.createUser({
      email,
      password,
      displayName: fullName,
      emailVerified: false,
      disabled: false,
    });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'An account with this email already exists.');
    }
    // Never log the password or any part of the credential.
    logger.error('createUser failed', { code });
    throw new HttpsError('internal', 'Unable to create this employee.');
  }

  try {
    // The claim is the authoritative role; the profile below is for display.
    await auth.setCustomUserClaims(created.uid, { role });

    await db.doc(`users/${created.uid}`).set({
      fullName,
      email,
      role,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: callerUid,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: callerUid,
    });
  } catch (error) {
    // Roll back so a half-created account cannot sign in with no profile.
    await auth.deleteUser(created.uid).catch(() => undefined);
    logger.error('employee profile write failed', { uid: created.uid, error: String(error) });
    throw new HttpsError('internal', 'Unable to create this employee.');
  }

  logger.info('employee created', { by: callerUid, uid: created.uid, role });
  return readProfile(created.uid);
});

/* -------------------------------------------------------------------------- */
/* setEmployeeActive                                                          */
/* -------------------------------------------------------------------------- */

interface SetActiveData {
  userId?: unknown;
  isActive?: unknown;
}

/**
 * Deactivation never deletes anything. The Auth user is disabled and their
 * refresh tokens revoked, so they cannot sign in again, while every record
 * they created keeps their name.
 */
export const setEmployeeActive = onCall<SetActiveData>(async (request) => {
  const callerUid = await requireAdmin(request);

  const userId = assertString(request.data.userId, 'Employee', 128);
  if (typeof request.data.isActive !== 'boolean') {
    throw new HttpsError('invalid-argument', 'isActive must be true or false.');
  }
  const isActive = request.data.isActive;

  if (userId === callerUid && !isActive) {
    throw new HttpsError('failed-precondition', 'You cannot deactivate your own account.');
  }

  await auth.updateUser(userId, { disabled: !isActive });
  if (!isActive) {
    // Ends any session already holding a valid ID token.
    await auth.revokeRefreshTokens(userId);
  }

  await db.doc(`users/${userId}`).update({
    isActive,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: callerUid,
  });

  logger.info('employee active state changed', { by: callerUid, uid: userId, isActive });
  return readProfile(userId);
});

/* -------------------------------------------------------------------------- */
/* setEmployeeRole                                                            */
/* -------------------------------------------------------------------------- */

interface SetRoleData {
  userId?: unknown;
  role?: unknown;
}

export const setEmployeeRole = onCall<SetRoleData>(async (request) => {
  const callerUid = await requireAdmin(request);

  const userId = assertString(request.data.userId, 'Employee', 128);
  const role = assertRole(request.data.role);

  // Prevents an admin from locking every admin out of employee management.
  if (userId === callerUid && role !== 'admin') {
    throw new HttpsError('failed-precondition', 'You cannot remove your own admin access.');
  }

  await auth.setCustomUserClaims(userId, { role });
  // Forces a fresh ID token, so the new role takes effect on the next request
  // rather than whenever the old token happens to expire.
  await auth.revokeRefreshTokens(userId);

  await db.doc(`users/${userId}`).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: callerUid,
  });

  logger.info('employee role changed', { by: callerUid, uid: userId, role });
  return readProfile(userId);
});

/* -------------------------------------------------------------------------- */
/* bootstrapFirstAdmin                                                        */
/* -------------------------------------------------------------------------- */

/**
 * One-time helper for a brand new project: promotes the caller to admin, but
 * only while no admin exists yet. Once the store has an admin this always
 * fails, so it cannot be used for privilege escalation later.
 *
 * Create the very first account in the Firebase console, sign in, call this
 * once, then sign out and back in to pick up the claim.
 */
export const bootstrapFirstAdmin = onCall(async (request) => {
  const callerUid = request.auth?.uid;
  if (!callerUid) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  const existingAdmins = await db
    .collection('users')
    .where('role', '==', 'admin')
    .limit(1)
    .get();

  if (!existingAdmins.empty) {
    throw new HttpsError('failed-precondition', 'This store already has an admin.');
  }

  const caller = await auth.getUser(callerUid);
  await auth.setCustomUserClaims(callerUid, { role: 'admin' });

  await db.doc(`users/${callerUid}`).set(
    {
      fullName: caller.displayName ?? caller.email ?? 'Admin',
      email: caller.email ?? '',
      role: 'admin',
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      createdBy: null,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy: callerUid,
    },
    { merge: true },
  );

  logger.info('first admin bootstrapped', { uid: callerUid });
  return { role: 'admin' as const };
});
