import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Palette,
  RotateCcw,
  Save,
  Check,
  CheckCircle2,
  Trophy,
  Flame,
  Target,
  Shield,
  Layers,
  Sparkles,
  Smartphone,
  Monitor,
  Eye,
  Type,
  LayoutGrid,
  Info,
  Sliders,
  Calendar,
  Users,
  Download,
  Share2,
  Globe,
  FileDown,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ToggleSwitch } from '../components/ui/ToggleSwitch';
import { Modal } from '../components/ui/Modal';
import { PointsTableGraphic } from '../components/table/PointsTableGraphic';
import { SharePointsTableModal } from '../components/modals/SharePointsTableModal';
import { PublishTournamentModal } from '../components/modals/PublishTournamentModal';
import { useTournaments, DEFAULT_SCORING, createDefaultDesignConfig } from '../context/TournamentContext';
import { PointsTableDesignConfig, TournamentConfig, Tournament } from '../types';
import {
  exportPointsTableAsPng,
  generatePointsTablePngBlob,
  sanitizePointsTableFilename,
} from '../utils/exportPointsTable';

export const CustomizePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getTournament,
    getStandingsForTournament,
    getTournamentDesign,
    saveTournamentDesign,
    getSlotList,
    getAllSavedMatches,
    updateTournament,
  } = useTournaments();

  const foundTournament = getTournament(id || '');
  const tournament: TournamentConfig | Tournament = foundTournament || {
    id: id || 't-9pm-practice',
    name: '9 PM Practice',
    subtitle: 'Daily Practice Match',
    organizer: 'Vortex Esports Org',
    teamCount: 12,
    playersPerTeam: 4,
    matchCount: 3,
    completedMatches: 0,
    status: 'in_progress',
    lastUpdated: 'Just now',
    game: 'Free Fire',
    scoring: DEFAULT_SCORING,
  };

  // Live real calculated standings derived from saved match results
  const standings = getStandingsForTournament(tournament.id);

  // Load existing saved design config or create default
  const savedDesign = getTournamentDesign(tournament.id);

  const [config, setConfig] = useState<PointsTableDesignConfig>(() => {
    return {
      ...savedDesign,
      heading: savedDesign.heading || tournament.name.toUpperCase(),
      organizer: savedDesign.organizer || tournament.organizer,
    };
  });

  // Track save confirmation state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [previewScale, setPreviewScale] = useState<'fit' | '100' | '75'>('fit');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Stable DOM ref to the root PointsTableGraphic element
  const graphicRef = useRef<HTMLDivElement>(null);

  const handleDownloadPng = async () => {
    if (!graphicRef.current || isExporting) return;

    try {
      setIsExporting(true);
      setExportError(null);

      // Brief delay to allow React to paint the export layout state
      await new Promise((resolve) => setTimeout(resolve, 150));

      const filename = sanitizePointsTableFilename(
        config.heading || tournament.name,
        config.format || '4:5'
      );

      await exportPointsTableAsPng(graphicRef.current, filename, {
        format: config.format || '4:5',
      });
      showToast('PNG downloaded successfully.');
    } catch (err: any) {
      console.error('Points Table PNG Export error:', err);
      setExportError('Unable to generate the PNG. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePng = async () => {
    if (!graphicRef.current || isExporting) return;

    try {
      setIsExporting(true);
      setExportError(null);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const filename = sanitizePointsTableFilename(
        config.heading || tournament.name,
        config.format || '4:5'
      );

      const blob = await generatePointsTablePngBlob(graphicRef.current, {
        format: config.format || '4:5',
      });
      const file = new File([blob], filename, { type: 'image/png' });

      // Check if native file sharing is supported
      if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${config.heading || tournament.name} - Points Table`,
          text: 'Tournament Points Table',
          files: [file],
        });
        showToast('Points table shared successfully.');
      } else {
        // Fallback: Open Share Modal for desktop/unsupported browsers
        setIsShareModalOpen(true);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Normal user cancellation - do not treat as error
        return;
      }
      console.error('Share error:', err);
      // Fall back to modal dialog
      setIsShareModalOpen(true);
    } finally {
      setIsExporting(false);
    }
  };

  // Sync tournament match visibility defaults if tournament changed
  useEffect(() => {
    if (config.visibleMatches === undefined) {
      const initialMatches: Record<number, boolean> = {};
      for (let i = 1; i <= (tournament.matchCount || 3); i++) {
        initialMatches[i] = true;
      }
      setConfig((prev) => ({ ...prev, visibleMatches: initialMatches }));
    }
  }, [tournament.matchCount]);

  const handleUpdateConfig = <K extends keyof PointsTableDesignConfig>(
    key: K,
    value: PointsTableDesignConfig[K]
  ) => {
    setConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaveSuccess(false);
  };

  const handleToggleMatchColumn = (matchNumber: number, visible: boolean) => {
    setConfig((prev) => {
      const currentMatches = { ...(prev.visibleMatches || {}) };
      currentMatches[matchNumber] = visible;
      return {
        ...prev,
        visibleMatches: currentMatches,
      };
    });
    setSaveSuccess(false);
  };

  const handleSave = () => {
    saveTournamentDesign(tournament.id, config);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3500);
  };

  const handleReset = () => {
    const defaults = createDefaultDesignConfig(
      tournament.name,
      tournament.organizer,
      tournament.matchCount
    );
    setConfig(defaults);
    saveTournamentDesign(tournament.id, defaults);
    setIsResetModalOpen(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 3500);
  };

  const themeOptions: Array<{
    id: PointsTableDesignConfig['theme'];
    name: string;
    color: string;
    bg: string;
  }> = [
    { id: 'gold', name: 'Obsidian Coral', color: '#F58F7C', bg: 'bg-[#F58F7C]' },
    { id: 'cyan', name: 'Obsidian Steel', color: '#C8CDD4', bg: 'bg-[#C8CDD4]' },
    { id: 'crimson', name: 'Obsidian Red', color: '#E85D68', bg: 'bg-[#E85D68]' },
    { id: 'green', name: 'Obsidian Sage', color: '#A7B8A8', bg: 'bg-[#A7B8A8]' },
    { id: 'midnight', name: 'Obsidian Violet', color: '#B5A7C9', bg: 'bg-[#B5A7C9]' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-20">
      {/* Page Header */}
      <PageHeader
        title="Points Table Studio"
        subtitle="Customize and preview your tournament standings."
        backTo={`/tournament/${tournament.id}/standings`}
        backLabel="Back to Standings"
        actions={
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setIsPublishModalOpen(true)}
              className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              leftIcon={<Globe className="w-4 h-4 text-emerald-400" />}
            >
              {tournament.isPublished ? 'Update Published' : 'Publish Results'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setIsResetModalOpen(true)}
              leftIcon={<RotateCcw className="w-4 h-4 text-[#9CA3AF]" />}
              disabled={isExporting}
            >
              Reset Design
            </Button>
            <Button
              variant="secondary"
              onClick={handleDownloadPng}
              disabled={isExporting}
              leftIcon={
                isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#F58F7C]" />
                ) : (
                  <Download className="w-4 h-4 text-[#F58F7C]" />
                )
              }
            >
              {isExporting ? 'Generating...' : 'Download PNG'}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isExporting}
              leftIcon={
                saveSuccess ? (
                  <Check className="w-4 h-4 text-[#0B0B0F]" />
                ) : (
                  <Save className="w-4 h-4 text-[#0B0B0F]" />
                )
              }
              className={saveSuccess ? 'bg-emerald-400 text-black border-emerald-400' : ''}
            >
              {saveSuccess ? 'Design Saved ✓' : 'Save Design'}
            </Button>
          </div>
        }
      />

      {/* Export Error Alert Banner */}
      {exportError && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{exportError}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportError(null)}
            className="text-red-400 hover:text-red-200 px-2 py-0.5 rounded cursor-pointer font-sans"
          >
            ✕
          </button>
        </div>
      )}

      {/* Save Success Notice Banner */}
      {saveSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Design configuration successfully saved to tournament settings.</span>
          </div>
          <span className="text-[11px] text-emerald-400/80">Auto-persisted in local storage</span>
        </div>
      )}

      {/* Main Studio Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* LEFT COLUMN: CUSTOMIZATION CONTROLS */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION 1 — CONTENT */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-[#212130]">
              <Type className="w-4 h-4 text-[#F58F7C]" />
              <h3 className="text-base font-bold text-white uppercase tracking-tight">
                Table Content
              </h3>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 font-mono uppercase">
                  Table Heading
                </label>
                <Input
                  value={config.heading}
                  onChange={(e) => handleUpdateConfig('heading', e.target.value)}
                  placeholder="e.g. 9 PM PRACTICE"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 font-mono uppercase">
                  Subtitle
                </label>
                <Input
                  value={config.subtitle}
                  onChange={(e) => handleUpdateConfig('subtitle', e.target.value)}
                  placeholder="e.g. OVERALL POINTS TABLE"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 font-mono uppercase">
                  Organizer Name
                </label>
                <Input
                  value={config.organizer}
                  onChange={(e) => handleUpdateConfig('organizer', e.target.value)}
                  placeholder="e.g. Vortex Esports Org"
                />
              </div>
            </div>
          </div>

          {/* SECTION 4 — GRAPHIC FORMAT */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#212130]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#F58F7C]" />
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  Graphic Format
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">
                {config.format === '4:5'
                  ? 'Social Standings (4:5)'
                  : config.format === '9:16'
                  ? 'Mobile Story (9:16)'
                  : 'Broadcast (16:9)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: 4:5 Social Standings - PREFERRED */}
              <button
                type="button"
                onClick={() => handleUpdateConfig('format', '4:5')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  config.format === '4:5'
                    ? 'border-[#F58F7C] bg-[#1C1210]/80 text-white shadow-md ring-1 ring-[#F58F7C]/30'
                    : 'border-[#26263A] bg-[#161622] text-[#9CA3AF] hover:border-[#38384E] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <LayoutGrid
                    className={`w-5 h-5 ${
                      config.format === '4:5' ? 'text-[#F58F7C]' : 'text-[#6B7280]'
                    }`}
                  />
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-[#F58F7C]/20 text-[#F58F7C] border border-[#F58F7C]/30">
                      Preferred
                    </span>
                    <span className="text-xs font-mono font-bold">4:5</span>
                  </div>
                </div>
                <div className="font-bold text-sm text-white">Social Standings</div>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug">
                  1080 × 1350 • Instagram Feed & Posts (Compact & Dense)
                </p>
              </button>

              {/* Option 2: 9:16 Vertical Story */}
              <button
                type="button"
                onClick={() => handleUpdateConfig('format', '9:16')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  config.format === '9:16'
                    ? 'border-[#F58F7C] bg-[#1C1210]/80 text-white shadow-md ring-1 ring-[#F58F7C]/30'
                    : 'border-[#26263A] bg-[#161622] text-[#9CA3AF] hover:border-[#38384E] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Smartphone
                    className={`w-5 h-5 ${
                      config.format === '9:16' ? 'text-[#F58F7C]' : 'text-[#6B7280]'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold">9:16</span>
                </div>
                <div className="font-bold text-sm text-white">Vertical Story</div>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug">
                  1080 × 1920 • Mobile Stories & Telegram
                </p>
              </button>

              {/* Option 3: 16:9 Broadcast Wide */}
              <button
                type="button"
                onClick={() => handleUpdateConfig('format', '16:9')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  config.format === '16:9'
                    ? 'border-[#F58F7C] bg-[#1C1210]/80 text-white shadow-md ring-1 ring-[#F58F7C]/30'
                    : 'border-[#26263A] bg-[#161622] text-[#9CA3AF] hover:border-[#38384E] hover:text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Monitor
                    className={`w-5 h-5 ${
                      config.format === '16:9' ? 'text-[#F58F7C]' : 'text-[#6B7280]'
                    }`}
                  />
                  <span className="text-xs font-mono font-bold">16:9</span>
                </div>
                <div className="font-bold text-sm text-white">Broadcast Wide</div>
                <p className="text-[11px] text-[#9CA3AF] mt-0.5 leading-snug">
                  1920 × 1080 • YouTube & Stream Overlays
                </p>
              </button>
            </div>
          </div>

          {/* SECTION 5 — THEME */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#212130]">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#F58F7C]" />
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  Theme
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#F58F7C] uppercase font-bold">
                {themeOptions.find((t) => t.id === config.theme)?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {themeOptions.map((t) => {
                const isSelected = config.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleUpdateConfig('theme', t.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-[#F58F7C] bg-[#1C1210] text-white shadow-md'
                        : 'border-[#262638] bg-[#161622] text-[#9CA3AF] hover:border-[#3A3A52] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full border border-white/20 shrink-0"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-xs font-semibold">{t.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#F58F7C]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 2 — DISPLAY COLUMNS */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#212130]">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-[#F58F7C]" />
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  Display Columns
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#9CA3AF]">
                {tournament.matchCount} Matches Configured
              </span>
            </div>

            <div className="space-y-2.5">
              <ToggleSwitch
                label="Show Rank (#)"
                description="Display placement rank column on the left"
                checked={config.showRank}
                onChange={(checked) => handleUpdateConfig('showRank', checked)}
              />

              <ToggleSwitch
                label="Show Team Name & Tag"
                description="Display squad identity, tag badge, and BOOYAH'S badge"
                checked={config.showTeam}
                onChange={(checked) => handleUpdateConfig('showTeam', checked)}
              />

              <ToggleSwitch
                label="Show Booyah Wins"
                description="Display the number of first-place wins for each team"
                checked={config.showBooyahs ?? true}
                onChange={(checked) => handleUpdateConfig('showBooyahs', checked)}
              />

              <ToggleSwitch
                label="Show Match Points"
                description="Display round-by-round points columns"
                checked={config.showMatchPoints}
                onChange={(checked) => handleUpdateConfig('showMatchPoints', checked)}
              />

              {/* Sub-controls for individual matches */}
              {config.showMatchPoints && (
                <div className="p-3.5 rounded-xl bg-[#11111A] border border-[#212130] space-y-2">
                  <span className="text-[11px] font-mono uppercase text-[#9CA3AF] block font-semibold">
                    Individual Round Columns:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {Array.from({ length: tournament.matchCount || 3 }, (_, i) => i + 1).map(
                      (mNum) => {
                        const isVisible =
                          config.visibleMatches === undefined ||
                          config.visibleMatches[mNum] !== false;

                        return (
                          <button
                            key={mNum}
                            type="button"
                            onClick={() => handleToggleMatchColumn(mNum, !isVisible)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors cursor-pointer border ${
                              isVisible
                                ? 'bg-[#F58F7C]/15 border-[#F58F7C]/60 text-[#F58F7C]'
                                : 'bg-[#181824] border-[#29293C] text-[#6B7280] hover:text-white'
                            }`}
                          >
                            M{mNum} {isVisible ? '✓' : '✗'}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

              <ToggleSwitch
                label="Show Kills"
                description="Total eliminations secured across all rounds"
                checked={config.showKills}
                onChange={(checked) => handleUpdateConfig('showKills', checked)}
              />

              <ToggleSwitch
                label="Show Placement Points"
                description="Points earned strictly from finishing ranks"
                checked={config.showPlacementPoints}
                onChange={(checked) => handleUpdateConfig('showPlacementPoints', checked)}
              />

              <ToggleSwitch
                label="Show Kill Points"
                description="Points earned strictly from eliminations"
                checked={config.showKillPoints}
                onChange={(checked) => handleUpdateConfig('showKillPoints', checked)}
              />

              <ToggleSwitch
                label="Show Total Points"
                description="Prominent final cumulative point tally"
                checked={config.showTotalPoints}
                onChange={(checked) => handleUpdateConfig('showTotalPoints', checked)}
              />
            </div>
          </div>

          {/* SECTION 3 — TEAMS TO DISPLAY */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#212130]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#F58F7C]" />
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  Teams to Display
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#9CA3AF]">
                Total: {standings.length} Teams
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  { id: 'all', label: 'All Teams' },
                  { id: 'top10', label: 'Top 10' },
                  { id: 'top12', label: 'Top 12' },
                  { id: 'top16', label: 'Top 16' },
                  { id: 'custom', label: 'Custom' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleUpdateConfig('teamDisplay', opt.id)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold font-mono transition-colors cursor-pointer text-center ${
                    config.teamDisplay === opt.id
                      ? 'border-[#F58F7C] bg-[#1C1210] text-[#F58F7C]'
                      : 'border-[#26263A] bg-[#161622] text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {config.teamDisplay === 'custom' && (
              <div className="pt-2">
                <label className="text-xs font-semibold text-zinc-300 block mb-1.5 font-mono uppercase">
                  Number of Teams to Show:
                </label>
                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max={tournament.teamCount || 50}
                    value={config.customTeamCount ?? 12}
                    onChange={(e) =>
                      handleUpdateConfig('customTeamCount', parseInt(e.target.value) || 12)
                    }
                  />
                  <span className="text-xs font-mono text-[#9CA3AF] shrink-0">
                    Max: {tournament.teamCount || 50}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 6 — TYPOGRAPHY */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#212130]">
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-[#F58F7C]" />
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  Typography Scale
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">
                {config.typography}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(['compact', 'standard', 'large'] as const).map((typo) => (
                <button
                  key={typo}
                  type="button"
                  onClick={() => handleUpdateConfig('typography', typo)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    config.typography === typo
                      ? 'border-[#F58F7C] bg-[#1C1210] text-[#F58F7C]'
                      : 'border-[#26263A] bg-[#161622] text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider block font-mono">
                    {typo}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 7 — TABLE STYLE */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-[#212130]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#F58F7C]" />
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  Table Style
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#9CA3AF] uppercase">
                {config.tableStyle}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(
                [
                  { id: 'modern', label: 'Modern', desc: 'Card rows' },
                  { id: 'minimal', label: 'Minimal', desc: 'Clean grid' },
                  { id: 'broadcast', label: 'Broadcast', desc: 'High visual' },
                ] as const
              ).map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleUpdateConfig('tableStyle', style.id)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    config.tableStyle === style.id
                      ? 'border-[#F58F7C] bg-[#1C1210] text-[#F58F7C]'
                      : 'border-[#26263A] bg-[#161622] text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  <span className="text-xs font-bold uppercase tracking-wider block font-mono">
                    {style.label}
                  </span>
                  <span className="text-[10px] text-[#6B7280] block mt-0.5">{style.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION 8 & 9 — PODIUM & HEADER METADATA */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 pb-2 border-b border-[#212130]">
              <Trophy className="w-4 h-4 text-[#F58F7C]" />
              <h3 className="text-base font-bold text-white uppercase tracking-tight">
                Podium & Metadata
              </h3>
            </div>

            <div className="space-y-2.5">
              <ToggleSwitch
                label="Show Top 3 Podium"
                description="Highlight 1st, 2nd, and 3rd place teams above the table"
                checked={config.showPodium}
                onChange={(checked) => handleUpdateConfig('showPodium', checked)}
              />

              <ToggleSwitch
                label="Show Organizer in Header"
                description="Displays organizer name in graphic header"
                checked={config.showOrganizer}
                onChange={(checked) => handleUpdateConfig('showOrganizer', checked)}
              />

              <ToggleSwitch
                label="Show Date in Header"
                description="Displays official tournament match date"
                checked={config.showDate}
                onChange={(checked) => handleUpdateConfig('showDate', checked)}
              />

              <ToggleSwitch
                label="Show Official Footer Watermark"
                description="Subtle 'Powered by Tournament Points' footer badge"
                checked={config.showWatermark ?? true}
                onChange={(checked) => handleUpdateConfig('showWatermark', checked)}
              />
            </div>
          </div>

          {/* EXPORT GRAPHIC */}
          <div className="rounded-2xl bg-[#14141E] border border-[#242436] p-5 sm:p-6 space-y-3 shadow-lg">
            <div className="flex items-center gap-2 pb-1 text-zinc-400">
              <Download className="w-4 h-4 text-[#9CA3AF]" />
              <h4 className="text-xs font-mono uppercase font-bold tracking-wider">
                Export Graphic
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="primary"
                onClick={handleDownloadPng}
                disabled={isExporting}
                className="justify-center text-xs"
                leftIcon={
                  isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )
                }
              >
                {isExporting ? 'Generating...' : 'Download PNG'}
              </Button>
              <Button
                variant="secondary"
                onClick={handleSharePng}
                disabled={isExporting}
                className="justify-center text-xs"
                leftIcon={<Share2 className="w-3.5 h-3.5 text-[#F58F7C]" />}
              >
                {isExporting ? 'Generating...' : 'Share PNG'}
              </Button>
            </div>
            <p className="text-[11px] text-[#6B7280] font-mono text-center">
              High-resolution {
                config.format === '4:5'
                  ? '4:5 Social Standings (1080×1350)'
                  : config.format === '9:16'
                  ? '9:16 Story (1080×1920)'
                  : '16:9 Broadcast (1920×1080)'
              } PNG export.
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: LIVE GRAPHIC PREVIEW */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 lg:sticky lg:top-6 space-y-4">
          {/* Preview Toolbar */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#14141E] border border-[#242436]">
            <div className="flex items-center gap-2 font-mono text-xs text-[#9CA3AF]">
              <Eye className="w-4 h-4 text-[#F58F7C]" />
              <span className="font-bold text-white uppercase tracking-wider">
                Live Graphic Preview
              </span>
              <span className="text-[#4E4E62]">•</span>
              <span className="text-[#F58F7C]">
                {config.format === '4:5'
                  ? '4:5 Social (1080×1350)'
                  : config.format === '9:16'
                  ? '9:16 Story (1080×1920)'
                  : '16:9 Broadcast (1920×1080)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewScale('fit')}
                disabled={isExporting}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                  previewScale === 'fit'
                    ? 'bg-[#F58F7C] text-black'
                    : 'bg-[#1C1C28] text-[#9CA3AF] hover:text-white'
                }`}
              >
                Fit
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale('75')}
                disabled={isExporting}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                  previewScale === '75'
                    ? 'bg-[#F58F7C] text-black'
                    : 'bg-[#1C1C28] text-[#9CA3AF] hover:text-white'
                }`}
              >
                75%
              </button>
              <button
                type="button"
                onClick={() => setPreviewScale('100')}
                disabled={isExporting}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold transition-colors ${
                  previewScale === '100'
                    ? 'bg-[#F58F7C] text-black'
                    : 'bg-[#1C1C28] text-[#9CA3AF] hover:text-white'
                }`}
              >
                100%
              </button>
            </div>
          </div>

          {/* Graphic Container with live scaling */}
          <div
            className={`w-full flex justify-center items-start rounded-2xl bg-[#09090F] border border-[#202030] p-3 sm:p-6 shadow-2xl transition-all duration-300 ${
              isExporting ? 'overflow-hidden' : 'overflow-x-auto'
            } ${
              previewScale === '75' && !isExporting ? 'max-h-[850px] overflow-y-auto' : ''
            }`}
          >
            <div
              className={`transition-all duration-300 ${
                isExporting
                  ? config.format === '4:5'
                    ? 'w-[1080px]'
                    : config.format === '9:16'
                    ? 'w-[1080px]'
                    : 'w-[1920px]'
                  : config.format === '4:5'
                  ? 'w-full max-w-[540px]'
                  : config.format === '9:16'
                  ? 'w-full max-w-[460px]'
                  : 'w-full max-w-[850px]'
              }`}
              style={{
                transform:
                  isExporting
                    ? 'none'
                    : previewScale === '75'
                    ? 'scale(0.75)'
                    : previewScale === '100'
                    ? 'scale(1)'
                    : 'none',
                transformOrigin: 'top center',
              }}
            >
              {/* THE REAL GRAPHIC COMPONENT */}
              <PointsTableGraphic
                ref={graphicRef}
                config={config}
                standings={standings}
                tournament={tournament}
                matchCount={tournament.matchCount}
                isExporting={isExporting}
                className="rounded-2xl border border-[#2D2D44]"
              />
            </div>
          </div>

          {/* Quick Notice about Real Data Source */}
          <div className="p-3 rounded-xl bg-[#11111A] border border-[#212130] text-[11px] font-mono text-[#9CA3AF] flex items-center justify-between">
            <span>
              Standings source: Real verified match results ({standings.length} teams).
            </span>
            <span className="text-[#F58F7C]">Live auto-synced</span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-[#14141E] border border-[#F58F7C]/40 text-white shadow-2xl flex items-center gap-2.5 font-mono text-xs animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#F58F7C]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Share Points Table Modal */}
      <SharePointsTableModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        graphicElement={graphicRef.current}
        tournamentName={config.heading || tournament.name}
        format={config.format || '4:5'}
        onToast={showToast}
      />

      {/* Publish Tournament Results Modal */}
      <PublishTournamentModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        tournament={tournament as TournamentConfig}
        slotList={getSlotList(tournament.id) || { tournamentId: tournament.id, slots: [], sourceImages: [] }}
        savedMatches={getAllSavedMatches(tournament.id) || {}}
        design={config}
        standings={standings}
        onPublishedSuccess={(publicId) => {
          updateTournament(tournament.id, {
            isPublished: true,
            publicId,
            publishedAt: new Date().toISOString(),
          });
          showToast('Published successfully! Public link is live.');
        }}
      />

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Design to Default?"
        subtitle="This will restore the standard tournament points table appearance."
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset Design
            </Button>
          </div>
        }
      >
        <p className="text-sm text-[#D1D5DB] leading-relaxed">
          Are you sure you want to reset your graphic visual settings? Your actual tournament
          standings, team slots, and match scores will not be affected.
        </p>
      </Modal>
    </div>
  );
};
