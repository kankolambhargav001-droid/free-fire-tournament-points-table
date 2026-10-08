import React, { useState } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { Flame, Trophy, Shield, AlertCircle, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { signIn, isAuthenticated, loading, error, clearError, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const destination = (location.state as any)?.from?.pathname || '/';

  if (!loading && isAuthenticated) return <Navigate to={destination} replace />;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSigningIn(true);
    setLocalError(null);
    clearError();
    try {
      await signIn(email, password);
      navigate(destination, { replace: true });
    } catch (err: any) {
      setLocalError(err.message || 'Unable to sign in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleReset = async () => {
    setLocalError(null);
    setResetSent(false);
    if (!email.trim()) {
      setLocalError('Enter your organizer email first.');
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err: any) {
      setLocalError(err.message || 'Unable to send the password reset email.');
    }
  };

  const displayedError = localError || error;

  return (
    <div className="min-h-screen bg-[#09090B] text-white flex flex-col justify-between selection:bg-[#F58F7C] selection:text-black">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[#F58F7C]/8 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[#F2C4CE]/6 blur-[120px]" />
      </div>

      <header className="relative z-10 p-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#F58F7C] flex items-center justify-center text-black font-black shadow-lg shadow-[#F58F7C]/15">
            <Flame className="w-6 h-6 fill-black stroke-none" />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight text-white">TOURNAMENT POINTS</div>
            <div className="text-[11px] font-mono text-[#71717A]">Private Organizer Portal</div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="w-full max-w-md rounded-2xl bg-[#141416] border border-[#3A383A] p-6 sm:p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-[#211B1B] border border-[#4F3C3A] text-[#F58F7C] flex items-center justify-center mx-auto">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Organizer Sign In</h1>
            <p className="text-xs text-[#9B9B9E] font-mono leading-relaxed">
              Use the organizer ID and password provided by the tournament administrator.
            </p>
          </div>

          {displayedError && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{displayedError}</span>
            </div>
          )}

          {resetSent && (
            <div className="p-3 rounded-xl bg-[#F58F7C]/10 border border-[#F58F7C]/25 text-[#F2C4CE] text-xs font-mono">
              If that organizer account exists, a password reset email has been sent.
            </div>
          )}

          <div className="space-y-4">
            <label className="block">
              <span className="block text-xs font-mono uppercase tracking-wider text-[#9B9B9E] mb-2">Organizer ID</span>
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin1@gmail.com"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#0D0D0F] border border-[#3A383A] text-white outline-none focus:border-[#F58F7C]"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-mono uppercase tracking-wider text-[#9B9B9E] mb-2">Password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl bg-[#0D0D0F] border border-[#3A383A] text-white outline-none focus:border-[#F58F7C]"
              />
            </label>

            <button
              type="submit"
              disabled={isSigningIn || loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#F58F7C] hover:bg-[#FF9D8B] text-[#111] font-bold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSigningIn || loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              {isSigningIn ? 'Signing in...' : 'Sign In'}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full text-xs font-mono text-[#9B9B9E] hover:text-[#F58F7C] transition-colors"
            >
              Forgot password?
            </button>
          </div>

          <div className="pt-3 border-t border-[#29282A] space-y-2 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#9B9B9E] font-mono">
              <Shield className="w-3.5 h-3.5 text-[#F58F7C]" />
              <span>Private organizer access</span>
            </div>
            <p className="text-[11px] text-[#68686C] font-mono leading-relaxed">
              There is no public sign-up. Only organizer accounts created and approved by the administrator can access tournament data.
            </p>
          </div>
        </form>
      </main>

      <footer className="relative z-10 p-6 text-center text-xs font-mono text-[#525255]">
        TOURNAMENT POINTS • PRIVATE ESPORTS PLATFORM
      </footer>
    </div>
  );
};
