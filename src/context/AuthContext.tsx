import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  signInWithEmailPassword,
  signOut as authServiceSignOut,
  subscribeToAuthState,
  getCurrentUser,
  getFriendlyAuthErrorMessage,
  isApprovedOrganizer,
  resetOrganizerPassword,
} from '../services/auth';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAuthorized: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }
      try {
        const approved = await isApprovedOrganizer(firebaseUser);
        if (!approved) {
          await authServiceSignOut();
          setUser(null);
          setIsAuthorized(false);
          setError('This organizer account is not authorized to use Tournament Points.');
        } else {
          setIsAuthorized(true);
        }
      } catch {
        setIsAuthorized(false);
        setError('Unable to verify organizer access. Please try again.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const signIn = useCallback(async (email: string, password: string): Promise<User> => {
    try {
      setError(null);
      const signedInUser = await signInWithEmailPassword(email, password);
      setUser(signedInUser);
      setIsAuthorized(true);
      return signedInUser;
    } catch (err: any) {
      const message = err.code === 'auth/not-authorized'
        ? err.message
        : err.message || getFriendlyAuthErrorMessage(err);
      setError(message);
      setIsAuthorized(false);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await authServiceSignOut();
    setUser(null);
    setIsAuthorized(false);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await resetOrganizerPassword(email);
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthenticated: Boolean(user) && isAuthorized,
      isAuthorized,
      error,
      signIn,
      signOut,
      resetPassword,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
