import React, { useState } from 'react';
import { Menu, Bell, ChevronDown, Check, Trophy, LogOut, User as UserIcon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTournaments } from '../../context/TournamentContext';
import { useAuth } from '../../context/AuthContext';

export interface TopBarProps {
  onOpenMobileMenu: () => void;
  title?: string;
  onOpenNotifications?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileMenu,
  title,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { tournaments } = useTournaments();
  const { user, signOut, isAuthenticated } = useAuth();
  const [showTournamentPicker, setShowTournamentPicker] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Determine current active tournament from URL or fallback to first
  const match = location.pathname.match(/\/tournament\/([^/]+)/);
  const currentTournamentId = match ? match[1] : (tournaments[0]?.id || 't-9pm-practice');
  const currentTournament =
    tournaments.find((t) => t.id === currentTournamentId) || tournaments[0] || {
      id: 't-9pm-practice',
      name: '9 PM Practice',
      subtitle: 'Daily Practice Match',
    };

  const getPageTitle = () => {
    if (title) return title;
    if (location.pathname === '/') return 'Dashboard';
    if (location.pathname === '/create') return 'Create Tournament';
    if (location.pathname === '/tournaments') return 'Tournaments';
    if (location.pathname === '/settings') return 'Settings';
    if (location.pathname.includes('/slots')) return 'Slot List';
    if (location.pathname.includes('/matches')) return 'Match Results';
    if (location.pathname.includes('/standings')) return 'Overall Standings';
    if (location.pathname.includes('/mvp')) return 'Tournament MVP';
    if (location.pathname.includes('/customize')) return 'Customize Table';
    if (location.pathname.startsWith('/tournament/')) return 'Tournament Workspace';
    return 'Tournament Points';
  };

  return (
    <header className="sticky top-0 z-20 bg-[#07090D]/90 backdrop-blur-xl border-b border-white/[0.06] px-4 md:px-8 flex items-center justify-between">
      {/* Left: Mobile Menu + Current Page Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 text-[#9CA3AF] hover:text-white rounded-lg hover:bg-[#1B1B26]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <h1 className="text-lg md:text-xl font-bold text-white tracking-tight">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Tournament selector + Notifications + Avatar */}
      <div className="flex items-center gap-3 md:gap-4">
        {/* Tournament Selector Placeholder */}
        <div className="relative">
          <button
            onClick={() => setShowTournamentPicker(!showTournamentPicker)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-[11px] bg-white/[0.035] hover:bg-white/[0.065] border border-white/[0.08] text-sm text-[#E5E7EB] transition-colors cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-[#F58F7C]" />
            <span className="hidden sm:inline font-medium max-w-[140px] truncate">
              {currentTournament.name}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
          </button>

          {showTournamentPicker && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#161622] border border-[#2B2B3E] shadow-2xl py-2 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-3 py-1.5 text-xs font-mono uppercase tracking-wider text-[#6B7280]">
                Switch Tournament
              </div>
              <div className="divide-y divide-[#20202E]">
                {tournaments.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setShowTournamentPicker(false);
                      navigate(`/tournament/${t.id}`);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#1F1F2F] flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="text-sm font-semibold text-white">{t.name}</div>
                      <div className="text-xs text-[#9CA3AF]">{t.subtitle}</div>
                    </div>
                    {t.id === currentTournament.id && (
                      <Check className="w-4 h-4 text-[#F58F7C]" />
                    )}
                  </button>
                ))}
              </div>
              <div className="p-2 border-t border-[#20202E] mt-1">
                <button
                  onClick={() => {
                    setShowTournamentPicker(false);
                    navigate('/create');
                  }}
                  className="w-full text-center text-xs font-semibold text-[#F58F7C] hover:text-[#E87568] py-1"
                >
                  + Create New Tournament
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Icon */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-[#9CA3AF] hover:text-white rounded-lg hover:bg-[#1B1B26] transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F58F7C]" />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl bg-[#161622] border border-[#2B2B3E] shadow-2xl p-4 z-40 animate-in fade-in zoom-in-95 duration-100">
              <div className="flex items-center justify-between pb-3 border-b border-[#232332]">
                <span className="text-sm font-bold text-white">Notifications</span>
                <span className="text-xs font-mono text-[#F58F7C]">2 Unread</span>
              </div>
              <div className="space-y-3 py-3">
                <div className="p-2.5 rounded-lg bg-[#1C1C2A] border border-[#262638] text-xs">
                  <div className="font-semibold text-white">Free Fire Rulebook Ready</div>
                  <div className="text-[#9CA3AF] mt-0.5">
                    Standard Free Fire scoring system loaded for practice matches.
                  </div>
                  <div className="text-[10px] text-[#6B7280] mt-1">10 mins ago</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#1C1C2A] border border-[#262638] text-xs">
                  <div className="font-semibold text-white">Match 2 Processed</div>
                  <div className="text-[#9CA3AF] mt-0.5">
                    Purgatory results updated in 9 PM Practice standings.
                  </div>
                  <div className="text-[10px] text-[#6B7280] mt-1">1 hour ago</div>
                </div>
              </div>
              <button
                onClick={() => setShowNotifications(false)}
                className="w-full text-center text-xs text-[#9CA3AF] hover:text-white pt-2 border-t border-[#232332]"
              >
                Close notifications
              </button>
            </div>
          )}
        </div>

        {/* Authenticated Organizer Account UI */}
        <div className="relative pl-2 border-l border-[#20202D]">
          {isAuthenticated && user ? (
            <div>
              <button
                type="button"
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-[#1B1B26] transition-colors cursor-pointer group"
                aria-label="Organizer account menu"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Organizer'}
                    className="w-8 h-8 rounded-lg object-cover border border-[#3C3C56] shadow-inner"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#252538] to-[#34344E] border border-[#3C3C56] flex items-center justify-center font-bold text-xs text-white font-mono shadow-inner uppercase">
                    {user.displayName?.charAt(0) || user.email?.charAt(0) || 'O'}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left leading-tight">
                  <span className="text-xs font-semibold text-white max-w-[120px] truncate">
                    {user.displayName || 'Organizer'}
                  </span>
                  <span className="text-[10px] text-[#6B7280] font-mono max-w-[120px] truncate">
                    {user.email || 'Verified'}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] group-hover:text-white transition-colors" />
              </button>

              {/* User Dropdown */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-[#161622] border border-[#2B2B3E] shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="pb-2.5 border-b border-[#232332]">
                    <div className="text-xs font-bold text-white truncate">
                      {user.displayName || 'Tournament Organizer'}
                    </div>
                    <div className="text-[11px] font-mono text-[#9CA3AF] truncate mt-0.5">
                      {user.email}
                    </div>
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowUserMenu(false);
                        await signOut();
                        navigate('/login');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-3 py-1.5 rounded-lg bg-[#F58F7C] hover:bg-[#E87568] text-[#0B0B0D] font-bold text-xs transition-colors cursor-pointer"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
