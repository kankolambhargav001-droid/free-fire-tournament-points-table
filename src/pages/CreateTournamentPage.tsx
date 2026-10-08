import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Flame,
  Check,
  Calendar,
  Layers,
  RotateCcw,
  Sparkles,
  Info,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ProgressIndicator } from '../components/common/ProgressIndicator';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { NumberStepper } from '../components/ui/NumberStepper';
import { useTournaments, DEFAULT_FREE_FIRE_POINTS } from '../context/TournamentContext';

export const CreateTournamentPage: React.FC = () => {
  const navigate = useNavigate();
  const { createTournament } = useTournaments();

  // Get current date formatted YYYY-MM-DD
  const todayStr = new Date().toISOString().split('T')[0];

  // Section 1: Basic Information State
  const [name, setName] = useState('9 PM Practice');
  const [subtitle, setSubtitle] = useState('Daily Practice Match');
  const [organizer, setOrganizer] = useState('Vortex Esports Org');
  const [date, setDate] = useState(todayStr);

  // Section 2: Tournament Structure State
  const [teamCount, setTeamCount] = useState(12);
  const [playersPerTeam, setPlayersPerTeam] = useState(4);
  const [matchCount, setMatchCount] = useState(3);

  // Section 3: Scoring System State
  const [scoringPreset, setScoringPreset] = useState<'Free Fire Standard' | 'Custom'>('Free Fire Standard');
  const [placementPoints, setPlacementPoints] = useState<Record<number, number>>({ ...DEFAULT_FREE_FIRE_POINTS });
  const [pointsPerKill, setPointsPerKill] = useState<number>(1);

  // Section 4: Points Table Settings State
  const [showKills, setShowKills] = useState(true);
  const [showPlacement, setShowPlacement] = useState(true);
  const [showMatchPoints, setShowMatchPoints] = useState(true);
  const [showTotalPoints, setShowTotalPoints] = useState(true);
  const [tableHeading, setTableHeading] = useState('POINT TABLE');
  const [tableSubtitle, setTableSubtitle] = useState('Daily Practice Match');
  const [tableOrganizer, setTableOrganizer] = useState('Vortex Esports Org');

  // Keep table defaults synchronized with Section 1 if user hasn't typed custom table values
  const [customTableSubtitleEdited, setCustomTableSubtitleEdited] = useState(false);
  const [customTableOrganizerEdited, setCustomTableOrganizerEdited] = useState(false);

  useEffect(() => {
    if (!customTableSubtitleEdited) {
      setTableSubtitle(subtitle);
    }
  }, [subtitle, customTableSubtitleEdited]);

  useEffect(() => {
    if (!customTableOrganizerEdited) {
      setTableOrganizer(organizer);
    }
  }, [organizer, customTableOrganizerEdited]);

  // Validation Errors State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Handle Preset Change
  const handlePresetChange = (preset: 'Free Fire Standard' | 'Custom') => {
    setScoringPreset(preset);
    if (preset === 'Free Fire Standard') {
      setPlacementPoints({ ...DEFAULT_FREE_FIRE_POINTS });
      setPointsPerKill(1);
    }
  };

  const handleResetToStandard = () => {
    setScoringPreset('Free Fire Standard');
    setPlacementPoints({ ...DEFAULT_FREE_FIRE_POINTS });
    setPointsPerKill(1);
  };

  const handlePlacementPointChange = (rank: number, valStr: string) => {
    const val = parseInt(valStr, 10);
    setPlacementPoints((prev) => ({
      ...prev,
      [rank]: isNaN(val) ? 0 : Math.max(0, val),
    }));
    if (scoringPreset === 'Free Fire Standard') {
      setScoringPreset('Custom');
    }
  };

  const handleKillPointChange = (valStr: string) => {
    const val = parseInt(valStr, 10);
    setPointsPerKill(isNaN(val) ? 0 : Math.max(0, val));
    if (scoringPreset === 'Free Fire Standard') {
      setScoringPreset('Custom');
    }
  };

  // Validation logic
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Tournament name is required';
    }

    if (!organizer.trim()) {
      newErrors.organizer = 'Organizer name is required';
    }

    if (teamCount < 2 || teamCount > 50) {
      newErrors.teamCount = 'Number of teams must be between 2 and 50';
    }

    if (playersPerTeam < 1 || playersPerTeam > 10) {
      newErrors.playersPerTeam = 'Players per team must be between 1 and 10';
    }

    if (matchCount < 1 || matchCount > 20) {
      newErrors.matchCount = 'Number of matches must be between 1 and 20';
    }

    if (pointsPerKill < 0 || isNaN(pointsPerKill)) {
      newErrors.pointsPerKill = 'Kill points must be a non-negative integer';
    }

    // Validate placement points
    for (const [rank, pts] of Object.entries(placementPoints)) {
      if (pts < 0 || isNaN(pts)) {
        newErrors[`rank_${rank}`] = 'Points must be non-negative';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setIsConfirmModalOpen(true);
    }
  };

  const handleFinalCreate = () => {
    const newId = createTournament({
      name: name.trim(),
      subtitle: subtitle.trim(),
      organizer: organizer.trim(),
      date,
      teamCount,
      playersPerTeam,
      matchCount,
      scoring: {
        preset: scoringPreset,
        placementPoints,
        pointsPerKill,
      },
      tableSettings: {
        showKills,
        showPlacement,
        showMatchPoints,
        showTotalPoints,
        heading: tableHeading,
        subtitle: tableSubtitle,
        organizer: tableOrganizer,
      },
    });

    setIsConfirmModalOpen(false);
    navigate(`/tournament/${newId}`);
  };

  // Ranks to show in scoring table (up to 12 or teamCount)
  const displayRanks = Array.from(
    { length: Math.min(12, Math.max(teamCount, 6)) },
    (_, i) => i + 1
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Progress Indicator */}
      <ProgressIndicator currentStep={1} className="mb-2" />

      {/* Header */}
      <PageHeader
        title="Create Tournament"
        subtitle="Set up your tournament before adding teams and match results."
        backTo="/"
        backLabel="Back to Dashboard"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Form (col-span-8) */}
        <div className="lg:col-span-8 space-y-7">
          <form onSubmit={handleOpenConfirm} className="space-y-7">
            {/* ================================================= */}
            {/* SECTION 1 — BASIC INFORMATION */}
            {/* ================================================= */}
            <div className="rounded-xl bg-[#17171F] border border-[#242434] p-6 sm:p-7 shadow-lg">
              <div className="pb-4 border-b border-[#232332] mb-5">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Basic Information
                </h3>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  Give your tournament a name and choose how it should appear in your points table.
                </p>
              </div>

              <div className="space-y-4">
                <Input
                  label="Tournament Name"
                  placeholder="9 PM Practice"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: '' });
                  }}
                  error={errors.name}
                  hint="Official title displayed on workspaces and points graphics."
                  required
                />

                <Input
                  label="Tournament Subtitle"
                  placeholder="Daily Practice Match"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  hint="Group, round, or scrim division (e.g. Daily Practice Match, Group A Round 1)."
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Organizer Name"
                    placeholder="Your Organization"
                    value={organizer}
                    onChange={(e) => {
                      setOrganizer(e.target.value);
                      if (errors.organizer) setErrors({ ...errors, organizer: '' });
                    }}
                    error={errors.organizer}
                    hint="Your gaming clan, esports org, or brand."
                    required
                  />

                  <Input
                    type="date"
                    label="Tournament Date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    leftIcon={<Calendar className="w-4 h-4 text-[#9CA3AF]" />}
                    hint="Event scheduled date."
                  />
                </div>
              </div>
            </div>

            {/* ================================================= */}
            {/* SECTION 2 — TOURNAMENT STRUCTURE */}
            {/* ================================================= */}
            <div className="rounded-xl bg-[#17171F] border border-[#242434] p-6 sm:p-7 shadow-lg">
              <div className="pb-4 border-b border-[#232332] mb-5">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Tournament Structure
                </h3>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  Tell us how many teams and matches your tournament will contain.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <NumberStepper
                  label="Number of Teams"
                  value={teamCount}
                  onChange={(val) => {
                    setTeamCount(val);
                    if (errors.teamCount) setErrors({ ...errors, teamCount: '' });
                  }}
                  min={2}
                  max={50}
                  unit="teams"
                  hint="Standard Free Fire lobby: 12"
                  error={errors.teamCount}
                />

                <NumberStepper
                  label="Players Per Team"
                  value={playersPerTeam}
                  onChange={(val) => {
                    setPlayersPerTeam(val);
                    if (errors.playersPerTeam) setErrors({ ...errors, playersPerTeam: '' });
                  }}
                  min={1}
                  max={10}
                  unit="players"
                  hint="Squad = 4, Duo = 2, Solo = 1"
                  error={errors.playersPerTeam}
                />

                <NumberStepper
                  label="Number of Matches"
                  value={matchCount}
                  onChange={(val) => {
                    setMatchCount(val);
                    if (errors.matchCount) setErrors({ ...errors, matchCount: '' });
                  }}
                  min={1}
                  max={20}
                  unit="matches"
                  hint="Practice: 3, Finals: 6"
                  error={errors.matchCount}
                />
              </div>
            </div>

            {/* ================================================= */}
            {/* SECTION 3 — SCORING SYSTEM */}
            {/* ================================================= */}
            <div className="rounded-xl bg-[#17171F] border border-[#242434] p-6 sm:p-7 shadow-lg">
              <div className="pb-4 border-b border-[#232332] mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-white tracking-tight">
                    Scoring System
                  </h3>
                  <p className="text-sm text-[#9CA3AF] mt-1">
                    Choose the points system used by this tournament.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResetToStandard}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    className="text-xs text-[#9CA3AF] hover:text-[#F58F7C]"
                  >
                    Reset to Standard
                  </Button>
                </div>
              </div>

              <div className="space-y-5">
                {/* Scoring Preset Select */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Scoring Preset"
                    options={[
                      { value: 'Free Fire Standard', label: 'Free Fire Standard (Official 12-pt)' },
                      { value: 'Custom', label: 'Custom Point Values' },
                    ]}
                    value={scoringPreset}
                    onChange={(e) =>
                      handlePresetChange(e.target.value as 'Free Fire Standard' | 'Custom')
                    }
                    hint="Official Free Fire rule: 12 pts for #1, 1 pt per kill."
                  />

                  {/* Kill Points Field */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-[#E5E7EB] tracking-wide">
                      Kill Points
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="0"
                        value={pointsPerKill}
                        onChange={(e) => handleKillPointChange(e.target.value)}
                        className="w-full bg-[#14141C] text-[#F3F4F6] text-[15px] font-mono font-bold rounded-lg border border-[#262636] hover:border-[#333347] focus:border-[#F58F7C] focus:ring-1 focus:ring-[#F58F7C] py-2.5 px-3.5 outline-none"
                      />
                      <span className="absolute right-3.5 text-xs text-[#9CA3AF] font-mono pointer-events-none">
                        pt / kill
                      </span>
                    </div>
                    <span className="text-xs text-[#9CA3AF]">
                      Standard: 1 elimination = 1 point
                    </span>
                    {errors.pointsPerKill && (
                      <span className="text-xs text-red-400">{errors.pointsPerKill}</span>
                    )}
                  </div>
                </div>

                {/* Placement Points Grid */}
                <div className="pt-3">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-sm font-medium text-[#E5E7EB] tracking-wide">
                      Placement Points (#1 to #{displayRanks.length})
                    </span>
                    {scoringPreset === 'Custom' && (
                      <span className="text-xs font-mono text-[#F58F7C] bg-[#F58F7C]/10 px-2 py-0.5 rounded border border-[#F58F7C]/30">
                        Custom Matrix Active
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {displayRanks.map((rank) => (
                      <div
                        key={rank}
                        className="p-2.5 rounded-lg bg-[#13131C] border border-[#232332] flex flex-col items-center gap-1.5"
                      >
                        <span className="text-xs font-mono font-semibold text-[#9CA3AF]">
                          #{rank}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={placementPoints[rank] ?? 0}
                          onChange={(e) => handlePlacementPointChange(rank, e.target.value)}
                          className="w-full text-center bg-[#1A1A26] text-white font-mono font-bold text-sm rounded py-1 border border-[#2D2D42] focus:border-[#F58F7C] focus:ring-1 focus:ring-[#F58F7C] outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ================================================= */}
            {/* SECTION 4 — POINTS TABLE SETTINGS */}
            {/* ================================================= */}
            <div className="rounded-xl bg-[#17171F] border border-[#242434] p-6 sm:p-7 shadow-lg">
              <div className="pb-4 border-b border-[#232332] mb-5">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Points Table
                </h3>
                <p className="text-sm text-[#9CA3AF] mt-1">
                  Choose the information that will appear in your final standings.
                </p>
              </div>

              <div className="space-y-5">
                {/* 4 Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <label className="flex items-center gap-3 p-3 rounded-lg bg-[#14141D] border border-[#232332] hover:border-[#313145] transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showKills}
                      onChange={(e) => setShowKills(e.target.checked)}
                      className="w-4 h-4 rounded border-[#38384E] bg-[#1A1A26] text-[#F58F7C] focus:ring-0 cursor-pointer accent-[#F58F7C]"
                    />
                    <div>
                      <span className="text-sm font-medium text-white block">Show Kills</span>
                      <span className="text-xs text-[#9CA3AF]">Display total kill points in table</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg bg-[#14141D] border border-[#232332] hover:border-[#313145] transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPlacement}
                      onChange={(e) => setShowPlacement(e.target.checked)}
                      className="w-4 h-4 rounded border-[#38384E] bg-[#1A1A26] text-[#F58F7C] focus:ring-0 cursor-pointer accent-[#F58F7C]"
                    />
                    <div>
                      <span className="text-sm font-medium text-white block">Show Placement</span>
                      <span className="text-xs text-[#9CA3AF]">Display placement rank & points</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg bg-[#14141D] border border-[#232332] hover:border-[#313145] transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showMatchPoints}
                      onChange={(e) => setShowMatchPoints(e.target.checked)}
                      className="w-4 h-4 rounded border-[#38384E] bg-[#1A1A26] text-[#F58F7C] focus:ring-0 cursor-pointer accent-[#F58F7C]"
                    />
                    <div>
                      <span className="text-sm font-medium text-white block">Show Match-by-Match Points</span>
                      <span className="text-xs text-[#9CA3AF]">Display per-match breakdowns</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg bg-[#14141D] border border-[#232332] hover:border-[#313145] transition-colors cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showTotalPoints}
                      onChange={(e) => setShowTotalPoints(e.target.checked)}
                      className="w-4 h-4 rounded border-[#38384E] bg-[#1A1A26] text-[#F58F7C] focus:ring-0 cursor-pointer accent-[#F58F7C]"
                    />
                    <div>
                      <span className="text-sm font-medium text-white block">Show Total Points</span>
                      <span className="text-xs text-[#9CA3AF]">Highlight overall cumulative points</span>
                    </div>
                  </label>
                </div>

                {/* Table Branding Customization */}
                <div className="pt-2 border-t border-[#232332] grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Input
                    label="Table Heading"
                    placeholder="POINT TABLE"
                    value={tableHeading}
                    onChange={(e) => setTableHeading(e.target.value)}
                    hint="Top graphic title"
                  />

                  <Input
                    label="Subtitle"
                    placeholder="Daily Practice Match"
                    value={tableSubtitle}
                    onChange={(e) => {
                      setTableSubtitle(e.target.value);
                      setCustomTableSubtitleEdited(true);
                    }}
                    hint="Defaults to tournament subtitle"
                  />

                  <Input
                    label="Organizer"
                    placeholder="Your Organization"
                    value={tableOrganizer}
                    onChange={(e) => {
                      setTableOrganizer(e.target.value);
                      setCustomTableOrganizerEdited(true);
                    }}
                    hint="Defaults to organizer name"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-4 pt-4 border-t border-[#232332]">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                onClick={() => navigate('/')}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full sm:w-auto shadow-lg shadow-[#F58F7C]/25"
              >
                Create Tournament
              </Button>
            </div>
          </form>
        </div>

        {/* Live Summary Card (col-span-4, sticky on desktop) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
          <div className="rounded-xl bg-[#17171F] border border-[#242434] p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#232332]">
              <h3 className="font-bold text-white text-lg tracking-tight">
                Tournament Summary
              </h3>
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Preview
              </span>
            </div>

            <div className="py-4 space-y-3.5 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[#9CA3AF]">Tournament:</span>
                <span className="font-bold text-white text-right break-words max-w-[180px]">
                  {name || 'Untitled Tournament'}
                </span>
              </div>

              {subtitle && (
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#9CA3AF]">Subtitle:</span>
                  <span className="text-xs text-[#D1D5DB] text-right break-words max-w-[180px]">
                    {subtitle}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF]">Date:</span>
                <span className="font-mono text-xs text-[#D1D5DB]">
                  {date || 'Today'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF]">Teams:</span>
                <span className="font-mono font-bold text-white">
                  {teamCount} Teams
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF]">Players per Team:</span>
                <span className="font-mono text-white">
                  {playersPerTeam} {playersPerTeam === 4 ? '(Squad)' : playersPerTeam === 2 ? '(Duo)' : playersPerTeam === 1 ? '(Solo)' : ''}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF]">Matches:</span>
                <span className="font-mono font-bold text-white">
                  {matchCount} Matches
                </span>
              </div>

              <div className="pt-2 border-t border-[#232332] flex items-center justify-between">
                <span className="text-[#9CA3AF]">Scoring:</span>
                <span className="font-mono text-xs font-semibold text-[#F58F7C]">
                  {scoringPreset}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF]">Points per Kill:</span>
                <span className="font-mono text-white">
                  {pointsPerKill} pt
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#9CA3AF]">1st Place Win:</span>
                <span className="font-mono font-bold text-[#F58F7C]">
                  {placementPoints[1] ?? 12} pts
                </span>
              </div>
            </div>

            {/* Subtle status indicator */}
            <div className="mt-4 pt-4 border-t border-[#232332] flex items-center gap-2.5 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Ready to create tournament workspace</span>
            </div>
          </div>

          {/* Quick Notice */}
          <div className="p-4 rounded-xl bg-[#14141E] border border-[#232332] text-xs text-[#9CA3AF] flex items-start gap-2.5">
            <Info className="w-4 h-4 text-[#F58F7C] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Once created, you will be guided to the tournament workspace to manage slots and prepare for match screenshot processing.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        title="Create this tournament?"
        subtitle="Confirm tournament setup parameters before creating your workspace."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setIsConfirmModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleFinalCreate}
              className="shadow-md shadow-[#F58F7C]/20"
            >
              Create Tournament
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#1B1B26] border border-[#29293C] space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-lg font-bold text-white">{name}</h4>
                <p className="text-xs text-[#9CA3AF] mt-0.5">{subtitle || 'Practice Scrim'}</p>
              </div>
              <span className="text-xs font-mono text-[#F58F7C] bg-[#F58F7C]/10 px-2 py-0.5 rounded border border-[#F58F7C]/25">
                {scoringPreset}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#232332] text-center font-mono">
              <div className="p-2 rounded bg-[#13131B] border border-[#232332]">
                <div className="text-[11px] text-[#9CA3AF]">Teams</div>
                <div className="text-sm font-bold text-white mt-0.5">{teamCount}</div>
              </div>
              <div className="p-2 rounded bg-[#13131B] border border-[#232332]">
                <div className="text-[11px] text-[#9CA3AF]">Players / Team</div>
                <div className="text-sm font-bold text-white mt-0.5">{playersPerTeam}</div>
              </div>
              <div className="p-2 rounded bg-[#13131B] border border-[#232332]">
                <div className="text-[11px] text-[#9CA3AF]">Matches</div>
                <div className="text-sm font-bold text-white mt-0.5">{matchCount}</div>
              </div>
            </div>

            <div className="text-xs text-[#9CA3AF] pt-1">
              Organized by <strong className="text-white">{organizer}</strong> • Date: <span className="font-mono text-[#D1D5DB]">{date}</span>
            </div>
          </div>

          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            Your tournament workspace will be initialized with {teamCount} team slots, {matchCount} match rounds, and the selected scoring matrix.
          </p>
        </div>
      </Modal>
    </div>
  );
};
