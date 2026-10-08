import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  ListOrdered,
  Swords,
  Palette,
  BarChart3,
  Crown,
  Calendar,
  Users,
  Flame,
  Shield,
  Edit3,
  Copy,
  RotateCcw,
  Trash2,
  Clock,
  Target,
  CheckCircle2,
  AlertTriangle,
  Globe,
  ExternalLink,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Button } from '../components/ui/Button';
import { ActionCard } from '../components/cards/ActionCard';
import {
  useTournaments,
  DEFAULT_SCORING,
  DEFAULT_TABLE_SETTINGS,
  formatLastUpdated,
} from '../context/TournamentContext';
import {
  EditTournamentModal,
  DuplicateTournamentModal,
  DeleteTournamentModal,
  ResetTournamentModal,
} from '../components/modals/TournamentActionModals';
import { PublishTournamentModal } from '../components/modals/PublishTournamentModal';

export const TournamentWorkspacePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getTournament,
    getStandingsForTournament,
    getAllSavedMatches,
    getSlotList,
    getTournamentDesign,
    updateTournament,
    duplicateTournament,
    resetTournamentData,
    deleteTournament,
  } = useTournaments();

  const found = getTournament(id || '');

  const tournament = found || {
    id: id || 't-9pm-practice',
    name: '9 PM Practice',
    subtitle: 'Daily Practice Match',
    organizer: 'Vortex Esports Org',
    date: new Date().toISOString().split('T')[0],
    teamCount: 12,
    playersPerTeam: 4,
    matchCount: 3,
    completedMatches: 0,
    status: 'in_progress' as const,
    lastUpdated: 'Just now',
    game: 'Free Fire',
    scoring: DEFAULT_SCORING,
    tableSettings: DEFAULT_TABLE_SETTINGS,
  };

  const savedMatchesMap = getAllSavedMatches(tournament.id) || {};
  const completedMatchesCount = Object.keys(savedMatchesMap).filter(
    (k) => savedMatchesMap[Number(k)]?.results?.length > 0
  ).length;

  const totalTournamentKills = Object.values(savedMatchesMap).reduce(
    (acc, m) => acc + (m.totalKills || 0),
    0
  );

  const standings = getStandingsForTournament(tournament.id);
  const leader = completedMatchesCount > 0 && standings.length > 0 ? standings[0] : null;

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setNoticeMessage(msg);
    setTimeout(() => setNoticeMessage(null), 3500);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Workspace Header */}
      <PageHeader
        title={tournament.name}
        subtitle={`${tournament.subtitle} • Organized by ${tournament.organizer}`}
        backTo="/tournaments"
        backLabel="All Tournaments"
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status={tournament.status} />
            {tournament.isPublished && tournament.publicId && (
              <a
                href={`/results/${tournament.publicId}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Live Results ↗</span>
              </a>
            )}
          </div>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsPublishModalOpen(true)}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              leftIcon={<Globe className="w-4 h-4 text-emerald-400" />}
            >
              {tournament.isPublished ? 'Update Published' : 'Publish Results'}
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsDuplicateModalOpen(true)}
              leftIcon={<Copy className="w-4 h-4 text-[#9CA3AF]" />}
            >
              Duplicate
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setIsEditModalOpen(true)}
              leftIcon={<Edit3 className="w-4 h-4 text-[#9CA3AF]" />}
            >
              Edit Tournament
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(`/tournament/${tournament.id}/standings`)}
              leftIcon={<BarChart3 className="w-4 h-4" />}
            >
              View Standings
            </Button>
          </div>
        }
      />

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

      {/* Tournament Details Banner */}
      <div className="rounded-xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#212130]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase text-[#F58F7C] tracking-wider font-semibold">
                LOBBY METADATA
              </span>
              <span className="text-[#6B7280]">•</span>
              <span className="text-xs font-mono text-[#9CA3AF]">
                ID: {tournament.id}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mt-1">{tournament.name}</h3>
            <p className="text-sm text-[#9CA3AF] mt-0.5">{tournament.subtitle}</p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto font-mono text-xs text-[#9CA3AF]">
            <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
            <span>Last updated {formatLastUpdated(tournament.lastUpdated)}</span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* TOURNAMENT STATISTICS SECTION (Requirement 13) */}
        {/* ======================================================== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-4">
          {/* Teams */}
          <div className="p-3 rounded-lg bg-[#171722] border border-[#242434]">
            <div className="text-[11px] text-[#9CA3AF] font-mono mb-0.5">Teams</div>
            <div className="text-base font-bold text-white font-mono">{tournament.teamCount}</div>
          </div>

          {/* Players / Team */}
          <div className="p-3 rounded-lg bg-[#171722] border border-[#242434]">
            <div className="text-[11px] text-[#9CA3AF] font-mono mb-0.5">Players / Team</div>
            <div className="text-base font-bold text-white font-mono">{tournament.playersPerTeam}</div>
          </div>

          {/* Configured Matches */}
          <div className="p-3 rounded-lg bg-[#171722] border border-[#242434]">
            <div className="text-[11px] text-[#9CA3AF] font-mono mb-0.5">Configured Matches</div>
            <div className="text-base font-bold text-white font-mono">{tournament.matchCount}</div>
          </div>

          {/* Completed Matches */}
          <div className="p-3 rounded-lg bg-[#171722] border border-[#242434]">
            <div className="text-[11px] text-[#9CA3AF] font-mono mb-0.5">Completed Matches</div>
            <div className="text-base font-bold text-emerald-400 font-mono">{completedMatchesCount}</div>
          </div>

          {/* Remaining Matches */}
          <div className="p-3 rounded-lg bg-[#171722] border border-[#242434]">
            <div className="text-[11px] text-[#9CA3AF] font-mono mb-0.5">Remaining Matches</div>
            <div className="text-base font-bold text-zinc-300 font-mono">
              {Math.max(0, tournament.matchCount - completedMatchesCount)}
            </div>
          </div>

          {/* Total Kills */}
          <div className="p-3 rounded-lg bg-[#171722] border border-[#242434]">
            <div className="text-[11px] text-[#9CA3AF] font-mono mb-0.5">Total Kills</div>
            <div className="text-base font-bold text-orange-400 font-mono">{totalTournamentKills}</div>
          </div>

          {/* Current Leader */}
          <div className="p-3 rounded-lg bg-[#171722] border border-[#242434]">
            <div className="text-[11px] text-[#9CA3AF] font-mono mb-0.5">Current Leader</div>
            <div className="text-sm font-bold text-white truncate" title={leader?.teamName || '—'}>
              {leader ? leader.teamName : '—'}
            </div>
          </div>

          {/* Leader Points */}
          <div className="p-3 rounded-lg bg-[#171722] border border-[#242434]">
            <div className="text-[11px] text-[#9CA3AF] font-mono mb-0.5">Leader Points</div>
            <div className="text-base font-bold text-[#F58F7C] font-mono">
              {leader ? leader.totalPoints : 0}
            </div>
          </div>
        </div>
      </div>

      {/* Primary 4 Workspace Navigation Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
            Tournament Management Sections
          </h3>
          <span className="text-xs font-mono text-[#6B7280]">Select a workspace module</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
          {/* 1. SLOT LIST */}
          <ActionCard
            icon={<ListOrdered className="w-7 h-7" />}
            title="SLOT LIST"
            description="Manage tournament teams and player slots."
            badge={`${tournament.teamCount} Slots (${tournament.playersPerTeam}v${tournament.playersPerTeam})`}
            onClick={() => navigate(`/tournament/${tournament.id}/slots`)}
          />

          {/* 2. MATCH RESULTS */}
          <ActionCard
            icon={<Swords className="w-7 h-7" />}
            title="MATCH RESULTS"
            description="Upload and manage match results."
            badge={`${completedMatchesCount}/${tournament.matchCount} Matches Completed`}
            onClick={() => navigate(`/tournament/${tournament.id}/matches`)}
          />

          {/* 3. OVERALL STANDINGS */}
          <ActionCard
            icon={<Trophy className="w-7 h-7" />}
            title="OVERALL STANDINGS"
            description="View cumulative tournament points."
            badge={`${tournament.scoring?.preset || 'Free Fire'} Rules`}
            onClick={() => navigate(`/tournament/${tournament.id}/standings`)}
          />

          {/* 4. TOURNAMENT MVP */}
          <ActionCard
            icon={<Crown className="w-7 h-7" />}
            title="TOURNAMENT MVP"
            description="View the dedicated player leaderboard and MVP award."
            badge="Player Awards"
            onClick={() => navigate(`/tournament/${tournament.id}/mvp`)}
          />

          {/* 5. CUSTOMIZE TABLE */}
          <ActionCard
            icon={<Palette className="w-7 h-7" />}
            title="CUSTOMIZE TABLE"
            description="Design your final points-table graphic."
            badge="Graphic Studio"
            onClick={() => navigate(`/tournament/${tournament.id}/customize`)}
          />
        </div>
      </div>

      {/* ======================================================== */}
      {/* DATA CONTROLS & DANGER ZONE SECTION */}
      {/* ======================================================== */}
      <div className="rounded-2xl bg-[#13131C] border border-[#232332] p-6 space-y-4">
        <div>
          <h4 className="text-base font-bold text-white tracking-tight">
            Data Controls & Management
          </h4>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Reset dynamic scores or permanently delete this tournament.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-[#1F1F2C]">
          <div>
            <div className="text-sm font-semibold text-white">Reset Tournament Data</div>
            <p className="text-xs text-[#9CA3AF] mt-0.5 max-w-lg">
              Clears all extracted slots, saved matches, and standings calculations while preserving tournament settings and table designs.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setIsResetModalOpen(true)}
            leftIcon={<RotateCcw className="w-4 h-4 text-amber-400" />}
            className="shrink-0 text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
          >
            Reset Tournament Data
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-[#1F1F2C]">
          <div>
            <div className="text-sm font-semibold text-red-400">Permanently Delete Tournament</div>
            <p className="text-xs text-[#9CA3AF] mt-0.5 max-w-lg">
              Irreversibly removes this tournament configuration, slots, and all match results from local storage.
            </p>
          </div>
          <Button
            variant="danger"
            onClick={() => setIsDeleteModalOpen(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
            className="shrink-0"
          >
            Delete Tournament
          </Button>
        </div>
      </div>

      {/* Edit Tournament Modal */}
      <EditTournamentModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        tournament={tournament}
        onSave={(updates) => {
          updateTournament(tournament.id, updates);
          showNotice(`Tournament "${updates.name || tournament.name}" updated successfully.`);
        }}
      />

      {/* Duplicate Tournament Modal */}
      <DuplicateTournamentModal
        isOpen={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
        tournament={tournament}
        onDuplicate={(options) => {
          const newId = duplicateTournament(tournament.id, options);
          showNotice('Tournament duplicated successfully. Navigating to copy...');
          setTimeout(() => navigate(`/tournament/${newId}`), 500);
        }}
      />

      {/* Reset Tournament Data Modal */}
      <ResetTournamentModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        tournament={tournament}
        onConfirmReset={() => {
          resetTournamentData(tournament.id);
          showNotice('Tournament match data and slots reset successfully.');
        }}
      />

      {/* Delete Tournament Modal */}
      <DeleteTournamentModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        tournament={tournament}
        onConfirmDelete={() => {
          deleteTournament(tournament.id);
          navigate('/tournaments');
        }}
      />

      {/* Publish Tournament Results Modal */}
      <PublishTournamentModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        tournament={tournament}
        slotList={getSlotList(tournament.id) || { tournamentId: tournament.id, slots: [], sourceImages: [] }}
        savedMatches={getAllSavedMatches(tournament.id) || {}}
        design={getTournamentDesign(tournament.id)}
        standings={standings}
        onPublishedSuccess={(publicId) => {
          updateTournament(tournament.id, {
            isPublished: true,
            publicId,
            publishedAt: new Date().toISOString(),
          });
          showNotice('Tournament published successfully! Public results link is live.');
        }}
      />
    </div>
  );
};
