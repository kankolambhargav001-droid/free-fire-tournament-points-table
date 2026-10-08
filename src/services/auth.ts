/**
 * Organizer authentication service.
 * There is intentionally no public sign-up flow. Organizer accounts are
 * created by the owner in Firebase Authentication and then enabled in the
 * organizerAccess collection.
 */
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  User,
  AuthError,
} from 'firebase/auth';
import { auth } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export function getFriendlyAuthErrorMessage(error: unknown): string {
  if (!error) return 'An unexpected authentication error occurred.';
  const authErr = error as AuthError;
  const code = authErr.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Invalid organizer ID or password.';
    case 'auth/invalid-email':
      return 'Enter a valid organizer email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please wait and try again.';
    case 'auth/user-disabled':
      return 'This organizer account has been disabled.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled in Firebase Authentication.';
    default:
      return authErr.message?.replace(/^Firebase:\s*/i, '') || 'Unable to sign in. Please try again.';
  }
}

export async function isApprovedOrganizer(user: User): Promise<boolean> {
  const accessDoc = await getDoc(doc(db, 'organizerAccess', user.uid));
  return accessDoc.exists() && accessDoc.data()?.enabled === true;
}

export async function signInWithEmailPassword(email: string, password: string): Promise<User> {
  try {
    const result = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
    const approved = await isApprovedOrganizer(result.user);
    if (!approved) {
      await firebaseSignOut(auth);
      const error = new Error('This organizer account is not authorized to use Tournament Points.') as any;
      error.code = 'auth/not-authorized';
      throw error;
    }
    return result.user;
  } catch (error) {
    if ((error as any)?.code === 'auth/not-authorized') throw error;
    const friendlyMessage = getFriendlyAuthErrorMessage(error);
    const customError = new Error(friendlyMessage) as any;
    customError.code = (error as AuthError)?.code;
    throw customError;
  }
}

export async function resetOrganizerPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim().toLowerCase());
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
