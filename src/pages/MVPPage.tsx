import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Crown, Flame, Medal, Trophy, Users } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { useTournaments, DEFAULT_SCORING } from '../context/TournamentContext';
import { calculatePlayerStandings } from '../utils/matchingAndScoring';
import { PlayerStanding } from '../types';

export const MVPPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTournament, getSlotList, getAllSavedMatches } = useTournaments();

  const foundTournament = getTournament(id || '');
  const tournament = foundTournament || {
    id: id || 'tournament',
    name: 'Tournament',
    subtitle: 'Player Awards',
    organizer: 'Tournament Organizer',
    teamCount: 0,
    playersPerTeam: 4,
    matchCount: 0,
    completedMatches: 0,
    scoring: DEFAULT_SCORING,
  };

  const playerStandings = calculatePlayerStandings(
    getSlotList(tournament.id)?.slots || [],
    getAllSavedMatches(tournament.id)
  );

  const mvps = playerStandings.filter((player) => player.isMvp);
  const leader: PlayerStanding | undefined = playerStandings[0];
  const totalKills = playerStandings.reduce((sum, player) => sum + player.kills, 0);

  return (
    <div className="space-y-7 pb-16 animate-in fade-in duration-300">
      <PageHeader
        title="Tournament MVP"
        subtitle="A separate player leaderboard for the tournament MVP. Team standings stay separate."
        backTo={`/tournament/${tournament.id}`}
        backLabel="Back to Workspace"
        actions={
          <Button variant="secondary" onClick={() => navigate(`/tournament/${tournament.id}/standings`)} leftIcon={<Trophy className="w-4 h-4" />}>
            Overall Standings
          </Button>
        }
      />

      <section className="relative overflow-hidden rounded-2xl border border-[#3A3030] bg-[#121113]">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_30%,rgba(245,143,124,.10),transparent_35%),radial-gradient(circle_at_85%_10%,rgba(242,196,206,.05),transparent_30%)]" />
        <div className="relative p-6 sm:p-8 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex items-start gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 border border-[#F58F7C]/45 bg-[#F58F7C] text-[#121113] flex items-center justify-center rounded-xl">
                <Crown className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-[#F58F7C] font-bold">TOURNAMENT MVP</div>
                {mvps.length ? (
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-2 break-words">
                    {mvps.map((player) => player.playerName).join(' · ')}
                  </h2>
                ) : (
                  <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-2">MVP NOT DECIDED YET</h2>
                )}
                <p className="text-sm text-[#9A9A9F] mt-2">
                  {mvps.length
                    ? mvps.map((player) => `${player.teamName} · ${player.kills} kills`).join('  |  ')
                    : 'Complete at least one match to determine the current leader.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[390px]">
              <AwardStat label="LEADING KILLS" value={String(leader?.kills ?? 0)} />
              <AwardStat label="PLAYERS" value={String(playerStandings.length)} />
              <AwardStat label="TOTAL KILLS" value={String(totalKills)} />
            </div>
          </div>
        </div>
      </section>

      {playerStandings.length === 0 ? (
        <div className="rounded-2xl border border-[#2C2B30] bg-[#111113] p-10 text-center">
          <Users className="w-8 h-8 text-[#F58F7C] mx-auto" />
          <h3 className="text-xl font-black text-white mt-3">No player data yet</h3>
          <p className="text-sm text-[#777A80] mt-1">Upload the slot list and complete a match to populate the MVP leaderboard.</p>
        </div>
      ) : (
        <section className="rounded-2xl border border-[#2C2B30] bg-[#111113] overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-[#2C2B30] flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F58F7C]">PLAYER LEADERBOARD</div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">Most Kills</h3>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#696B70]">Highest cumulative kills</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr className="bg-[#181719] text-[#7B7D83] border-b border-[#2C2B30]">
                  <th className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.16em] w-16">#</th>
                  <th className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.16em]">Player</th>
                  <th className="px-5 py-3 text-left text-[10px] font-mono uppercase tracking-[0.16em]">Team</th>
                  <th className="px-5 py-3 text-center text-[10px] font-mono uppercase tracking-[0.16em]">Matches</th>
                  <th className="px-5 py-3 text-center text-[10px] font-mono uppercase tracking-[0.16em]">Kills</th>
                  <th className="px-5 py-3 text-center text-[10px] font-mono uppercase tracking-[0.16em]">Kill Pts</th>
                  <th className="px-5 py-3 text-center text-[10px] font-mono uppercase tracking-[0.16em]">Award</th>
                </tr>
              </thead>
              <tbody>
                {playerStandings.map((player, index) => (
                  <tr key={`${player.slotNumber ?? 'x'}-${player.playerName}-${index}`} className="border-b border-[#222326] last:border-0 hover:bg-white/[0.018]">
                    <td className="px-5 py-4 font-mono font-black text-[#65676D]">{String(index + 1).padStart(2, '0')}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 shrink-0 flex items-center justify-center border ${player.isMvp ? 'border-[#F58F7C]/50 bg-[#F58F7C] text-[#111214]' : 'border-[#3A3B40] bg-[#1A1B1E] text-[#D6D6D6]'}`}>
                          {player.isMvp ? <Medal className="w-4 h-4" /> : player.playerName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-bold text-white truncate max-w-[260px]">{player.playerName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-[#C6C6C9]">{player.teamName}</td>
                    <td className="px-5 py-4 text-center font-mono text-[#A2A4A9]">{player.matchesPlayed}</td>
                    <td className="px-5 py-4 text-center font-mono font-black text-white">{player.kills}</td>
                    <td className="px-5 py-4 text-center font-mono font-black text-[#F58F7C]">{player.killPoints}</td>
                    <td className="px-5 py-4 text-center">
                      {player.isMvp ? (
                        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#F58F7C]">
                          <Flame className="w-3 h-3" /> MVP
                        </span>
                      ) : <span className="text-[9px] font-mono uppercase text-[#5E6065]">PLAYER</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="flex items-center gap-3 text-xs text-[#65676D] border-t border-[#252629] pt-5">
        <ArrowLeft className="w-4 h-4" />
        <button className="hover:text-[#F58F7C] transition-colors" onClick={() => navigate(`/tournament/${tournament.id}`)}>
          Back to tournament workspace
        </button>
      </div>
    </div>
  );
};

const AwardStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="border-l border-[#343438] pl-3 sm:pl-4">
    <div className="text-[9px] font-mono uppercase tracking-[0.14em] text-[#66686E]">{label}</div>
    <div className="text-xl sm:text-2xl font-black text-white mt-1 font-mono">{value}</div>
  </div>
);
