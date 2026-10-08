import React, { useState } from 'react';
import { ArrowUpDown, ChevronRight, Flame } from 'lucide-react';
import { TeamStanding } from '../../types';

export interface PointsTableProps {
  standings: TeamStanding[];
  title?: string;
  showMatchCount?: boolean;
  matchCount?: number;
  showMatchColumns?: boolean;
  highlightTop?: number;
  className?: string;
  onSelectTeam?: (team: TeamStanding) => void;
}

export const PointsTable: React.FC<PointsTableProps> = ({
  standings,
  title,
  showMatchCount = true,
  matchCount,
  showMatchColumns = false,
  highlightTop = 3,
  className = '',
  onSelectTeam,
}) => {
  const [sortField, setSortField] = useState<keyof TeamStanding>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: keyof TeamStanding) => {
    if (sortField === field) setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortField(field);
      setSortOrder(field === 'rank' ? 'asc' : 'desc');
    }
  };

  const sortedData = [...standings].sort((a, b) => {
    const aValue = a[sortField] ?? 0;
    const bValue = b[sortField] ?? 0;
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    }
    return sortOrder === 'asc'
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });

  const dynamicMatches = Array.from({ length: matchCount || 3 }, (_, i) => i + 1);

  return (
    <section className={`tp-standings-table w-full ${className}`}>
      {title && (
        <header className="px-5 sm:px-6 py-4 border-b border-[#2C2B30] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F58F7C]">LEADERBOARD</div>
            <h3 className="text-lg sm:text-xl font-black text-white mt-1">{title}</h3>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-[#696B70]">{standings.length} teams</span>
        </header>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left border-collapse">
          <thead>
            <tr className="bg-[#19191B] border-b border-[#2C2B30] text-[#777A80]">
              <HeaderButton label="Rank" field="rank" onClick={handleSort} className="w-20" />
              <HeaderButton label="Team" field="teamName" onClick={handleSort} />
              {showMatchColumns && dynamicMatches.map((m) => (
                <th key={m} className="px-3 py-3 text-center text-[10px] font-mono uppercase tracking-[0.14em]">M{m}</th>
              ))}
              {showMatchCount && !showMatchColumns && <th className="px-4 py-3 text-center text-[10px] font-mono uppercase tracking-[0.14em]">Matches</th>}
              <HeaderButton label="Booyah's" field="booyahs" onClick={handleSort} align="center" />
              <HeaderButton label="Kills" field="kills" onClick={handleSort} icon={<Flame className="w-3 h-3" />} align="center" />
              <HeaderButton label="Place Pts" field="placementPoints" onClick={handleSort} align="center" />
              {showMatchColumns && <HeaderButton label="Kill Pts" field="killPoints" onClick={handleSort} align="center" />}
              <HeaderButton label="Total" field="totalPoints" onClick={handleSort} align="center" className="w-24" />
              {onSelectTeam && <th className="px-3 py-3 text-center text-[10px] font-mono uppercase tracking-[0.14em] w-14">View</th>}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, index) => {
              const top = row.rank <= highlightTop;
              return (
                <tr
                  key={`${row.slotNumber}-${row.teamName}-${index}`}
                  onClick={() => onSelectTeam?.(row)}
                  className={`border-b border-[#222326] last:border-0 transition-colors ${onSelectTeam ? 'cursor-pointer' : ''} ${top ? 'bg-[#151416]' : index % 2 ? 'bg-[#111113]' : 'bg-[#0F1012]'} hover:bg-[#1A191B]`}
                >
                  <td className="px-5 py-3.5 text-center">
                    <span className={`font-mono font-black ${row.rank === 1 ? 'text-[#F58F7C]' : row.rank <= 3 ? 'text-[#D6D6D6]' : 'text-[#6C6E74]'}`}>
                      {String(row.rank).padStart(2, '0')}
                    </span>
                  </td>

                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 shrink-0 border flex items-center justify-center text-[10px] font-black ${row.rank === 1 ? 'border-[#F58F7C]/45 text-[#F58F7C]' : 'border-[#3A3B40] text-[#D6D6D6]'}`}>
                        {(row.teamTag || row.teamName || 'TP').replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'TP'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-black text-white text-sm sm:text-[15px] uppercase truncate">{row.teamName}</span>
                          
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-[0.12em] text-[#606269]">Slot #{row.slotNumber}</span>
                      </div>
                    </div>
                  </td>

                  {showMatchColumns && dynamicMatches.map((m) => (
                    <td key={m} className="px-3 py-3.5 text-center font-mono text-sm text-[#D6D6D6]">
                      {row.matchPoints?.[m] ?? '—'}
                    </td>
                  ))}

                  {showMatchCount && !showMatchColumns && <td className="px-4 py-3.5 text-center font-mono text-[#A7A8AD]">{row.matchesPlayed}</td>}
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-[#D6D6D6]">{row.booyahs || 0}</td>
                  <td className="px-4 py-3.5 text-center font-mono font-bold text-[#D6D6D6]">{row.totalKills ?? row.kills}</td>
                  <td className="px-4 py-3.5 text-center font-mono text-[#999BA1]">{row.totalPlacementPoints ?? row.placementPoints}</td>
                  {showMatchColumns && <td className="px-4 py-3.5 text-center font-mono text-[#999BA1]">{row.totalKillPoints ?? row.killPoints}</td>}
                  <td className="px-4 py-3.5 text-center">
                    <span className={`font-mono font-black text-base ${row.rank === 1 ? 'text-[#F58F7C]' : 'text-white'}`}>
                      {row.totalPoints}
                    </span>
                  </td>
                  {onSelectTeam && (
                    <td className="px-3 py-3.5 text-center">
                      <button type="button" onClick={(event) => { event.stopPropagation(); onSelectTeam(row); }} className="text-[#696B70] hover:text-[#F58F7C] transition-colors" title="View match breakdown">
                        <ChevronRight className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
};

const HeaderButton: React.FC<{
  label: string;
  field: keyof TeamStanding;
  onClick: (field: keyof TeamStanding) => void;
  icon?: React.ReactNode;
  align?: 'left' | 'center';
  className?: string;
}> = ({ label, field, onClick, icon, align = 'left', className = '' }) => (
  <th className={`px-4 sm:px-5 py-3 ${align === 'center' ? 'text-center' : 'text-left'} text-[10px] font-mono uppercase tracking-[0.14em] ${className}`}>
    <button type="button" onClick={() => onClick(field)} className="inline-flex items-center gap-1.5 text-[#777A80] hover:text-white transition-colors">
      {icon}
      <span>{label}</span>
      <ArrowUpDown className="w-3 h-3 opacity-50" />
    </button>
  </th>
);
