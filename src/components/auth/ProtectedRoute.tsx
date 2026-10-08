import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Flame } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090F] text-white flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="relative w-16 h-16 flex items-center justify-center mb-5">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#F58F7C]/20 to-[#D66F63]/10 border border-[#F58F7C]/30 animate-pulse" />
          <Flame className="w-8 h-8 text-[#F58F7C] animate-bounce" />
        </div>
        <div className="flex items-center gap-2 text-sm font-mono text-white font-bold tracking-wider uppercase">
          <Loader2 className="w-4 h-4 text-[#F58F7C] animate-spin" />
          <span>Verifying Organizer Session...</span>
        </div>
        <p className="text-xs font-mono text-[#71717A] mt-2">
          Tournament Points Esports Studio
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login preserving intended target in state
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
