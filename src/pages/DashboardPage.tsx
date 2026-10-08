import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  CheckCircle2,
  Swords,
  Users,
  Plus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { StatCard } from '../components/cards/StatCard';
import { TournamentCard } from '../components/cards/TournamentCard';
import { Button } from '../components/ui/Button';
import { useTournaments } from '../context/TournamentContext';
import { TournamentConfig } from '../types';
import {
  EditTournamentModal,
  DuplicateTournamentModal,
  DeleteTournamentModal,
  ResetTournamentModal,
} from '../components/modals/TournamentActionModals';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    tournaments,
    updateTournament,
    duplicateTournament,
    resetTournamentData,
    deleteTournament,
  } = useTournaments();

  // Modal active targets
  const [editingTarget, setEditingTarget] = useState<TournamentConfig | null>(null);
  const [duplicatingTarget, setDuplicatingTarget] = useState<TournamentConfig | null>(null);
  const [resettingTarget, setResettingTarget] = useState<TournamentConfig | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<TournamentConfig | null>(null);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  // Dynamic greeting based on hour
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // These metrics are calculated only from the signed-in organizer's real data.
  const activeCount = tournaments.filter((t) => t.status === 'in_progress').length;
  const completedCount = tournaments.filter((t) => t.status === 'completed').length;
  const totalMatches = tournaments.reduce((acc, t) => acc + (t.completedMatches || 0), 0);
  const totalTeams = tournaments.reduce((acc, t) => acc + (t.teamCount || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in duration-300 pb-16">
      {/* Notice Banner */}
      {noticeMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{noticeMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setNoticeMessage(null)}
            className="text-emerald-400 hover:text-emerald-200 cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Welcome Banner */}
      <section className="tp-dashboard-hero">
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-7">
          <div className="max-w-3xl">
            <div className="tp-dashboard-eyebrow mb-3">ORGANIZER CONSOLE</div>
            <h1 className="text-3xl sm:text-4xl md:text-[46px] font-black text-white leading-[1.02]">
              {getGreeting()}, Organizer
            </h1>
            <p className="text-sm sm:text-base text-[#9B9B9F] mt-3 leading-6 max-w-2xl">
              Create tournaments, process match screenshots, and publish clean standings without unnecessary setup.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-3">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/create')}
              leftIcon={<Plus className="w-5 h-5 text-[#0B0B0F]" />}
              className="shadow-lg shadow-[#F58F7C]/20 font-bold"
            >
              Create Tournament
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Overview Grid */}
      <div>
        <div className="flex items-end justify-between mb-4 gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#F58F7C]">OVERVIEW</div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight mt-1">Platform Overview</h2>
          </div>
          <span className="hidden sm:block text-[10px] font-mono uppercase tracking-[0.14em] text-[#69696E]">Live status</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Active Tournaments"
            value={activeCount}
            icon={<Trophy className="w-5 h-5 text-[#F58F7C]" />}
            subtitle="Currently in progress"
          />
          <StatCard
            label="Completed Events"
            value={completedCount}
            icon={<CheckCircle2 className="w-5 h-5 text-[#F58F7C]" />}
            subtitle="Finished tournaments"
          />
          <StatCard
            label="Matches Processed"
            value={totalMatches}
            icon={<Swords className="w-5 h-5 text-[#F58F7C]" />}
            subtitle="Across your tournaments"
          />
          <StatCard
            label="Team Slots Configured"
            value={totalTeams}
            icon={<Users className="w-5 h-5 text-[#F58F7C]" />}
            subtitle="Configured across tournaments"
          />
        </div>
      </div>

      {/* Recent Tournaments */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Recent Tournaments
            </h2>
            <p className="text-sm text-[#9CA3AF] mt-0.5">
              Quick access to active scrims and completed tournament lobbies
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tournaments')}
            rightIcon={<ArrowRight className="w-4 h-4" />}
            className="text-xs font-mono uppercase tracking-wider"
          >
            View All ({tournaments.length})
          </Button>
        </div>

        {tournaments.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#12121A] border border-[#232332] space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-[#1B1B26] border border-[#2E2E3E] text-[#F58F7C] flex items-center justify-center mx-auto shadow-inner">
              <Trophy className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tight">
              NO TOURNAMENTS
            </h3>
            <p className="text-sm text-[#9CA3AF] max-w-sm mx-auto font-mono">
              Create your first tournament to get started.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate('/create')}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Tournament
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {tournaments.slice(0, 4).map((tournament) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                onOpen={(id) => navigate(`/tournament/${id}`)}
                onEdit={(id) => {
                  const target = tournaments.find((t) => t.id === id);
                  if (target) setEditingTarget(target);
                }}
                onDuplicate={(id) => {
                  const target = tournaments.find((t) => t.id === id);
                  if (target) setDuplicatingTarget(target);
                }}
                onReset={(id) => {
                  const target = tournaments.find((t) => t.id === id);
                  if (target) setResettingTarget(target);
                }}
                onDelete={(id) => {
                  const target = tournaments.find((t) => t.id === id);
                  if (target) setDeletingTarget(target);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Workflow Quickstart Notice */}
      <section className="border-y border-[#29292D] py-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="text-[#F58F7C] pt-0.5 shrink-0"><Sparkles className="w-5 h-5" /></div>
          <div>
            <h3 className="text-sm font-bold text-white">Simple workflow</h3>
            <p className="text-xs sm:text-sm text-[#85858A] mt-1">
              Create tournament → save slots → extract match results → review → publish standings.
            </p>
          </div>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate('/create')}
          rightIcon={<ArrowRight className="w-4 h-4" />}
          className="whitespace-nowrap shrink-0"
        >
          Create New Tournament
        </Button>
      </section>

      {/* Edit Tournament Modal */}
      {editingTarget && (
        <EditTournamentModal
          isOpen={!!editingTarget}
          onClose={() => setEditingTarget(null)}
          tournament={editingTarget}
          onSave={(updates) => {
            updateTournament(editingTarget.id, updates);
            showNotice(`Tournament "${updates.name || editingTarget.name}" updated successfully.`);
          }}
        />
      )}

      {/* Duplicate Tournament Modal */}
      {duplicatingTarget && (
        <DuplicateTournamentModal
          isOpen={!!duplicatingTarget}
          onClose={() => setDuplicatingTarget(null)}
          tournament={duplicatingTarget}
          onDuplicate={(options) => {
            const newId = duplicateTournament(duplicatingTarget.id, options);
            showNotice('Tournament duplicated successfully. Navigating to copy...');
            setTimeout(() => navigate(`/tournament/${newId}`), 500);
          }}
        />
      )}

      {/* Reset Tournament Modal */}
      {resettingTarget && (
        <ResetTournamentModal
          isOpen={!!resettingTarget}
          onClose={() => setResettingTarget(null)}
          tournament={resettingTarget}
          onConfirmReset={() => {
            resetTournamentData(resettingTarget.id);
            showNotice(`Tournament "${resettingTarget.name}" match data reset successfully.`);
          }}
        />
      )}

      {/* Delete Tournament Modal */}
      {deletingTarget && (
        <DeleteTournamentModal
          isOpen={!!deletingTarget}
          onClose={() => setDeletingTarget(null)}
          tournament={deletingTarget}
          onConfirmDelete={() => {
            deleteTournament(deletingTarget.id);
            showNotice(`Tournament "${deletingTarget.name}" permanently deleted.`);
          }}
        />
      )}
    </div>
  );
};
