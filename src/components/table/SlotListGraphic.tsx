import React, { forwardRef } from 'react';
import { Slot, TournamentConfig } from '../../types';

interface SlotListGraphicProps {
  tournament: TournamentConfig | { name: string; date?: string; subtitle?: string; organizer?: string };
  slots: Slot[];
}

function monogram(teamName: string, slotNumber: number) {
  const cleaned = (teamName || `Slot ${slotNumber}`).replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return (words[0] || 'TP').slice(0, 2).toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
}

/** Clean, print-ready roster poster with predictable dimensions for any lobby size. */
export const SlotListGraphic = forwardRef<HTMLDivElement, SlotListGraphicProps>(
  ({ tournament, slots }, ref) => {
    const orderedSlots = [...slots].sort((a, b) => a.slotNumber - b.slotNumber);
    const teamCount = orderedSlots.length;
    const columns = teamCount >= 13 ? 4 : teamCount >= 7 ? 3 : 2;
    const rows = Math.max(1, Math.ceil(Math.max(teamCount, 1) / columns));
    const maxPlayers = Math.max(4, ...orderedSlots.map((s) => s.players?.filter((p) => p.name.trim()).length || 0));
    const cardHeight = Math.max(224, 92 + maxPlayers * 37);
    const width = 1600;
    const headerHeight = 220;
    const footerHeight = 52;
    const side = 46;
    const gap = 18;
    const contentHeight = rows * cardHeight + Math.max(0, rows - 1) * gap;
    const height = headerHeight + side * 2 + contentHeight + footerHeight;

    return (
      <div
        ref={ref}
        className="relative overflow-hidden bg-[#0B0B0D] text-white"
        style={{ width, height, fontFamily: 'Arial, Helvetica, sans-serif' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.02), transparent 35%, rgba(0,0,0,.16))' }} />
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#F58F7C]" />

        <header className="relative border-b border-[#2C2B30] px-14 pt-10 pb-6" style={{ height: headerHeight }}>
          <div className="flex items-end justify-between h-full gap-8">
            <div className="min-w-0">
              <div className="text-[11px] font-black tracking-[0.28em] text-[#F58F7C] uppercase">TEAM LINEUPS</div>
              <h1 className="mt-3 text-[58px] leading-none font-black tracking-[-0.035em] uppercase truncate">{tournament.name}</h1>
              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-mono tracking-[0.14em] uppercase text-[#777A80]">
                {tournament.subtitle && <span>{tournament.subtitle}</span>}
                {tournament.date && <span>{formatDate(tournament.date)}</span>}
                <span>{teamCount} TEAMS</span>
              </div>
            </div>

          </div>
        </header>

        <main
          className="relative px-[46px] py-[46px] grid"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridAutoRows: `${cardHeight}px`, gap }}
        >
          {orderedSlots.map((slot) => {
            const players = (slot.players || []).filter((p) => p.name.trim());
            return (
              <section key={slot.slotNumber} className="flex flex-col overflow-hidden border border-[#3A3A3E] bg-[#151416]">
                <div className="h-[72px] shrink-0 border-b border-[#2C2B30] flex items-center">
                  <div className="w-[72px] h-full shrink-0 border-r border-[#2C2B30] flex items-center justify-center">
                    <div className="w-10 h-10 border border-[#4F4F51] flex items-center justify-center text-[12px] font-black text-[#F58F7C]">
                      {monogram(slot.teamName || '', slot.slotNumber)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 px-5">
                    <div className="text-[21px] font-black uppercase truncate">{slot.teamName || `SLOT ${slot.slotNumber}`}</div>
                    {slot.teamTag && <div className="text-[8px] font-mono tracking-[0.16em] text-[#6E7076] mt-1 uppercase">{slot.teamTag}</div>}
                  </div>
                  <div className="w-[92px] h-full shrink-0 border-l border-[#2C2B30] flex flex-col items-center justify-center">
                    <span className="text-[8px] font-mono tracking-[0.18em] text-[#6E7076]">SLOT</span>
                    <span className="text-[25px] leading-none font-black text-[#F58F7C] mt-1">{String(slot.slotNumber).padStart(2, '0')}</span>
                  </div>
                </div>

                <div className="flex-1 px-5 py-4 overflow-hidden">
                  {players.length ? players.map((player, index) => (
                    <div key={player.id || `${slot.slotNumber}-${index}`} className="flex items-center gap-3 min-h-[31px] border-b border-[#242529] last:border-0">
                      <span className="w-5 shrink-0 text-[10px] font-mono font-bold text-[#F58F7C]">{String(index + 1).padStart(2, '0')}</span>
                      <span className="min-w-0 truncate text-[17px] font-bold tracking-tight text-[#E7E7E8]">{player.name}</span>
                    </div>
                  )) : (
                    <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-[#65676D] pt-3">NO PLAYERS REGISTERED</div>
                  )}
                </div>
              </section>
            );
          })}
        </main>

        <footer className="absolute bottom-0 left-0 right-0 h-[52px] border-t border-[#2C2B30] px-12 flex items-center justify-center text-[8px] font-mono uppercase tracking-[0.16em] text-[#F58F7C]">
          <span>MADE WITH LOVE BY BHARGAV</span>
        </footer>
      </div>
    );
  }
);

SlotListGraphic.displayName = 'SlotListGraphic';
