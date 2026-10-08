import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Swords,
  Upload,
  Plus,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Flame,
  FileImage,
  Eye,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Clipboard,
  Shield,
  Users,
  Target,
  ArrowLeft,
  Loader2,
  X,
  HelpCircle,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useTournaments, DEFAULT_SCORING } from '../context/TournamentContext';
import { MatchSlotResult, MatchPlayerResult, SavedMatch, Slot } from '../types';
import {
  mapExtractedResultsToSlots,
  calculateSlotPoints,
  validateMatchResults,
} from '../utils/matchingAndScoring';

interface UploadedImage {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

export const MatchesPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getTournament,
    getMatchesForTournament,
    getSlotsForTournament,
    getSavedMatch,
    saveMatch,
    deleteSavedMatch,
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

  const savedSlots = getSlotsForTournament(tournament.id);
  const matches = getMatchesForTournament(tournament.id);

  // Active match tab: default to Match 1
  const [selectedMatchNumber, setSelectedMatchNumber] = useState<number>(1);
  const currentMatchSummary = matches.find((m) => m.matchNumber === selectedMatchNumber) || matches[0];

  // Saved match for currently selected round
  const existingSavedMatch = getSavedMatch(tournament.id, selectedMatchNumber);

  // View state: 'saved_ready' | 'upload' | 'review'
  const [viewMode, setViewMode] = useState<'saved_ready' | 'upload' | 'review'>(() => {
    return existingSavedMatch && existingSavedMatch.results.length > 0 ? 'saved_ready' : 'upload';
  });

  // Images state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [previewModalImage, setPreviewModalImage] = useState<UploadedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgressStep, setExtractionProgressStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reviewing match results state (editable before saving)
  const [draftResults, setDraftResults] = useState<MatchSlotResult[]>(() => {
    return existingSavedMatch?.results ? [...existingSavedMatch.results] : [];
  });

  // Result editing modal state
  const [editingResult, setEditingResult] = useState<MatchSlotResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // Re-extract confirmation modal
  const [isReExtractConfirmOpen, setIsReExtractConfirmOpen] = useState(false);

  // Delete match confirmation modal
  const [isDeleteMatchModalOpen, setIsDeleteMatchModalOpen] = useState(false);

  // Sync viewMode when switching match tabs or when savedMatch changes
  useEffect(() => {
    const saved = getSavedMatch(tournament.id, selectedMatchNumber);
    if (saved && saved.results.length > 0) {
      setViewMode('saved_ready');
      setDraftResults(saved.results);
    } else {
      setViewMode('upload');
      setDraftResults([]);
      setImages([]);
    }
  }, [selectedMatchNumber, tournament.id]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  // Global paste listener (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (viewMode !== 'upload') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) handleFilesSelected([file]);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [viewMode]);

  // Convert File to Base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Handle selected files
  const handleFilesSelected = async (fileList: FileList | File[]) => {
    setErrorMessage(null);
    const validFiles: File[] = [];

    Array.from(fileList).forEach((file) => {
      if (['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
        validFiles.push(file);
      } else {
        setErrorMessage('Unsupported file format. Please upload PNG, JPG, or WEBP screenshots.');
      }
    });

    if (validFiles.length === 0) return;

    const newUploads: UploadedImage[] = [];
    for (const file of validFiles) {
      try {
        const base64Data = await fileToBase64(file);
        newUploads.push({
          id: `img-match-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
          base64Data,
          mimeType: file.type,
        });
      } catch (err) {
        console.error('Error reading match screenshot:', err);
      }
    }

    setImages((prev) => [...prev, ...newUploads]);
  };

  const handleRemoveImage = (imgId: string) => {
    setImages((prev) => {
      const removed = prev.find((item) => item.id === imgId);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((item) => item.id !== imgId);
    });
    if (previewModalImage?.id === imgId) {
      setPreviewModalImage(null);
    }
  };

  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `match-screenshot-${Date.now()}.png`, { type: imageType });
            await handleFilesSelected([file]);
            return;
          }
        }
      }
      setErrorMessage('No image found in your clipboard. Take a screenshot (Ctrl+C) and try again.');
    } catch (err) {
      setErrorMessage('Clipboard access denied. Please click "Choose Images" or press Ctrl+V directly.');
    }
  };

  // Dynamic progress steps including retry and fallback states
  const extractionProgressSteps = [
    'Uploading match screenshots...',
    'Reading placements & finish rankings...',
    'Reading player names & elimination counts...',
    'Gemini Vision is busy. Retrying…',
    'Retry 2 of 3…',
    'Trying backup vision model…',
    'Matching players to slot list & calculating points...',
  ];

  // Perform Gemini Vision Extraction for Match Results
  const handleExtractMatchResults = async () => {
    if (images.length === 0) {
      setErrorMessage('Please upload at least one match result screenshot first.');
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setExtractionProgressStep(0);

    const progressInterval = setInterval(() => {
      setExtractionProgressStep((prev) => (prev < extractionProgressSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const payload = {
        images: images.map((img) => ({
          data: img.base64Data,
          mimeType: img.mimeType,
        })),
        teamCount: tournament.teamCount,
        playersPerTeam: tournament.playersPerTeam,
        savedSlots,
      };

      const response = await fetch('/api/extract-match-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let data: any = null;

      try {
        data = JSON.parse(responseText);
      } catch {
        // Non-JSON response (e.g. gateway error, proxy error, or body limit)
      }

      if (!response.ok || (data?.error && !data?.results)) {
        const errorObj = data?.error;
        const errorCode = errorObj?.code;
        const serverMsg =
          typeof errorObj === 'object'
            ? errorObj?.message
            : typeof errorObj === 'string'
            ? errorObj
            : '';

        if (response.status === 503 || errorCode === 'GEMINI_UNAVAILABLE') {
          throw new Error('Gemini Vision is temporarily unavailable. Please try again.');
        }
        if (response.status === 413 || errorCode === 'PAYLOAD_TOO_LARGE') {
          throw new Error(
            'Uploaded screenshot files are too large. Please upload smaller or fewer screenshots at a time.'
          );
        }
        if (response.status === 401 || response.status === 403 || errorCode === 'CONFIG_ERROR') {
          throw new Error(
            serverMsg ||
              'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.'
          );
        }
        if (errorCode === 'INVALID_REQUEST') {
          throw new Error(serverMsg || 'At least one match screenshot image is required.');
        }
        if (errorCode === 'INVALID_RESPONSE') {
          throw new Error(
            serverMsg || 'Vision model returned an invalid match-results response. Please try again.'
          );
        }
        if (serverMsg) {
          throw new Error(serverMsg);
        }
        if (!data) {
          if (response.status === 502 || response.status === 504 || response.status >= 500) {
            throw new Error('Gemini Vision is temporarily unavailable. Please try again.');
          }
          throw new Error(`The extraction server returned an error (HTTP ${response.status}). Please try again.`);
        }
        throw new Error('Failed to extract match results. Please try again.');
      }

      if (!data?.results || !Array.isArray(data.results) || data.results.length === 0) {
        throw new Error('Vision model returned an invalid match-results response. Please try again.');
      }

      // Map raw Gemini extracted facts to tournament slot list & compute points
      const mappedResults = mapExtractedResultsToSlots(
        data.results,
        savedSlots,
        tournament.scoring || DEFAULT_SCORING
      );

      // Sort ascending by placement (#1, #2...)
      mappedResults.sort((a, b) => a.placement - b.placement);

      setDraftResults(mappedResults);
      setViewMode('review');
    } catch (err: any) {
      console.error('Match results extraction error:', err);
      let userMessage = err.message || 'An error occurred during Gemini Vision processing.';
      if (
        (err.name === 'TypeError' && err.message?.includes('fetch')) ||
        err.message?.includes('Failed to fetch') ||
        err.message?.includes('NetworkError') ||
        err.message?.includes('Network connection error') ||
        err.message?.includes('Load failed')
      ) {
        userMessage =
          'Network connection error. Could not reach extraction server. Please check your internet connection and try again.';
      }
      setErrorMessage(userMessage);
    } finally {
      clearInterval(progressInterval);
      setIsExtracting(false);
    }
  };

  // Validation checks for draft results
  const validation = validateMatchResults(draftResults, tournament.teamCount);
  const totalCalculatedKills = draftResults.reduce((acc, r) => acc + r.totalKills, 0);
  const totalCalculatedPlayers = draftResults.reduce((acc, r) => acc + r.players.length, 0);
  const expectedTotalPlayers = tournament.teamCount * tournament.playersPerTeam;

  // Edit result handler
  const handleOpenEditResult = (result: MatchSlotResult) => {
    setEditingResult(JSON.parse(JSON.stringify(result)));
    setIsResultModalOpen(true);
  };

  // Live recalculate on modal change
  const handleModalPlacementChange = (newPlacement: number) => {
    if (!editingResult) return;
    const { placementPoints, killPoints, totalPoints } = calculateSlotPoints(
      newPlacement,
      editingResult.totalKills,
      tournament.scoring || DEFAULT_SCORING
    );
    setEditingResult({
      ...editingResult,
      placement: newPlacement,
      placementPoints,
      killPoints,
      totalPoints,
    });
  };

  const handleModalSlotChange = (newSlotNumber: number) => {
    if (!editingResult) return;
    const matchedSlot = savedSlots.find((s) => s.slotNumber === newSlotNumber);
    setEditingResult({
      ...editingResult,
      slotNumber: newSlotNumber,
      teamName: matchedSlot?.teamName || `Slot ${newSlotNumber}`,
      status: 'valid',
      warningMessage: undefined,
    });
  };

  const handleModalPlayerKillsChange = (playerIndex: number, killsVal: string) => {
    if (!editingResult) return;
    const killsNum = parseInt(killsVal, 10);
    const validKills = isNaN(killsNum) ? 0 : Math.max(0, killsNum);

    const updatedPlayers = editingResult.players.map((p, idx) =>
      idx === playerIndex ? { ...p, kills: validKills, needsReview: false } : p
    );

    const newTotalKills = updatedPlayers.reduce((acc, p) => acc + (p.kills || 0), 0);
    const { placementPoints, killPoints, totalPoints } = calculateSlotPoints(
      editingResult.placement,
      newTotalKills,
      tournament.scoring || DEFAULT_SCORING
    );

    setEditingResult({
      ...editingResult,
      players: updatedPlayers,
      totalKills: newTotalKills,
      placementPoints,
      killPoints,
      totalPoints,
    });
  };

  const handleModalPlayerNameChange = (playerIndex: number, newName: string) => {
    if (!editingResult) return;
    const updatedPlayers = editingResult.players.map((p, idx) =>
      idx === playerIndex ? { ...p, playerName: newName, needsReview: false } : p
    );
    setEditingResult({
      ...editingResult,
      players: updatedPlayers,
    });
  };

  const handleSaveEditedResult = () => {
    if (!editingResult) return;

    setDraftResults((prev) => {
      const updated = prev.map((r) =>
        r.placement === editingResult.placement ? editingResult : r
      );
      return updated.sort((a, b) => a.placement - b.placement);
    });

    setIsResultModalOpen(false);
    setEditingResult(null);
  };

  // Save Match 1
  const handleSaveMatch = () => {
    const savedMatchData: SavedMatch = {
      tournamentId: tournament.id,
      matchNumber: selectedMatchNumber,
      results: draftResults.sort((a, b) => a.placement - b.placement),
      totalKills: totalCalculatedKills,
      savedAt: new Date().toISOString(),
      mapName: currentMatchSummary?.mapName || 'Bermuda',
    };

    saveMatch(savedMatchData);
    setViewMode('saved_ready');
  };

  const handleConfirmReExtract = () => {
    setIsReExtractConfirmOpen(false);
    setViewMode('upload');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Header */}
      <PageHeader
        title={`Match ${selectedMatchNumber}`}
        subtitle={`Upload the Free Fire result screenshots to calculate this match for ${tournament.name}.`}
        backTo={`/tournament/${tournament.id}`}
        backLabel="Back to Workspace"
        actions={
          <div className="flex items-center gap-2">
            {viewMode === 'saved_ready' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReExtractConfirmOpen(true)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Re-extract Match {selectedMatchNumber}
              </Button>
            )}
          </div>
        }
      />

      {/* Match Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#14141D] border border-[#222232]">
        {matches.map((m) => {
          const isActive = m.matchNumber === selectedMatchNumber;
          const isSaved = !!getSavedMatch(tournament.id, m.matchNumber);
          return (
            <button
              key={m.matchNumber}
              onClick={() => setSelectedMatchNumber(m.matchNumber)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? 'bg-[#1F1F2D] text-white border border-[#2F2F44] shadow-md'
                  : 'text-[#9CA3AF] hover:text-white hover:bg-[#1A1A26]'
              }`}
            >
              <span
                className={`w-6 h-6 rounded flex items-center justify-center font-mono text-xs ${
                  isActive
                    ? 'bg-[#F58F7C] text-[#0B0B0F]'
                    : isSaved
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-[#212130] text-[#9CA3AF]'
                }`}
              >
                M{m.matchNumber}
              </span>
              <span>{m.mapName}</span>
              {isSaved && (
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Calculated
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tournament Match Metadata Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 p-4 rounded-xl bg-[#14141E] border border-[#212130]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1E1E2B] text-[#F58F7C] flex items-center justify-center border border-[#2B2B3E]">
            <Swords className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">Active Match</div>
            <div className="text-sm font-bold text-white">
              Match {selectedMatchNumber} • {currentMatchSummary.mapName}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1E1E2B] text-emerald-400 flex items-center justify-center border border-[#2B2B3E]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">Expected Squads</div>
            <div className="text-sm font-bold text-white font-mono">
              {tournament.teamCount} Teams ({tournament.playersPerTeam}v{tournament.playersPerTeam})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1E1E2B] text-amber-400 flex items-center justify-center border border-[#2B2B3E]">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">Scoring Preset</div>
            <div className="text-sm font-bold text-white truncate max-w-[170px]" title={tournament.scoring?.preset}>
              {tournament.scoring?.preset || 'Free Fire Standard'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1E1E2B] text-blue-400 flex items-center justify-center border border-[#2B2B3E]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">Points Per Kill</div>
            <div className="text-sm font-bold text-white font-mono">
              {tournament.scoring?.pointsPerKill ?? 1} pt / elimination
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block text-red-200">Extraction Notice</span>
              <span>{errorMessage}</span>
              <p className="text-xs text-red-300/80 mt-1 font-mono">
                Your selected screenshots are retained and have not been lost.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
            {images.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExtractMatchResults}
                disabled={isExtracting}
                className="border-red-500/40 text-red-200 hover:bg-red-500/20"
              >
                Try Again
              </Button>
            )}
            <button
              onClick={() => setErrorMessage(null)}
              className="p-1 hover:text-white rounded text-zinc-400 hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 1: UPLOAD AREA */}
      {/* ======================================================== */}
      {viewMode === 'upload' && (
        <div className="space-y-6">
          {/* Pending Match Notice Banner (Requirement 15) */}
          <div className="p-4 rounded-xl bg-[#14141E] border border-[#242436] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1B1B26] border border-[#2E2E3E] text-[#F58F7C] flex items-center justify-center shrink-0">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block font-mono">
                  NO MATCH RESULTS FOR MATCH {selectedMatchNumber}
                </span>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Complete Match {selectedMatchNumber} to generate tournament standings.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold uppercase">
              Pending
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Drag & Drop Card (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleFilesSelected(e.dataTransfer.files);
                  }
                }}
                className="relative rounded-2xl bg-[#15151F] border-2 border-dashed border-[#2E2E42] hover:border-[#F58F7C]/60 transition-all duration-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) handleFilesSelected(e.target.files);
                  }}
                  multiple
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-[#1E1E2C] border border-[#2B2B3E] text-[#F58F7C] flex items-center justify-center mb-4 group-hover:scale-105 group-hover:border-[#F58F7C]/40 transition-all shadow-inner">
                  <Upload className="w-8 h-8" />
                </div>

                <h3 className="text-xl font-bold text-white tracking-tight">
                  Upload Match Result Screenshots
                </h3>
                <p className="text-sm text-[#9CA3AF] max-w-md mt-1.5 leading-relaxed">
                  Upload all screenshots containing the final match standings and individual player kill counts.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#6B7280]">
                  <span className="px-2.5 py-1 rounded bg-[#1B1B26] border border-[#282838]">
                    PNG, JPG, JPEG, WEBP
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#1B1B26] border border-[#282838]">
                    1 or More Screenshots
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload className="w-4 h-4" />}
                  >
                    Choose Images
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handlePasteButtonClick}
                    leftIcon={<Clipboard className="w-4 h-4 text-[#F58F7C]" />}
                  >
                    Paste Screenshot
                  </Button>
                </div>
              </div>

              {/* Uploaded Thumbnails Shelf */}
              {images.length > 0 && (
                <div className="rounded-xl bg-[#17171F] border border-[#242434] p-5 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#232332]">
                    <div className="flex items-center gap-2">
                      <FileImage className="w-4 h-4 text-[#F58F7C]" />
                      <span className="text-sm font-bold text-white">
                        Selected Screenshots ({images.length})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImages([])}
                      className="text-xs font-mono text-[#9CA3AF] hover:text-red-400 transition-colors"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {images.map((img, idx) => (
                      <div
                        key={img.id}
                        className="group relative rounded-lg bg-[#12121A] border border-[#262638] overflow-hidden hover:border-[#38384E] transition-all"
                      >
                        <div
                          className="h-28 w-full bg-cover bg-center cursor-pointer relative"
                          style={{ backgroundImage: `url(${img.previewUrl})` }}
                          onClick={() => setPreviewModalImage(img)}
                        >
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye className="w-6 h-6" />
                          </div>
                        </div>

                        <div className="p-2 flex items-center justify-between text-xs">
                          <div className="truncate pr-1">
                            <span className="font-semibold text-white block truncate">
                              Screenshot {idx + 1}
                            </span>
                            <span className="text-[10px] text-[#6B7280] font-mono truncate block">
                              {(img.size / 1024).toFixed(0)} KB
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveImage(img.id)}
                            className="p-1 rounded text-[#9CA3AF] hover:text-red-400 hover:bg-[#20202E] transition-colors"
                            title="Remove image"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Extract Button */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={handleExtractMatchResults}
                      isLoading={isExtracting}
                      disabled={isExtracting}
                      leftIcon={<Swords className="w-5 h-5 text-[#0B0B0F]" />}
                      className="w-full shadow-lg shadow-[#F58F7C]/25 font-bold text-base"
                    >
                      Extract Match Results ({images.length} {images.length === 1 ? 'Screenshot' : 'Screenshots'})
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Explainer & Loading Panel (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl bg-[#17171F] border border-[#242434] p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#232332]">
                  <Trophy className="w-5 h-5 text-[#F58F7C]" />
                  <h4 className="font-bold text-white text-base">
                    How Match Calculation Works
                  </h4>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px] text-[#9CA3AF] leading-relaxed">
                  <div className="p-3 rounded-lg bg-[#12121A] border border-[#222232]">
                    <span className="font-semibold text-white block mb-1">
                      1. Vision OCR Extraction
                    </span>
                    Gemini reads raw placements (#1 to #{tournament.teamCount}) and individual player elimination counts.
                  </div>

                  <div className="p-3 rounded-lg bg-[#12121A] border border-[#222232]">
                    <span className="font-semibold text-white block mb-1">
                      2. Automatic Slot Mapping
                    </span>
                    The app maps the extracted players against your saved <strong>Slot List</strong> to link placements to official teams.
                  </div>

                  <div className="p-3 rounded-lg bg-[#12121A] border border-[#222232]">
                    <span className="font-semibold text-white block mb-1">
                      3. Live Point Calculation
                    </span>
                    Points are automatically calculated via application code using your preset rules:
                    <span className="block mt-1 font-mono text-[#F58F7C]">
                      Total Points = Placement Points + (Kills × {tournament.scoring?.pointsPerKill ?? 1})
                    </span>
                  </div>
                </div>
              </div>

              {/* Extraction Progress Box */}
              {isExtracting && (
                <div className="rounded-xl bg-[#171722] border border-[#F58F7C]/40 p-6 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#F58F7C] animate-spin shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Vision Analysis</h4>
                      <p className="text-xs text-[#F58F7C] font-mono mt-0.5">
                        {extractionProgressSteps[extractionProgressStep] || extractionProgressSteps[0]}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-[#12121A] h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-[#F58F7C] h-full transition-all duration-700 rounded-full"
                      style={{ width: `${Math.min(95, (extractionProgressStep + 1) * 16)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: REVIEW MATCH RESULTS */}
      {/* ======================================================== */}
      {viewMode === 'review' && (
        <div className="space-y-6">
          {/* Match Summary Top Bar */}
          <div className="rounded-xl bg-[#171722] border border-[#29293E] p-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-[#F58F7C] bg-[#F58F7C]/10 px-2.5 py-1 rounded border border-[#F58F7C]/25 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Match {selectedMatchNumber} Extraction Completed</span>
                </div>
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Review Match {selectedMatchNumber} Results
                </h3>
                <p className="text-sm text-[#9CA3AF] mt-0.5">
                  Verify placements, mapped slots, and kill scores. Click <strong>Edit</strong> on any row to adjust placement or player counts.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={() => setViewMode('upload')}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back to Upload
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleSaveMatch}
                  leftIcon={<Check className="w-4 h-4" />}
                  className="shadow-md shadow-[#F58F7C]/25"
                >
                  Save Match {selectedMatchNumber}
                </Button>
              </div>
            </div>

            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#232332] text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#13131B] border border-[#222232]">
                <div className="text-[#9CA3AF]">Teams Detected</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {draftResults.length} / {tournament.teamCount}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#13131B] border border-[#222232]">
                <div className="text-[#9CA3AF]">Players Detected</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {totalCalculatedPlayers} / {expectedTotalPlayers}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#13131B] border border-[#222232]">
                <div className="text-[#9CA3AF]">Total Match Kills</div>
                <div className="text-base font-bold text-[#F58F7C] mt-0.5">
                  {totalCalculatedKills} Kills
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#13131B] border border-[#222232]">
                <div className="text-[#9CA3AF]">Status</div>
                <div className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                  {validation.missingPlacements.length === 0 && validation.unresolvedSlotsCount === 0 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ready to Save
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Review Required
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Validation Warnings Alert */}
          {(validation.missingPlacements.length > 0 || validation.duplicatePlacements.length > 0) && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm space-y-1.5">
              {validation.missingPlacements.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Placement #{validation.missingPlacements.join(', #')} was not detected in the screenshots.
                  </span>
                </div>
              )}
              {validation.duplicatePlacements.length > 0 && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Duplicate placement #{validation.duplicatePlacements.join(', #')} detected. Please verify or edit ranks.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Results Table */}
          <div className="rounded-xl bg-[#17171F] border border-[#242434] overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-[#232332] bg-[#12121A] text-xs font-mono uppercase text-[#9CA3AF] tracking-wider">
                    <th className="py-3.5 px-6 font-semibold w-24">Rank</th>
                    <th className="py-3.5 px-6 font-semibold">Mapped Slot / Team</th>
                    <th className="py-3.5 px-6 font-semibold">Squad Players & Kills</th>
                    <th className="py-3.5 px-4 font-semibold text-center w-24">Kills</th>
                    <th className="py-3.5 px-4 font-semibold text-center w-24">Plc Pts</th>
                    <th className="py-3.5 px-4 font-semibold text-center w-24">Kill Pts</th>
                    <th className="py-3.5 px-6 font-bold text-right text-white w-28">Total</th>
                    <th className="py-3.5 px-6 font-semibold text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F2C] text-sm">
                  {draftResults.map((row) => {
                    const isWinner = row.placement === 1;

                    return (
                      <tr
                        key={row.placement}
                        className={`transition-colors duration-150 ${
                          isWinner ? 'bg-[#1C1A14] hover:bg-[#221F18]' : 'hover:bg-[#1A1A24]'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-4 px-6 font-mono font-bold">
                          <span
                            className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm ${
                              row.placement === 1
                                ? 'bg-[#F58F7C] text-[#0B0B0F] font-extrabold shadow-sm'
                                : row.placement === 2
                                ? 'bg-zinc-300 text-[#0B0B0F]'
                                : row.placement === 3
                                ? 'bg-amber-700 text-white'
                                : 'bg-[#1F1F2C] text-[#9CA3AF] border border-[#2D2D3E]'
                            }`}
                          >
                            #{row.placement}
                          </span>
                        </td>

                        {/* Mapped Slot / Team */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-white text-base">
                              {row.teamName}
                            </span>
                            {row.slotNumber ? (
                              <span className="text-xs font-mono text-[#F58F7C] bg-[#F58F7C]/10 px-2 py-0.5 rounded border border-[#F58F7C]/20">
                                Slot {row.slotNumber}
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                                Unassigned
                              </span>
                            )}
                          </div>
                          {row.warningMessage && (
                            <span className="text-xs text-amber-400 mt-1 block">
                              {row.warningMessage}
                            </span>
                          )}
                        </td>

                        {/* Players List with Kills */}
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5 max-w-sm">
                            {row.players.map((p, pIdx) => (
                              <span
                                key={pIdx}
                                className={`text-xs font-mono px-2 py-1 rounded border flex items-center gap-1.5 ${
                                  p.needsReview
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                    : 'bg-[#14141C] border-[#252536] text-[#D1D5DB]'
                                }`}
                              >
                                <span className="font-medium text-white">{p.playerName}</span>
                                <span className="text-[#F58F7C] font-bold">
                                  ({p.kills ?? '?'}k)
                                </span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Total Kills */}
                        <td className="py-4 px-4 text-center font-mono font-bold text-white">
                          {row.totalKills}
                        </td>

                        {/* Placement Points */}
                        <td className="py-4 px-4 text-center font-mono text-[#9CA3AF]">
                          {row.placementPoints}
                        </td>

                        {/* Kill Points */}
                        <td className="py-4 px-4 text-center font-mono text-[#9CA3AF]">
                          {row.killPoints}
                        </td>

                        {/* Total Points */}
                        <td className="py-4 px-6 text-right font-mono font-extrabold text-base text-[#F58F7C]">
                          {row.totalPoints}
                        </td>

                        {/* Action */}
                        <td className="py-4 px-6 text-center">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenEditResult(row)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5 text-[#F58F7C]" />}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 3: SAVED MATCH VIEW */}
      {/* ======================================================== */}
      {viewMode === 'saved_ready' && existingSavedMatch && (
        <div className="space-y-6">
          {/* Status Header Banner */}
          <div className="rounded-xl bg-[#14141E] border border-[#232332] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Match {selectedMatchNumber} Complete
                </h3>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 uppercase font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Results Calculated & Saved
                </span>
              </div>
              <p className="text-sm text-[#9CA3AF]">
                ✓ {existingSavedMatch.results.length} Teams • ✓ {existingSavedMatch.totalKills} Total Kills • Saved on{' '}
                {new Date(existingSavedMatch.savedAt).toLocaleDateString()} at{' '}
                {new Date(existingSavedMatch.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteMatchModalOpen(true)}
                leftIcon={<Trash2 className="w-4 h-4 text-red-400" />}
                className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
              >
                Delete Match
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsReExtractConfirmOpen(true)}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Re-extract
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setDraftResults(existingSavedMatch.results);
                  setViewMode('review');
                }}
                leftIcon={<Edit2 className="w-4 h-4" />}
              >
                Edit Results
              </Button>
            </div>
          </div>

          {/* Calculated Match Table */}
          <div className="rounded-xl bg-[#17171F] border border-[#242434] overflow-hidden shadow-xl">
            <div className="p-5 border-b border-[#232332] flex items-center justify-between bg-[#14141C]">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-[#F58F7C]" />
                <h4 className="font-bold text-white text-base">
                  Match {selectedMatchNumber} Official Results
                </h4>
              </div>
              <span className="text-xs font-mono text-[#9CA3AF]">
                Map: {currentMatchSummary.mapName}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[620px]">
                <thead>
                  <tr className="border-b border-[#232332] bg-[#12121A] text-xs font-mono uppercase text-[#9CA3AF]">
                    <th className="py-3 px-6 font-semibold w-20">Rank</th>
                    <th className="py-3 px-6 font-semibold">Team / Slot</th>
                    <th className="py-3 px-4 font-semibold text-center w-28">Kills</th>
                    <th className="py-3 px-4 font-semibold text-center w-28">Placement</th>
                    <th className="py-3 px-6 font-bold text-right text-white w-28">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F1F2C] text-sm">
                  {existingSavedMatch.results.map((row) => (
                    <tr
                      key={row.placement}
                      className={`hover:bg-[#1A1A24] transition-colors ${
                        row.placement === 1 ? 'bg-[#1A1813]' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6 font-mono font-bold">
                        <span
                          className={`w-7 h-7 rounded flex items-center justify-center text-xs ${
                            row.placement === 1
                              ? 'bg-[#F58F7C] text-black font-extrabold'
                              : row.placement === 2
                              ? 'bg-zinc-300 text-black font-bold'
                              : row.placement === 3
                              ? 'bg-amber-700 text-white font-bold'
                              : 'bg-[#1E1E2B] text-[#9CA3AF]'
                          }`}
                        >
                          #{row.placement}
                        </span>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-[15px]">
                            {row.teamName}
                          </span>
                          {row.slotNumber && (
                            <span className="text-[11px] font-mono text-[#9CA3AF] bg-[#1A1A26] px-1.5 py-0.5 rounded border border-[#272738]">
                              Slot #{row.slotNumber}
                            </span>
                          )}
                          {row.placement === 1 && (
                            <span className="text-[10px] font-mono text-[#F58F7C] bg-[#F58F7C]/10 px-1.5 py-0.5 rounded border border-[#F58F7C]/30">
                              BOOYAH'S
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                        {row.totalKills}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-[#9CA3AF]">
                        {row.placementPoints} pts
                      </td>

                      <td className="py-3.5 px-6 text-right font-mono font-extrabold text-base text-[#F58F7C]">
                        {row.totalPoints}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODALS */}
      {/* ======================================================== */}

      {/* Edit Result Modal with Live Auto-Recalculation */}
      {isResultModalOpen && editingResult && (
        <Modal
          isOpen={isResultModalOpen}
          onClose={() => setIsResultModalOpen(false)}
          title={`Edit Result — Placement #${editingResult.placement}`}
          subtitle="Modifying placement or player kills automatically recalculates points."
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="text-xs font-mono text-[#F58F7C]">
                Live Calculation: {editingResult.placementPoints} plc + {editingResult.killPoints} kills ={' '}
                <strong className="text-base font-bold text-white">{editingResult.totalPoints} pts</strong>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setIsResultModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleSaveEditedResult}>
                  Save Changes
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Placement (Rank)"
                type="number"
                min="1"
                max={tournament.teamCount}
                value={editingResult.placement}
                onChange={(e) => handleModalPlacementChange(parseInt(e.target.value, 10) || 1)}
                hint={`Awards ${tournament.scoring?.placementPoints[editingResult.placement] ?? 0} placement pts`}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-[#E5E7EB]">Assigned Slot</label>
                <select
                  value={editingResult.slotNumber || ''}
                  onChange={(e) => handleModalSlotChange(parseInt(e.target.value, 10))}
                  className="w-full bg-[#14141C] text-[#F3F4F6] text-[15px] rounded-lg border border-[#262636] py-2.5 px-3.5 outline-none focus:border-[#F58F7C]"
                >
                  <option value="">Select Slot...</option>
                  {savedSlots.map((s) => (
                    <option key={s.slotNumber} value={s.slotNumber}>
                      Slot #{s.slotNumber}: {s.teamName || `Slot ${s.slotNumber}`}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-[#9CA3AF]">
                  Team: {editingResult.teamName}
                </span>
              </div>
            </div>

            {/* Players and Individual Kills */}
            <div className="space-y-2 pt-2 border-t border-[#232332]">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white">Squad Players & Elimination Counts</span>
                <span className="text-xs font-mono text-[#F58F7C]">
                  Total Kills: {editingResult.totalKills}
                </span>
              </div>

              <div className="space-y-2.5">
                {editingResult.players.map((p, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#14141D] border border-[#242434]">
                    <span className="text-xs font-mono text-[#6B7280] w-6">#{idx + 1}</span>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={p.playerName}
                        onChange={(e) => handleModalPlayerNameChange(idx, e.target.value)}
                        placeholder="Player name"
                        className="w-full bg-[#181824] text-white text-xs font-mono px-3 py-1.5 rounded border border-[#2A2A3C] outline-none focus:border-[#F58F7C]"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        value={p.kills ?? 0}
                        onChange={(e) => handleModalPlayerKillsChange(idx, e.target.value)}
                        placeholder="Kills"
                        className="w-full text-center bg-[#181824] text-[#F58F7C] text-sm font-mono font-bold px-2 py-1.5 rounded border border-[#2A2A3C] outline-none focus:border-[#F58F7C]"
                      />
                    </div>
                    <span className="text-xs font-mono text-[#9CA3AF]">kills</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Image Preview Modal */}
      {previewModalImage && (
        <Modal
          isOpen={!!previewModalImage}
          onClose={() => setPreviewModalImage(null)}
          title={`Screenshot Preview — ${previewModalImage.name}`}
          subtitle={`Size: ${(previewModalImage.size / 1024).toFixed(1)} KB`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleRemoveImage(previewModalImage.id)}
                leftIcon={<Trash2 className="w-4 h-4" />}
              >
                Remove Screenshot
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPreviewModalImage(null)}
              >
                Close Preview
              </Button>
            </div>
          }
        >
          <div className="flex items-center justify-center max-h-[65vh] overflow-hidden rounded-lg bg-black/60 p-2">
            <img
              src={previewModalImage.previewUrl}
              alt="Match Screenshot"
              className="max-h-[60vh] max-w-full object-contain rounded"
            />
          </div>
        </Modal>
      )}

      {/* Re-extract Confirmation Modal */}
      <Modal
        isOpen={isReExtractConfirmOpen}
        onClose={() => setIsReExtractConfirmOpen(false)}
        title={`Re-extract Match ${selectedMatchNumber}?`}
        subtitle="New AI extraction may replace your current saved data for this round."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsReExtractConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleConfirmReExtract}>
              Re-extract
            </Button>
          </>
        }
      >
        <p className="text-sm text-[#D1D5DB] leading-relaxed">
          Proceeding will open the match screenshot uploader for Match {selectedMatchNumber}. You will be able to upload fresh match result screenshots and re-calculate scores.
        </p>
      </Modal>

      {/* Delete Match Confirmation Modal (Requirement 11) */}
      <Modal
        isOpen={isDeleteMatchModalOpen}
        onClose={() => setIsDeleteMatchModalOpen(false)}
        title={`Delete Match ${selectedMatchNumber}?`}
        subtitle={`This will remove Match ${selectedMatchNumber} results from the tournament standings.`}
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setIsDeleteMatchModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                deleteSavedMatch(tournament.id, selectedMatchNumber);
                setIsDeleteMatchModalOpen(false);
                setViewMode('upload');
                setDraftResults([]);
                setImages([]);
              }}
              leftIcon={<Trash2 className="w-4 h-4" />}
            >
              Delete Match
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#D1D5DB] leading-relaxed">
            Are you sure you want to delete results for <strong className="text-white">Match {selectedMatchNumber}</strong>?
          </p>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs font-mono text-red-300">
            • Match {selectedMatchNumber} results and kill points will be removed from overall standings.
            <br />
            • Remaining match numbers will not be changed or renumbered.
          </div>
        </div>
      </Modal>
    </div>
  );
};
