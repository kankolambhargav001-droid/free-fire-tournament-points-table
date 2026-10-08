import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Palette,
  Download,
  Flame,
  Target,
  Search,
  CheckCircle2,
  Clock,
  Swords,
  Users,
  Shield,
  Layers,
  ArrowRight,
  ChevronRight,
  Info,
  X,
  Globe,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { PointsTable } from '../components/table/PointsTable';
import { Modal } from '../components/ui/Modal';
import { PublishTournamentModal } from '../components/modals/PublishTournamentModal';
import { useTournaments, DEFAULT_SCORING } from '../context/TournamentContext';
import { TeamStanding, SavedMatch, TournamentConfig } from '../types';


export const StandingsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getTournament,
    getStandingsForTournament,
    getMatchesForTournament,
    getAllSavedMatches,
    getSlotList,
    getTournamentDesign,
    updateTournament,
  } = useTournaments();

  const foundTournament = getTournament(id || '');
  const tournament = foundTournament || {
    id: id || 't-9pm-practice',
    name: '9 PM Practice',
    subtitle: 'Daily Practice Match',
    teamCount: 12,
    playersPerTeam: 4,
    matchCount: 3,
    scoring: DEFAULT_SCORING,
  };

  // Live cumulative standings derived from saved matches
  const standings = getStandingsForTournament(tournament.id);
  const matches = getMatchesForTournament(tournament.id);
  const savedMatchesMap = getAllSavedMatches(tournament.id) || {};

  const completedMatchesCount = Object.keys(savedMatchesMap).filter(
    (k) => savedMatchesMap[Number(k)]?.results?.length > 0
  ).length;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with_results' | 'podium'>('all');
  const [selectedTeamBreakdown, setSelectedTeamBreakdown] = useState<TeamStanding | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Search and filter
  const filteredStandings = standings.filter((s) => {
    const matchesSearch =
      s.teamName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.teamTag && s.teamTag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      `slot ${s.slotNumber}`.includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'with_results') {
      return s.matchesPlayed > 0 || s.totalPoints > 0;
    }
    if (filterType === 'podium') {
      return s.rank <= 3;
    }
    return true;
  });

  // Tournament statistics calculated strictly from saved data
  const totalTournamentKills = Object.values(savedMatchesMap).reduce(
    (acc, m) => acc + (m.totalKills || 0),
    0
  );

  const leader = standings.length > 0 && standings[0].totalPoints > 0 ? standings[0] : null;

  // Podium teams (only teams that have actually scored or played)
  const teamsWithScores = standings.filter((s) => s.matchesPlayed > 0 || s.totalPoints > 0);
  const podium1 = teamsWithScores[0];
  const podium2 = teamsWithScores[1];
  const podium3 = teamsWithScores[2];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Page Header */}
      <PageHeader
        title="Overall Standings"
        subtitle="Cumulative tournament points across all completed matches"
        backTo={`/tournament/${tournament.id}`}
        backLabel="Back to Workspace"
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => setIsExportModalOpen(true)}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Export Standings
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(`/tournament/${tournament.id}/customize`)}
              leftIcon={<Palette className="w-4 h-4" />}
            >
              Customize Graphic
            </Button>
          </div>
        }
      />

      {/* ======================================================== */}
      {/* EMPTY STATE (If no matches have been saved yet) */}
      {/* ======================================================== */}
      {standings.length === 0 || completedMatchesCount === 0 ? (
        <div className="rounded-2xl bg-[#14141E] border border-[#242434] p-10 sm:p-14 text-center max-w-2xl mx-auto space-y-5 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-[#1C1C28] border border-[#2B2B3E] text-[#F58F7C] flex items-center justify-center mx-auto shadow-inner">
            <Swords className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight uppercase">
              NO STANDINGS
            </h3>
            <p className="text-sm text-[#9CA3AF] max-w-md mx-auto mt-2 leading-relaxed font-mono">
              Complete at least one match to generate the points table.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate(`/tournament/${tournament.id}/matches`)}
              leftIcon={<Swords className="w-5 h-5 text-[#0B0B0F]" />}
              className="shadow-lg shadow-[#F58F7C]/25 font-bold"
            >
              Go to Matches
            </Button>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* CUMULATIVE STANDINGS VIEW */
        /* ======================================================== */
        <div className="space-y-8">
          {/* Summary Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-[#171720] border border-[#262638]">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-[#9CA3AF]">
                <span>Matches</span>
                <Target className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-2">
                {completedMatchesCount} / {tournament.matchCount}
              </div>
              <div className="text-xs text-emerald-400 mt-1">
                {tournament.matchCount - completedMatchesCount === 0
                  ? 'All matches completed'
                  : `${tournament.matchCount - completedMatchesCount} match remaining`}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#171720] border border-[#262638]">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-[#9CA3AF]">
                <span>Teams</span>
                <Users className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-2">
                {tournament.teamCount}
              </div>
              <div className="text-xs text-[#9CA3AF] mt-1 font-mono">
                {tournament.playersPerTeam}v{tournament.playersPerTeam} Squads
              </div>
            </div>

            <div className="p-5 rounded-xl bg-[#171720] border border-[#262638]">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-[#9CA3AF]">
                <span>Total Kills</span>
                <Flame className="w-4 h-4 text-orange-400" />
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-2">
                {totalTournamentKills}
              </div>
              <div className="text-xs text-[#9CA3AF] mt-1 font-mono">
                Across {completedMatchesCount} {completedMatchesCount === 1 ? 'round' : 'rounds'}
              </div>
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-[#1E1C14] to-[#15151E] border border-[#F58F7C]/40 shadow-lg">
              <div className="flex items-center justify-between text-xs font-mono uppercase text-[#F58F7C]">
                <span>Leader</span>
                <Trophy className="w-4 h-4" />
              </div>
              <div className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-2 truncate">
                {leader?.teamName || 'TBD'}
              </div>
              <div className="text-xs text-[#F58F7C] mt-1 font-mono font-bold">
                {leader ? `${leader.totalPoints} PTS (${leader.totalKills} kills)` : '—'}
              </div>
            </div>
          </div>

          {/* Match Progress Status Bar */}
          <div className="p-4 rounded-xl bg-[#14141E] border border-[#232332] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-[#9CA3AF] uppercase">
              <Layers className="w-4 h-4 text-[#F58F7C]" />
              <span>Match Status:</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {Array.from({ length: tournament.matchCount || 3 }, (_, i) => i + 1).map((mNum) => {
                const isSaved = !!savedMatchesMap[mNum];
                const matchSummary = matches.find((m) => m.matchNumber === mNum);

                return (
                  <button
                    key={mNum}
                    type="button"
                    onClick={() => navigate(`/tournament/${tournament.id}/matches`)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                      isSaved
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                        : 'bg-[#1A1A26] text-[#6B7280] border border-[#272738] hover:text-white'
                    }`}
                  >
                    <span>MATCH {mNum}</span>
                    <span>{isSaved ? '✓ Complete' : '○ Pending'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* PODIUM (Top 3 Teams) */}
          {/* ======================================================== */}
          {teamsWithScores.length > 0 && (
            <section className="tp-podium-clean p-5 sm:p-6">
              <div className="flex items-end justify-between gap-4 mb-5">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#F58F7C]">TOP 3</div>
                  <h3 className="text-xl font-black text-white mt-1">Current leaders</h3>
                </div>
                <span className="hidden sm:block text-[9px] font-mono uppercase tracking-[0.14em] text-[#69696E]">Click a team for breakdown</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[#2C2B30]">
                {([podium1, podium2, podium3] as const).map((team, index) => team ? (
                  <button
                    key={`${team.slotNumber}-${team.teamName}`}
                    type="button"
                    onClick={() => setSelectedTeamBreakdown(team)}
                    className={`text-left px-4 py-4 sm:px-5 ${index === 0 ? 'sm:order-2' : index === 1 ? 'sm:order-1' : 'sm:order-3'} hover:bg-white/[0.018] transition-colors cursor-pointer`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-[9px] font-mono uppercase tracking-[0.14em]" style={{ color: index === 0 ? '#F58F7C' : '#77777C' }}>
                          {index === 0 ? '1ST PLACE' : index === 1 ? '2ND PLACE' : '3RD PLACE'}
                        </div>
                        <div className="mt-1 text-lg font-black text-white truncate">{team.teamName}</div>
                        <div className="mt-1 text-[9px] font-mono uppercase text-[#626267]">Slot #{team.slotNumber} · {team.totalKills} kills · {team.booyahs} BOOYAH'S</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-2xl font-black font-mono" style={{ color: index === 0 ? '#F58F7C' : '#F2F2F2' }}>{team.totalPoints}</div>
                        <div className="text-[8px] font-mono uppercase tracking-[0.12em] text-[#66666B]">points</div>
                      </div>
                    </div>
                  </button>
                ) : (
                  <div key={`empty-${index}`} className="hidden sm:block" />
                ))}
              </div>
            </section>
          )}

          {/* Search, Filter & Main Table */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#14141D] border border-[#212130]">
              <div className="w-full sm:w-80">
                <Input
                  placeholder="Search team name, tag, or slot..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  leftIcon={<Search className="w-4 h-4 text-[#9CA3AF]" />}
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {(
                  [
                    { key: 'all', label: 'All Teams' },
                    { key: 'with_results', label: 'Teams With Results' },
                    { key: 'podium', label: 'Top 3 Podium' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterType(tab.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                      filterType === tab.key
                        ? 'bg-[#F58F7C] text-[#0B0B0F]'
                        : 'bg-[#1C1C28] text-[#9CA3AF] hover:text-white hover:bg-[#252536]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Cumulative Points Table */}
          <PointsTable
              standings={filteredStandings}
              title="Official Tournament Leaderboard"
              matchCount={tournament.matchCount}
              showMatchColumns={true}
              onSelectTeam={(team) => setSelectedTeamBreakdown(team)}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TEAM MATCH BREAKDOWN MODAL */}
      {/* ======================================================== */}
      {selectedTeamBreakdown && (
        <Modal
          isOpen={!!selectedTeamBreakdown}
          onClose={() => setSelectedTeamBreakdown(null)}
          title={`Match Breakdown — ${selectedTeamBreakdown.teamName}`}
          subtitle={`Slot #${selectedTeamBreakdown.slotNumber} • Rank #${selectedTeamBreakdown.rank} • Overall ${selectedTeamBreakdown.totalPoints} Points`}
          maxWidth="lg"
          footer={
            <Button variant="secondary" onClick={() => setSelectedTeamBreakdown(null)}>
              Close Breakdown
            </Button>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center font-mono">
              <div className="p-3 rounded-lg bg-[#14141C] border border-[#242434]">
                <div className="text-xs text-[#9CA3AF]">Total Points</div>
                <div className="text-xl font-bold text-[#F58F7C] mt-0.5">
                  {selectedTeamBreakdown.totalPoints} pts
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#14141C] border border-[#242434]">
                <div className="text-xs text-[#9CA3AF]">Total Kills</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {selectedTeamBreakdown.totalKills}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#14141C] border border-[#242434]">
                <div className="text-xs text-[#9CA3AF]">Matches Played</div>
                <div className="text-xl font-bold text-white mt-0.5">
                  {selectedTeamBreakdown.matchesPlayed} / {tournament.matchCount}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <h5 className="text-xs font-mono uppercase tracking-wider text-[#9CA3AF] mb-2">
                Round-by-Round Breakdown
              </h5>

              <div className="divide-y divide-[#232332] rounded-xl border border-[#242434] overflow-hidden bg-[#13131B]">
                {Array.from({ length: tournament.matchCount || 3 }, (_, i) => i + 1).map((mNum) => {
                  const b = selectedTeamBreakdown.matchBreakdowns?.[mNum];
                  const matchSummary = matches.find((m) => m.matchNumber === mNum);

                  return (
                    <div key={mNum} className="p-3.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded bg-[#1C1C28] text-white font-mono font-bold flex items-center justify-center">
                          M{mNum}
                        </span>
                        <div>
                          <span className="font-semibold text-white block">
                            Match {mNum} • {matchSummary?.mapName || 'Custom Lobby'}
                          </span>
                          <span className="text-[11px] text-[#9CA3AF] font-mono">
                            {b ? `Placement #${b.placement}` : 'Match not yet played'}
                          </span>
                        </div>
                      </div>

                      {b ? (
                        <div className="flex items-center gap-4 font-mono">
                          <span className="text-[#9CA3AF]">{b.kills} kills</span>
                          <span className="text-[#9CA3AF]">{b.placementPoints} plc</span>
                          <span className="text-[#9CA3AF]">{b.killPoints} kp</span>
                          <span className="text-sm font-bold text-[#F58F7C]">{b.totalPoints} pts</span>
                        </div>
                      ) : (
                        <span className="text-[#6B7280] font-mono">—</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Export Standings Modal */}
      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Export Tournament Standings"
        subtitle="Download or export verified cumulative leaderboard."
        footer={
          <Button variant="secondary" onClick={() => setIsExportModalOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#D1D5DB] leading-relaxed">
            Overall tournament leaderboard calculated from {completedMatchesCount} completed matches.
          </p>
          <div className="p-4 rounded-xl bg-[#14141E] border border-[#242434] text-xs space-y-2">
            <div className="font-semibold text-white">Included in Leaderboard:</div>
            <ul className="list-disc list-inside text-[#9CA3AF] space-y-1">
              <li>{tournament.name} cumulative standings</li>
              <li>{standings.length} Teams with round-by-round points</li>
              <li>Official Free Fire rules applied</li>
            </ul>
          </div>
          <Button
            variant="primary"
            className="w-full"
            onClick={() => {
              setIsExportModalOpen(false);
              navigate(`/tournament/${tournament.id}/customize`);
            }}
          >
            Design Broadcast Graphic
          </Button>
        </div>
      </Modal>
    </div>
  );
};
