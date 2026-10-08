import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trophy, Filter, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { TournamentCard } from '../components/cards/TournamentCard';
import { useTournaments } from '../context/TournamentContext';
import { TournamentStatus, TournamentConfig } from '../types';
import {
  EditTournamentModal,
  DuplicateTournamentModal,
  DeleteTournamentModal,
  ResetTournamentModal,
} from '../components/modals/TournamentActionModals';

export const TournamentsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    tournaments,
    updateTournament,
    duplicateTournament,
    resetTournamentData,
    deleteTournament,
  } = useTournaments();

  const [filter, setFilter] = useState<'all' | TournamentStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  // Modal active targets
  const [editingTarget, setEditingTarget] = useState<TournamentConfig | null>(null);
  const [duplicatingTarget, setDuplicatingTarget] = useState<TournamentConfig | null>(null);
  const [resettingTarget, setResettingTarget] = useState<TournamentConfig | null>(null);
  const [deletingTarget, setDeletingTarget] = useState<TournamentConfig | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  const filteredTournaments = tournaments.filter((t) => {
    const matchesFilter = filter === 'all' || t.status === filter;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      <PageHeader
        title="Tournaments"
        subtitle="Manage all active scrims, practice lobbies, and completed tournaments"
        actions={
          <Button
            variant="primary"
            onClick={() => navigate('/create')}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Tournament
          </Button>
        }
      />

      {/* Action Notice Banner */}
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#14141D] border border-[#212130]">
        <div className="w-full sm:w-80">
          <Input
            placeholder="Search tournament name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                filter === tab.key
                  ? 'bg-[#F58F7C] text-[#0B0B0F]'
                  : 'bg-[#1C1C28] text-[#9CA3AF] hover:text-white hover:bg-[#252536]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tournaments Grid or Empty State */}
      {tournaments.length === 0 ? (
        <div className="p-16 text-center rounded-2xl bg-[#12121A] border border-[#232332] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#1B1B26] border border-[#2E2E3E] text-[#F58F7C] flex items-center justify-center mx-auto shadow-inner">
            <Trophy className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight text-white">
            NO TOURNAMENTS
          </h3>
          <p className="text-sm text-[#9CA3AF] max-w-sm mx-auto font-mono">
            Create your first tournament to get started.
          </p>
          <Button
            variant="primary"
            onClick={() => navigate('/create')}
            leftIcon={<Plus className="w-4 h-4" />}
            className="mt-2"
          >
            Create Tournament
          </Button>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-[#14141D] border border-[#242434] text-[#9CA3AF] font-mono text-xs">
          No tournaments found matching your search or filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredTournaments.map((tournament) => (
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
            showNotice(`Tournament duplicated successfully.`);
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
