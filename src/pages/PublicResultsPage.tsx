import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Trophy,
  Users,
  Swords,
  Calendar,
  Share2,
  Download,
  CheckCircle2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Home,
  Loader2,
  Shield,
  Layers,
} from 'lucide-react';
import { PointsTableGraphic } from '../components/table/PointsTableGraphic';
import { SiteFooter } from '../components/layout/SiteFooter';
import { Button } from '../components/ui/Button';
import { getPublishedTournamentFromCloud, subscribeToPublishedTournament, PublishedTournamentRecord } from '../services/tournamentCloud';
import { exportPointsTableAsPng, sanitizePointsTableFilename } from '../utils/exportPointsTable';

export const PublicResultsPage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tournamentData, setTournamentData] = useState<PublishedTournamentRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'standings' | 'matches'>('standings');
  const [expandedMatch, setExpandedMatch] = useState<number | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const graphicRef = useRef<HTMLDivElement>(null);

  const loadResults = async () => {
    if (!publicId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchError(null);

    try {
      const data = await getPublishedTournamentFromCloud(publicId);
      setTournamentData(data);
      if (data?.name) {
        document.title = `${data.name} — Tournament Points`;
      }
    } catch (err: any) {
      console.error('Failed to load tournament results:', err);
      setFetchError(
        err.message || 'Unable to connect to cloud services. Please check your internet connection.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Set document title and fetch tournament
  useEffect(() => {
    loadResults();

    if (!publicId) return;

    // Realtime subscription for live refresh if open on viewer device
    try {
      const unsubscribe = subscribeToPublishedTournament(publicId, (data) => {
        if (data) {
          setTournamentData(data);
          if (data.name) {
            document.title = `${data.name} — Tournament Points`;
          }
        }
      });
      return () => unsubscribe();
    } catch {
      // Non-fatal
    }
  }, [publicId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleShareResults = async () => {
    if (!tournamentData) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const publicUrl = `${origin}/results/${tournamentData.publicId}`;
    const shareData = {
      title: `${tournamentData.name} — Tournament Results`,
      text: `View the latest tournament standings and points for ${tournamentData.name}.`,
      url: publicUrl,
    };

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        showToast('Results shared successfully.');
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          return;
        }
      }
    }

    try {
      await navigator.clipboard.writeText(publicUrl);
      showToast('Public results link copied.');
    } catch {
      showToast(`Link: ${publicUrl}`);
    }
  };

  const handleDownloadPng = async () => {
    if (!graphicRef.current || !tournamentData) return;
    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const filename = sanitizePointsTableFilename(
        tournamentData.name,
        tournamentData.design?.format || '4:5'
      );
      await exportPointsTableAsPng(graphicRef.current, filename, {
        format: tournamentData.design?.format || '4:5',
      });
      showToast('PNG downloaded successfully.');
    } catch (err) {
      console.error('PNG export failed:', err);
      showToast("Couldn't generate the points table image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090F] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-2xl bg-[#F58F7C]/10 border border-[#F58F7C]/30 animate-pulse" />
          <Loader2 className="w-8 h-8 text-[#F58F7C] animate-spin" />
        </div>
        <h3 className="text-base font-bold text-white uppercase tracking-wider font-mono">
          Loading Tournament Standings
        </h3>
        <p className="text-xs font-mono text-[#9CA3AF] mt-1.5 max-w-xs">
          Connecting to live results feed...
        </p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-[#09090F] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#14141E] border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
          Unable to Load Results
        </h2>
        <p className="text-xs text-[#9CA3AF] max-w-md font-mono leading-relaxed mb-6">
          {fetchError}
        </p>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={loadResults}
            leftIcon={<Loader2 className="w-4 h-4" />}
          >
            Try Again
          </Button>
          <Button
            variant="secondary"
            onClick={() => navigate('/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  if (!tournamentData) {
    return (
      <div className="min-h-screen bg-[#09090F] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#14141E] border border-[#27273C] flex items-center justify-center text-[#F58F7C] mb-4 shadow-xl">
          <Trophy className="w-8 h-8 text-[#6B7280]" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white mb-2">
          Results Not Found
        </h2>
        <p className="text-xs text-[#9CA3AF] max-w-md font-mono leading-relaxed mb-6">
          This tournament results page doesn't exist, has been unpublished, or the public link is invalid.
        </p>
        <Button
          variant="primary"
          onClick={() => navigate('/')}
          leftIcon={<Home className="w-4 h-4" />}
        >
          Back to Home
        </Button>
      </div>
    );
  }

  // Calculate total kills across completed matches
  const totalKillsAcrossMatches = Object.values(tournamentData.savedMatches || {}).reduce(
    (acc, m) => acc + (m.totalKills || 0),
    0
  );

  return (
    <div className="min-h-screen bg-[#09090F] text-white flex flex-col selection:bg-[#F58F7C] selection:text-black">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#14141E] border border-[#F58F7C]/40 text-white shadow-2xl flex items-center gap-2.5 font-mono text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#F58F7C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Navigation / Header */}
      <header className="border-b border-[#1E1E2E] bg-[#0E0E16]/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F58F7C] to-[#D98200] flex items-center justify-center text-black font-black shadow-lg shadow-[#F58F7C]/20">
              <Trophy className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                <span>TOURNAMENT POINTS</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase">
                  Official Results
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#71717A] truncate max-w-[200px] sm:max-w-md">
                {tournamentData.organizer || 'Esports Tournament'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={handleShareResults}
              className="text-xs py-1.5 px-3"
              leftIcon={<Share2 className="w-3.5 h-3.5" />}
            >
              Share Results
            </Button>
            <Button
              variant="primary"
              onClick={handleDownloadPng}
              disabled={isExporting}
              className="text-xs py-1.5 px-3"
              leftIcon={isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            >
              {isExporting ? 'Generating...' : 'Download PNG'}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#13131F] to-[#09090F] border-b border-[#1C1C2C] py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 font-mono text-xs text-[#F58F7C] uppercase tracking-wider">
                <span className="font-bold">{tournamentData.game}</span>
                <span>•</span>
                <span>{tournamentData.subtitle || 'Overall Standings'}</span>
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-white drop-shadow-md">
                {tournamentData.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 font-mono text-xs text-[#9CA3AF] pt-1">
                {tournamentData.organizer && (
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#F58F7C]" />
                    {tournamentData.organizer}
                  </span>
                )}
                {tournamentData.date && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    {tournamentData.date}
                  </span>
                )}
                <span className="text-[#4E4E62]">•</span>
                <span className="text-emerald-400">
                  Last updated {new Date(tournamentData.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto shrink-0">
              <div className="p-3 rounded-xl bg-[#141420]/80 border border-[#27273C] text-center min-w-[90px]">
                <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Teams</div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 font-mono">
                  {tournamentData.teamCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#141420]/80 border border-[#27273C] text-center min-w-[90px]">
                <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Matches</div>
                <div className="text-xl sm:text-2xl font-black text-white mt-0.5 font-mono">
                  {tournamentData.completedMatches} / {tournamentData.matchCount}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-[#141420]/80 border border-[#27273C] text-center min-w-[90px]">
                <div className="text-[10px] font-mono text-[#9CA3AF] uppercase">Total Kills</div>
                <div className="text-xl sm:text-2xl font-black text-[#F58F7C] mt-0.5 font-mono">
                  {totalKillsAcrossMatches}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mt-8 border-b border-[#212130]">
            <button
              type="button"
              onClick={() => setActiveTab('standings')}
              className={`pb-3 px-3 font-mono text-xs uppercase tracking-wider font-bold transition-all relative ${
                activeTab === 'standings'
                  ? 'text-[#F58F7C]'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Overall Points Table
              {activeTab === 'standings' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F58F7C]" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('matches')}
              className={`pb-3 px-3 font-mono text-xs uppercase tracking-wider font-bold transition-all relative ${
                activeTab === 'matches'
                  ? 'text-[#F58F7C]'
                  : 'text-[#9CA3AF] hover:text-white'
              }`}
            >
              Match Breakdown ({Object.keys(tournamentData.savedMatches || {}).length})
              {activeTab === 'matches' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#F58F7C]" />
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full">
        {activeTab === 'standings' ? (
          <div className="flex flex-col items-center">
            {/* The Points Table Graphic */}
            <div className="w-full max-w-[850px] shadow-2xl rounded-2xl overflow-hidden border border-[#26263A] bg-[#09090F]">
              <PointsTableGraphic
                ref={graphicRef}
                config={tournamentData.design}
                standings={tournamentData.standings}
                matchCount={tournamentData.matchCount}
                isExporting={isExporting}
                className="w-full"
              />
            </div>
          </div>
        ) : (
          /* Match Breakdown View */
          <div className="space-y-4 max-w-4xl mx-auto">
            {Object.keys(tournamentData.savedMatches || {}).length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#14141E] border border-[#252536] text-center">
                <Swords className="w-8 h-8 text-[#9CA3AF] mx-auto mb-2" />
                <h4 className="text-base font-bold text-white">No Match Breakdowns Available</h4>
                <p className="text-xs text-[#9CA3AF] font-mono mt-1">
                  Individual match statistics will appear here as they are completed.
                </p>
              </div>
            ) : (
              Object.entries(tournamentData.savedMatches || {})
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([matchNumStr, match]) => {
                  const mNum = Number(matchNumStr);
                  const isExpanded = expandedMatch === mNum;
                  const winner = match.results?.find((r) => r.placement === 1);

                  return (
                    <div
                      key={mNum}
                      className="rounded-2xl bg-[#14141E] border border-[#242436] overflow-hidden transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedMatch(isExpanded ? null : mNum)}
                        className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-[#181826] transition-colors"
                      >
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#1C1C2A] border border-[#2C2C3E] flex items-center justify-center font-mono font-bold text-sm text-[#F58F7C]">
                            M{mNum}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-white text-base">
                                {match.mapName || `Match ${mNum}`}
                              </h3>
                              {winner && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#F58F7C]/15 text-[#F58F7C] border border-[#F58F7C]/30 font-bold">
                                  Winner: {winner.teamName || `Slot #${winner.placement}`}
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-[#9CA3AF] mt-0.5">
                              {match.results?.length || 0} teams • {match.totalKills} kills
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-xs font-mono text-[#9CA3AF] hidden sm:inline">
                            {isExpanded ? 'Hide Details' : 'View Breakdown'}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-[#9CA3AF]" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-[#9CA3AF]" />
                          )}
                        </div>
                      </button>

                      {/* Expanded match details */}
                      {isExpanded && match.results && (
                        <div className="border-t border-[#202030] p-4 overflow-x-auto">
                          <table className="w-full text-left border-collapse min-w-[500px] text-xs font-mono">
                            <thead>
                              <tr className="border-b border-[#242436] text-[#9CA3AF]">
                                <th className="py-2 px-3 text-center w-12">#</th>
                                <th className="py-2 px-3">TEAM</th>
                                <th className="py-2 px-3 text-center">KILLS</th>
                                <th className="py-2 px-3 text-center">KILL PTS</th>
                                <th className="py-2 px-3 text-center">PLACE PTS</th>
                                <th className="py-2 px-3 text-right">TOTAL</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#1D1D2B]">
                              {match.results
                                .slice()
                                .sort((a, b) => a.placement - b.placement)
                                .map((slot) => (
                                  <tr
                                    key={slot.placement}
                                    className={slot.placement === 1 ? 'bg-[#F58F7C]/5 font-bold' : ''}
                                  >
                                    <td className="py-2.5 px-3 text-center text-[#9CA3AF]">
                                      #{slot.placement}
                                    </td>
                                    <td className="py-2.5 px-3 text-white font-bold">
                                      {slot.teamName || `Slot #${slot.slotNumber || slot.placement}`}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-zinc-300">
                                      {slot.totalKills}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-[#9CA3AF]">
                                      {slot.killPoints}
                                    </td>
                                    <td className="py-2.5 px-3 text-center text-[#9CA3AF]">
                                      {slot.placementPoints}
                                    </td>
                                    <td className="py-2.5 px-3 text-right font-black text-white">
                                      {slot.totalPoints}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        )}
      </main>

<SiteFooter />
    </div>
  );
};
