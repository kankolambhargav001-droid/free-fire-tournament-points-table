import React from 'react';
import { PointsTableDesignConfig, TeamStanding, Tournament, TournamentConfig } from '../../types';

function getTeamMonogram(teamName: string): string {
  const cleaned = (teamName || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim();
  if (!cleaned) return 'TP';
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return `${words[0][0]}${words[1][0]}`.toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  }).toUpperCase();
}

export interface PointsTableGraphicProps {
  config: PointsTableDesignConfig;
  standings: TeamStanding[];
  tournament?: TournamentConfig | Tournament;
  matchCount?: number;
  className?: string;
  isExporting?: boolean;
}

/**
 * Share-ready tournament result sheet.
 *
 * The scoring engine remains untouched. This component is presentation only:
 * white paper, orange headers, yellow totals, strong typography and generous
 * readability on both phone screenshots and desktop previews.
 */
export const PointsTableGraphic = React.forwardRef<HTMLDivElement, PointsTableGraphicProps>(
  function PointsTableGraphic(
    { config, standings, tournament, matchCount = 3, className = '', isExporting = false },
    ref
  ) {
    const format = config.format || '4:5';
    const totalMatches = tournament?.matchCount || matchCount || 3;

    const displayedTeams = (() => {
      switch (config.teamDisplay) {
        case 'top10': return standings.slice(0, 10);
        case 'top12': return standings.slice(0, 12);
        case 'top16': return standings.slice(0, 16);
        case 'custom': return standings.slice(0, Math.max(1, config.customTeamCount || 12));
        default: return standings;
      }
    })();

    const completedMatches = tournament?.completedMatches ?? 0;
    const title = (config.heading || tournament?.name || 'TOURNAMENT').toUpperCase();
    const subtitle = (config.subtitle || 'OVERALL POINTS TABLE').toUpperCase();
    const dateText = config.customDate || tournament?.date;
    const organizer = config.organizer || tournament?.organizer || '';

    // Final fixed broadcast palette requested by the organizer.
    const orange = '#F36B21';
    const orangeDark = '#E85B16';
    const yellow = '#FFD83D';
    const yellowSoft = '#FFF3B8';
    const paper = '#FFFFFF';
    const rowAlt = '#F3F4F2';
    const ink = '#15171A';
    const muted = '#5E6267';
    const line = '#D9DAD7';
    const soft = '#F8F8F6';

    const landscape = format === '16:9';
    const portrait = format === '9:16';
    const exportSize = landscape
      ? { width: 1920, height: 1080 }
      : portrait
        ? { width: 1080, height: 1920 }
        : { width: 1080, height: 1350 };

    const density = displayedTeams.length;
    const compact = config.typography === 'compact' || density >= 18;
    const large = config.typography === 'large' || (!compact && density <= 14);

    const titleSize = landscape ? 62 : portrait ? 62 : 60;
    const teamSize = landscape ? (large ? 26 : 23) : portrait ? (large ? 28 : 25) : (large ? 27 : 24);
    const cellSize = large ? 15 : compact ? 13 : 14;
    const rowHeight = landscape
      ? density > 18 ? 45 : 58
      : portrait
        ? density > 18 ? 52 : density > 14 ? 60 : 70
        : density > 18 ? 51 : density > 14 ? 61 : 70;
    const headerHeight = landscape ? 205 : portrait ? 255 : 245;
    const footerHeight = landscape ? 70 : 78;

    const rootStyle: React.CSSProperties = {
      fontFamily: 'Arial, Helvetica, sans-serif',
      background: paper,
      color: ink,
      ...(isExporting
        ? { width: exportSize.width, height: exportSize.height }
        : { aspectRatio: landscape ? '16 / 9' : portrait ? '9 / 16' : '4 / 5' }),
    };

    const columns = [
      config.showRank ? '64px' : '',
      config.showTeam ? '76px minmax(270px,1fr)' : '',
      config.showMatchPoints ? '78px' : '',
      config.showBooyahs ?? true ? '100px' : '',
      config.showKills ? '86px' : '',
      config.showPlacementPoints ? '96px' : '',
      config.showTotalPoints ? '106px' : '',
    ].filter(Boolean).join(' ');

    const rankColor = (rank: number) => rank === 1 ? orangeDark : '#50555A';

    return (
      <div
        ref={ref}
        id="points-table-graphic-root"
        className={`relative overflow-hidden select-none tp-poster ${className}`}
        style={rootStyle}
      >
        {/* Clean print-safe frame. No dark fill anywhere in the export. */}
        <div className="absolute inset-0 pointer-events-none" style={{ border: `4px solid ${orange}` }} />
        <div className="absolute top-0 inset-x-0 h-[9px]" style={{ background: orange }} />
        <div className="absolute bottom-0 inset-x-0 h-[7px]" style={{ background: `linear-gradient(90deg, ${orange}, ${yellow}, ${orange})` }} />

        <div className="relative h-full flex flex-col">
          <header
            className="shrink-0"
            style={{
              height: headerHeight,
              padding: landscape ? '38px 54px 26px' : portrait ? '48px 46px 30px' : '42px 42px 26px',
              borderBottom: `1px solid ${line}`,
              background: paper,
            }}
          >
            <div className="h-full flex flex-col justify-end">
              <div className="flex items-end justify-between gap-10">
                <div className="min-w-0 flex-1">
                  <div className="font-black uppercase tracking-[0.22em]" style={{ color: orangeDark, fontSize: 12 }}>
                    {subtitle}
                  </div>
                  <h1
                    className="mt-3 font-black uppercase leading-none truncate"
                    style={{ color: ink, fontSize: titleSize, letterSpacing: '-0.045em' }}
                  >
                    {title}
                  </h1>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 uppercase" style={{ color: muted, fontSize: 11, fontWeight: 700, letterSpacing: '.12em' }}>
                    <span>OVERALL</span>
                    {config.showDate && dateText && <span>{formatDate(dateText)}</span>}
                    {config.showOrganizer && organizer && <span>{organizer}</span>}
                  </div>
                </div>

                <div className="shrink-0 text-right pb-1">
                  <div className="font-black uppercase" style={{ color: ink, fontSize: 14, letterSpacing: '.1em' }}>FREE FIRE</div>
                  <div className="mt-1 font-bold uppercase" style={{ color: muted, fontSize: 10, letterSpacing: '.18em' }}>RESULTS</div>
                  <div className="mt-5 font-black uppercase" style={{ color: ink, fontSize: 11, letterSpacing: '.1em' }}>
                    {displayedTeams.length} TEAMS&nbsp;&nbsp;/&nbsp;&nbsp;{completedMatches}/{totalMatches} MATCHES
                  </div>
                </div>
              </div>

              <div className="mt-6 h-[6px] w-full" style={{ background: `linear-gradient(90deg, ${orange} 0%, ${orange} 64%, ${yellow} 84%, transparent 100%)` }} />
            </div>
          </header>

          <main className="flex-1 shrink-0" style={{ padding: landscape ? '26px 34px 0' : '30px 28px 0' }}>
            {displayedTeams.length === 0 ? (
              <div className="flex items-center justify-center border" style={{ height: 280, background: paper, borderColor: line }}>
                <div className="text-center">
                  <div className="font-black uppercase tracking-[0.18em]" style={{ color: orangeDark, fontSize: 12 }}>NO RESULTS</div>
                  <div className="mt-2 font-bold" style={{ color: '#383C40', fontSize: 16 }}>Complete a match to generate standings.</div>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden border" style={{ borderColor: '#BFC1BE', background: paper }}>
                <div
                  className="grid items-center font-black uppercase"
                  style={{
                    gridTemplateColumns: columns,
                    height: 52,
                    background: orange,
                    color: '#111315',
                    fontSize: 12,
                    letterSpacing: '.06em',
                    padding: '0 12px',
                  }}
                >
                  {config.showRank && <div className="text-center">#</div>}
                  {config.showTeam && <>
                    <div className="text-center">SLOT</div>
                    <div>TEAM</div>
                  </>}
                  {config.showMatchPoints && <div className="text-center">MP</div>}
                  {(config.showBooyahs ?? true) && <div className="text-center">BOOYAH'S</div>}
                  {config.showKills && <div className="text-center">KILLS</div>}
                  {config.showPlacementPoints && <div className="text-center">PP</div>}
                  {config.showTotalPoints && (
                    <div className="text-center flex items-center justify-center" style={{ background: yellow, height: '100%', marginRight: -12 }}>
                      TP
                    </div>
                  )}
                </div>

                {displayedTeams.map((team, index) => {
                  const first = team.rank === 1;
                  const rowBackground = first ? '#FFF9F0' : index % 2 === 0 ? paper : rowAlt;
                  const totalBackground = first ? orange : yellow;

                  return (
                    <div
                      key={`${team.slotNumber}-${team.teamName}-${index}`}
                      className="grid items-center border-b last:border-b-0"
                      style={{
                        gridTemplateColumns: columns,
                        minHeight: rowHeight,
                        background: rowBackground,
                        color: ink,
                        padding: '0 12px',
                        fontSize: cellSize,
                        borderColor: line,
                      }}
                    >
                      {config.showRank && (
                        <div className="text-center font-black" style={{ color: rankColor(team.rank), fontSize: cellSize + 1 }}>
                          {String(team.rank).padStart(2, '0')}
                        </div>
                      )}

                      {config.showTeam && <>
                        <div className="text-center font-bold" style={{ color: '#656A70', fontSize: cellSize - 1 }}>
                          S{String(team.slotNumber ?? index + 1)}
                        </div>
                        <div className="min-w-0 flex items-center gap-3 pr-3">
                          <div
                            className="shrink-0 flex items-center justify-center font-black"
                            style={{
                              width: landscape ? 40 : 44,
                              height: landscape ? 40 : 44,
                              border: `1px solid ${first ? orange : '#C8CAC7'}`,
                              background: first ? '#FFF1E5' : '#F2F3F1',
                              color: first ? orangeDark : '#363A3E',
                              fontSize: 13,
                            }}
                          >
                            {getTeamMonogram(team.teamName)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-black uppercase truncate" style={{ fontSize: teamSize, lineHeight: 1.05, letterSpacing: '-.025em' }}>
                              {team.teamName}
                            </div>
                            {team.teamTag && (
                              <div className="mt-1 uppercase truncate" style={{ color: '#7C8085', fontSize: 9, fontWeight: 700, letterSpacing: '.1em' }}>
                                {team.teamTag}
                              </div>
                            )}
                          </div>
                        </div>
                      </>}

                      {config.showMatchPoints && <div className="text-center font-bold">{team.matchesPlayed}</div>}
                      {(config.showBooyahs ?? true) && <div className="text-center font-bold" style={{ color: team.booyahs > 0 ? orangeDark : '#6D7175' }}>{team.booyahs || 0}</div>}
                      {config.showKills && <div className="text-center font-bold" style={{ color: ink }}>{team.totalKills ?? team.kills}</div>}
                      {config.showPlacementPoints && <div className="text-center font-bold" style={{ color: '#4F5459' }}>{team.totalPlacementPoints ?? team.placementPoints}</div>}

                      {config.showTotalPoints && (
                        <div
                          className="h-full min-h-[inherit] flex items-center justify-center font-black"
                          style={{
                            background: totalBackground,
                            color: first ? '#FFFFFF' : ink,
                            marginRight: -12,
                            fontSize: cellSize + 10,
                            boxShadow: first ? `inset 0 0 0 1px ${orangeDark}` : 'none',
                          }}
                        >
                          {team.totalPoints}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          <footer
            className="mt-auto shrink-0"
            style={{
              height: footerHeight,
              padding: '0 34px',
              color: '#62676C',
              borderTop: `1px solid ${line}`,
              background: paper,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: 10,
              fontWeight: 700,
              gap: 20,
            }}
          >
            <div className="truncate">
              MP&nbsp; Matches Played&nbsp;&nbsp;&nbsp; B&nbsp; Booyah's&nbsp;&nbsp;&nbsp; K&nbsp; Kills&nbsp;&nbsp;&nbsp; PP&nbsp; Placement Points&nbsp;&nbsp;&nbsp; TP&nbsp; Total Points
            </div>
            <div className="font-black uppercase tracking-[0.12em] shrink-0" style={{ color: orangeDark }}>
              MADE WITH LOVE BY BHARGAV
            </div>
          </footer>
        </div>
      </div>
    );
  }
);

PointsTableGraphic.displayName = 'PointsTableGraphic';
