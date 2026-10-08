import React from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Trophy,
  PlusCircle,
  Settings,
  ShieldAlert,
  Flame,
  X,
  ExternalLink,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenSettings }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isAuthenticated } = useAuth();

  const navLinks = [
    {
      to: '/',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      exact: true,
    },
    {
      to: '/tournaments',
      label: 'Tournaments',
      icon: <Trophy className="w-5 h-5" />,
    },
    {
      to: '/create',
      label: 'Create Tournament',
      icon: <PlusCircle className="w-5 h-5" />,
    },
    {
      to: '/settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const sidebarContent = (
    <div className="tp-sidebar flex flex-col h-full justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 pb-5 flex items-center justify-between border-b border-white/[0.06]">
          <NavLink
            to="/"
            onClick={onClose}
            className="flex items-center gap-3 group focus:outline-none"
          >
            <div className="tp-brand-mark w-10 h-10 rounded-[13px] bg-gradient-to-br from-[#F58F7C] to-[#C95F54] flex items-center justify-center text-[#0B0B0D] shadow-lg shadow-[#F58F7C]/20 group-hover:scale-105 transition-transform duration-200">
              <Flame className="w-6 h-6 fill-current stroke-none" />
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-mono text-[10px] font-bold tracking-[0.24em] text-[#F58F7C] uppercase">
                ESPORTS
              </span>
              <span className="font-extrabold text-[17px] tracking-tight text-white group-hover:text-gray-100 font-sans">
                TOURNAMENT
                <span className="block text-xs font-semibold tracking-wider text-[#9CA3AF] -mt-0.5">
                  POINTS
                </span>
              </span>
            </div>
          </NavLink>

          <button
            onClick={onClose}
            className="md:hidden p-1.5 text-[#9CA3AF] hover:text-white rounded-lg hover:bg-[#1B1B26]"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-mono uppercase tracking-wider text-[#6B7280]">
            Main Menu
          </div>
          {navLinks.map((item) => {
            const isActive = item.exact
              ? location.pathname === item.to
              : location.pathname === item.to || location.pathname.startsWith(item.to + '/');

            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`tp-nav-item flex items-center gap-3 px-3.5 py-3 rounded-[11px] text-[13px] font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white/[0.055] text-[#F58F7C] border border-[#F58F7C]/15 shadow-sm font-semibold'
                    : 'text-[#8D99AA] hover:text-white hover:bg-white/[0.035]'
                }`}
              >
                <span className={`${isActive ? 'text-[#F58F7C]' : 'text-[#6B7280]'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>

              </NavLink>
            );
          })}
        </div>

        {/* Quick Help Card */}
        <div className="px-4 py-2">
          <div className="tp-scoring-card p-3.5 rounded-[13px] border text-xs text-[#9CA3AF]">
            <div className="flex items-center gap-1.5 text-white font-medium mb-1">
              <span className="w-2 h-2 rounded-full bg-[#F58F7C] animate-pulse" />
              <span>Free Fire Scoring</span>
            </div>
            <p className="text-[12px] leading-relaxed text-[#7C7C8E]">
              Preset Free Fire rules enabled: 12 pts for #1, 1 pt per kill.
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Profile / Organizer Section */}
      <div className="p-4 border-t border-white/[0.06] bg-black/10">
        {isAuthenticated && user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-2 rounded-lg bg-[#14141E] border border-[#212130]">
              <div className="relative shrink-0">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Organizer'}
                    className="w-9 h-9 rounded-lg object-cover border border-[#2C2C3E]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-lg bg-[#20202F] border border-[#2C2C3E] flex items-center justify-center font-bold text-xs text-[#F58F7C] font-mono uppercase">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'O'}
                  </div>
                )}
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0E0E15]" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-white truncate">
                  {user.displayName || 'Organizer'}
                </span>
                <span className="text-[10px] text-[#6B7280] truncate font-mono">
                  {user.email || 'Verified'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                onClose();
                await signOut();
                navigate('/login');
              }}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-mono text-[#9CA3AF] hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              onClose();
              navigate('/login');
            }}
            className="w-full py-2 px-3 rounded-lg bg-[#F58F7C] hover:bg-[#D66F63] text-black font-bold text-xs font-mono transition-colors text-center cursor-pointer"
          >
            Sign In to Manage
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:block w-64 h-screen fixed left-0 top-0 z-30 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className="relative w-72 max-w-[80vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
