import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Upload,
  Image as ImageIcon,
  X,
  FileImage,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Clipboard,
  Shield,
  Users,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Download,
} from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { StatusBadge } from '../components/ui/StatusBadge';
import { SlotListGraphic } from '../components/table/SlotListGraphic';
import { exportSlotListAsPng, sanitizeSlotListFilename } from '../utils/exportSlotList';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { useTournaments } from '../context/TournamentContext';
import { Slot, Player, SlotList } from '../types';

interface UploadedImage {
  id: string;
  file: File;
  name: string;
  size: number;
  previewUrl: string;
  base64Data: string;
  mimeType: string;
}

export const SlotListPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTournament, getSlotList, saveSlotList, resetSlotList } = useTournaments();

  const foundTournament = getTournament(id || '');
  const tournament = foundTournament || {
    id: id || 't-9pm-practice',
    name: '9 PM Practice',
    subtitle: 'Daily Practice Match',
    organizer: 'Vortex Esports Org',
    teamCount: 12,
    playersPerTeam: 4,
    matchCount: 3,
  };

  // Saved slot list from context/storage
  const existingSlotList = getSlotList(tournament.id);

  // View state: 'saved_ready' | 'upload' | 'review'
  const [viewMode, setViewMode] = useState<'saved_ready' | 'upload' | 'review'>(() => {
    return existingSlotList?.isSaved && existingSlotList.slots.length > 0 ? 'saved_ready' : 'upload';
  });

  // Images state
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [previewModalImage, setPreviewModalImage] = useState<UploadedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slotGraphicRef = useRef<HTMLDivElement>(null);
  const [isSlotListExporting, setIsSlotListExporting] = useState(false);

  // Extraction state
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgressStep, setExtractionProgressStep] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reviewing slots state (editable before saving)
  const [draftSlots, setDraftSlots] = useState<Slot[]>(() => {
    return existingSlotList?.slots ? [...existingSlotList.slots] : [];
  });

  // Slot editing modal state
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [isNewSlotModal, setIsNewSlotModal] = useState(false);

  // Re-extract confirmation modal
  const [isReExtractConfirmOpen, setIsReExtractConfirmOpen] = useState(false);

  // Reset slot list confirmation modal
  const [isResetSlotModalOpen, setIsResetSlotModalOpen] = useState(false);

  // Sync viewMode when existingSlotList changes
  useEffect(() => {
    if (existingSlotList?.isSaved && existingSlotList.slots.length > 0 && viewMode === 'upload' && images.length === 0) {
      setViewMode('saved_ready');
      setDraftSlots(existingSlotList.slots);
    }
  }, [existingSlotList]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [images]);

  // Global paste listener (Ctrl+V) for screenshots
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (viewMode !== 'upload') return;
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleFilesSelected([file]);
          }
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
        // strip data:image/...;base64, prefix for Gemini inlineData
        const base64 = result.split(',')[1];
        resolve(base64);
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
          id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          file,
          name: file.name,
          size: file.size,
          previewUrl: URL.createObjectURL(file),
          base64Data,
          mimeType: file.type,
        });
      } catch (err) {
        console.error('Error reading image file:', err);
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

  // Paste screenshot button handler
  const handlePasteButtonClick = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          const imageType = item.types.find((t) => t.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], `screenshot-paste-${Date.now()}.png`, { type: imageType });
            await handleFilesSelected([file]);
            return;
          }
        }
      }
      setErrorMessage('No image found in your clipboard. Take a screenshot, copy it (Ctrl+C), and try again.');
    } catch (err) {
      setErrorMessage('Clipboard access denied or unavailable. Please use "Choose Images" or press Ctrl+V directly on the page.');
    }
  };

  // Dynamic extraction progress steps including retry feedback
  const extractionSteps = [
    'Uploading screenshots to vision engine...',
    'Scanning Free Fire lobby layout & slots...',
    'Extracting verbatim player names & clan tags...',
    'Gemini Vision is busy. Retrying…',
    'Retry 2 of 3…',
    'Trying backup vision model…',
    'Assembling structured tournament slot list...',
  ];

  // Perform Gemini Vision Extraction
  const handleExtractSlots = async () => {
    if (images.length === 0) {
      setErrorMessage('Please upload at least one Free Fire lobby screenshot first.');
      return;
    }

    setIsExtracting(true);
    setErrorMessage(null);
    setExtractionProgressStep(0);

    // Dynamic progress message animation
    const progressInterval = setInterval(() => {
      setExtractionProgressStep((prev) => (prev < extractionSteps.length - 1 ? prev + 1 : prev));
    }, 1500);

    try {
      const payload = {
        images: images.map((img) => ({
          data: img.base64Data,
          mimeType: img.mimeType,
        })),
        teamCount: tournament.teamCount,
        playersPerTeam: tournament.playersPerTeam,
      };

      const response = await fetch('/api/extract-slots', {
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

      // Check for HTTP errors or structured error responses from server
      if (!response.ok || (data?.error && !data?.slots)) {
        const errorObj = data?.error;
        const errorCode = errorObj?.code;
        const serverMsg = typeof errorObj === 'object' ? errorObj?.message : (typeof errorObj === 'string' ? errorObj : '');

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
            serverMsg || 'GEMINI_API_KEY is not configured on the server. Please check the Secrets panel.'
          );
        }
        if (errorCode === 'INVALID_REQUEST') {
          throw new Error(serverMsg || 'At least one screenshot image is required.');
        }
        if (errorCode === 'INVALID_RESPONSE') {
          throw new Error(serverMsg || 'Vision model returned an invalid response format. Please try again.');
        }
        if (serverMsg) {
          throw new Error(serverMsg);
        }
        if (!data) {
          if (response.status === 502 || response.status === 504) {
            throw new Error('Gemini Vision is temporarily unavailable. Please try again.');
          }
          if (response.status >= 500) {
            throw new Error('Gemini Vision is temporarily unavailable. Please try again.');
          }
          throw new Error(`The extraction server returned an error (HTTP ${response.status}). Please try again.`);
        }
        throw new Error('Failed to extract slot list from screenshots. Please try again.');
      }

      if (!data) {
        throw new Error('Vision model returned an invalid response format. Please try again.');
      }

      if (!data.slots || !Array.isArray(data.slots)) {
        throw new Error('Vision model returned an invalid response format. Expected an array of slots.');
      }

      // Convert raw AI slots into application Slot format
      const extractedSlots: Slot[] = data.slots.map((s: any) => {
        const players: Player[] = (s.players || []).map((p: any, idx: number) => ({
          id: `p-${s.slotNumber}-${idx + 1}-${Math.random().toString(36).substr(2, 4)}`,
          name: typeof p === 'string' ? p : p.name || 'Unnamed Player',
          confidence: p.confidence || 'high',
          needsReview: p.confidence === 'low' || p.confidence === 'medium',
        }));

        return {
          slotNumber: Number(s.slotNumber) || 1,
          teamName: s.teamName ? String(s.teamName).trim() : `Slot ${s.slotNumber}`,
          players,
          status: 'confirmed' as const,
        };
      });

      // Merge and sort slots ascending by slotNumber
      const mergedMap = new Map<number, Slot>();
      extractedSlots.forEach((slot) => {
        if (!mergedMap.has(slot.slotNumber)) {
          mergedMap.set(slot.slotNumber, slot);
        } else {
          // Merge players from duplicate slot
          const existing = mergedMap.get(slot.slotNumber)!;
          const existingNames = new Set(existing.players.map((p) => p.name.trim().toLowerCase()));
          const newPlayers = slot.players.filter((p) => !existingNames.has(p.name.trim().toLowerCase()));
          existing.players = [...existing.players, ...newPlayers];
          if (slot.teamName && !existing.teamName) {
            existing.teamName = slot.teamName;
          }
        }
      });

      const sortedSlots = Array.from(mergedMap.values()).sort((a, b) => a.slotNumber - b.slotNumber);

      setDraftSlots(sortedSlots);
      setViewMode('review');
    } catch (err: any) {
      console.error('Gemini extraction error:', err);
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

  // Missing slots analysis
  const missingSlotNumbers: number[] = [];
  const detectedSlotNumbers = new Set(draftSlots.map((s) => s.slotNumber));
  for (let i = 1; i <= tournament.teamCount; i++) {
    if (!detectedSlotNumbers.has(i)) {
      missingSlotNumbers.push(i);
    }
  }

  // Warning checks for a slot
  const getSlotWarnings = (slot: Slot) => {
    const warnings: string[] = [];
    const expected = tournament.playersPerTeam || 4;

    if (slot.players.length < expected) {
      warnings.push(`Contains ${slot.players.length} players (Expected ${expected}). Please verify.`);
    } else if (slot.players.length > expected) {
      warnings.push(`Contains ${slot.players.length} players (Expected ${expected}). Please verify.`);
    }

    // Check duplicate names
    const names = slot.players.map((p) => p.name.trim().toLowerCase());
    const duplicates = names.filter((item, index) => names.indexOf(item) !== index);
    if (duplicates.length > 0) {
      warnings.push(`Duplicate player detected in this slot.`);
    }

    // Check uncertain OCR
    const hasUncertain = slot.players.some((p) => p.needsReview || p.confidence === 'low');
    if (hasUncertain) {
      warnings.push('Contains low-confidence player readings (Needs Review).');
    }

    return warnings;
  };

  // Manual slot creation / editing
  const handleOpenEditSlot = (slot: Slot) => {
    setEditingSlot(JSON.parse(JSON.stringify(slot)));
    setIsNewSlotModal(false);
    setIsSlotModalOpen(true);
  };

  const handleOpenAddSlot = (slotNumber?: number) => {
    const nextSlotNum = slotNumber || (draftSlots.length > 0 ? Math.max(...draftSlots.map((s) => s.slotNumber)) + 1 : 1);
    const newSlot: Slot = {
      slotNumber: nextSlotNum,
      teamName: `Slot ${nextSlotNum}`,
      players: [
        { id: `p-${nextSlotNum}-1`, name: '', confidence: 'high' },
        { id: `p-${nextSlotNum}-2`, name: '', confidence: 'high' },
        { id: `p-${nextSlotNum}-3`, name: '', confidence: 'high' },
        { id: `p-${nextSlotNum}-4`, name: '', confidence: 'high' },
      ],
      status: 'confirmed',
    };
    setEditingSlot(newSlot);
    setIsNewSlotModal(true);
    setIsSlotModalOpen(true);
  };

  const handleSaveEditedSlot = () => {
    if (!editingSlot) return;

    // Filter out completely blank player rows
    const cleanedPlayers = editingSlot.players.filter((p) => p.name.trim().length > 0);
    const updatedSlot = {
      ...editingSlot,
      players: cleanedPlayers.length > 0 ? cleanedPlayers : editingSlot.players,
    };

    setDraftSlots((prev) => {
      const exists = prev.some((s) => s.slotNumber === updatedSlot.slotNumber);
      let updated: Slot[];
      if (exists && !isNewSlotModal) {
        updated = prev.map((s) => (s.slotNumber === updatedSlot.slotNumber ? updatedSlot : s));
      } else {
        updated = [...prev.filter((s) => s.slotNumber !== updatedSlot.slotNumber), updatedSlot];
      }
      return updated.sort((a, b) => a.slotNumber - b.slotNumber);
    });

    setIsSlotModalOpen(false);
    setEditingSlot(null);
  };

  const handleDeleteSlot = (slotNumber: number) => {
    setDraftSlots((prev) => prev.filter((s) => s.slotNumber !== slotNumber));
  };

  // Save Slot List to Context & Storage
  const handleSaveSlotList = () => {
    const newSlotList: SlotList = {
      tournamentId: tournament.id,
      slots: draftSlots.sort((a, b) => a.slotNumber - b.slotNumber),
      sourceImages: images.map((img) => img.name),
      extractedAt: new Date().toISOString(),
      isSaved: true,
    };

    saveSlotList(newSlotList);
    setViewMode('saved_ready');
  };

  // Download the slot list as a clean competitive lineup poster PNG.
  const handleDownloadSlotList = async () => {
    if (draftSlots.length === 0) {
      setErrorMessage('There are no slots to download yet.');
      return;
    }
    if (!slotGraphicRef.current || isSlotListExporting) return;

    try {
      setIsSlotListExporting(true);
      setErrorMessage(null);
      await new Promise((resolve) => setTimeout(resolve, 120));
      await exportSlotListAsPng(
        slotGraphicRef.current,
        sanitizeSlotListFilename(tournament.name)
      );
    } catch (error) {
      console.error('Slot list PNG export error:', error);
      setErrorMessage('Unable to generate the slot list image. Please try again.');
    } finally {
      setIsSlotListExporting(false);
    }
  };

  // Re-extract trigger with confirmation
  const handleConfirmReExtract = () => {
    setIsReExtractConfirmOpen(false);
    setViewMode('upload');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* Top Page Header */}
      <PageHeader
        title="Slot List"
        subtitle="Upload your Free Fire lobby screenshots to automatically extract teams and players."
        backTo={`/tournament/${tournament.id}`}
        backLabel="Back to Workspace"
        actions={
          <div className="flex items-center gap-2">
            {viewMode === 'saved_ready' && (
              <>
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
                  onClick={() => handleOpenAddSlot()}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Add Slot
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Tournament Meta Pill Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 p-4 rounded-xl bg-[#14141E] border border-[#212130]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1E1E2B] text-[#F58F7C] flex items-center justify-center border border-[#2B2B3E]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">Tournament</div>
            <div className="text-sm font-bold text-white truncate max-w-[200px]">
              {tournament.name}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1E1E2B] text-emerald-400 flex items-center justify-center border border-[#2B2B3E]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">Teams Configured</div>
            <div className="text-sm font-bold text-white font-mono">
              {tournament.teamCount} Teams
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#1E1E2B] text-blue-400 flex items-center justify-center border border-[#2B2B3E]">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-[#9CA3AF] uppercase">Squad Size</div>
            <div className="text-sm font-bold text-white font-mono">
              {tournament.playersPerTeam} Players / Team
            </div>
          </div>
        </div>
      </div>

      {/* Inline Error Display */}
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
                onClick={handleExtractSlots}
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
      {/* 1. UPLOAD & EXTRACTION VIEW */}
      {/* ======================================================== */}
      {viewMode === 'upload' && (
        <div className="space-y-6">
          {/* Empty State Banner (Requirement 15) */}
          <div className="p-4 rounded-xl bg-[#14141E] border border-[#242436] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1B1B26] border border-[#2E2E3E] text-[#F58F7C] flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white uppercase tracking-wider block font-mono">
                  NO SLOT LIST
                </span>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  Upload your Free Fire lobby screenshots to create the slot list.
                </p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#1C1C28] text-[#9CA3AF] border border-[#2B2B3E] font-semibold uppercase">
              Not Configured
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
                  Upload Slot List Screenshots
                </h3>
                <p className="text-sm text-[#9CA3AF] max-w-md mt-1.5 leading-relaxed">
                  Upload one or more screenshots showing the complete Free Fire lobby. Multiple images will be automatically stitched and merged by Gemini.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#6B7280]">
                  <span className="px-2.5 py-1 rounded bg-[#1B1B26] border border-[#282838]">
                    PNG, JPG, JPEG, WEBP
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[#1B1B26] border border-[#282838]">
                    Multiple Screenshots Supported
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

              {/* Uploaded Thumbnails Grid */}
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

                  {/* Extract Button Trigger */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={handleExtractSlots}
                      isLoading={isExtracting}
                      disabled={isExtracting}
                      leftIcon={<Sparkles className="w-5 h-5 text-[#0B0B0F]" />}
                      className="w-full shadow-lg shadow-[#F58F7C]/25 font-bold text-base"
                    >
                      Extract Slot List ({images.length} {images.length === 1 ? 'Screenshot' : 'Screenshots'})
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Info / Multi-screenshot Explainer (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl bg-[#17171F] border border-[#242434] p-6 space-y-4">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#232332]">
                  <Sparkles className="w-5 h-5 text-[#F58F7C]" />
                  <h4 className="font-bold text-white text-base">
                    Gemini Vision Extraction Engine
                  </h4>
                </div>

                <div className="space-y-3 text-xs sm:text-[13px] text-[#9CA3AF] leading-relaxed">
                  <div className="p-3 rounded-lg bg-[#12121A] border border-[#222232]">
                    <span className="font-semibold text-white block mb-1">
                      📸 Multi-Screenshot Auto Merge
                    </span>
                    If your Free Fire lobby scrolls across 2 or more screenshots (e.g. Slots 1–10 on image 1, Slots 11–12 on image 2), upload all of them together. The AI automatically merges and sorts them.
                  </div>

                  <div className="p-3 rounded-lg bg-[#12121A] border border-[#222232]">
                    <span className="font-semibold text-white block mb-1">
                      🔤 Exact Name Preservation
                    </span>
                    Special Free Fire symbols, dots, underscores, and spacing (e.g., <code>XE LEVI.07</code>, <code>J A Y 16</code>) are preserved verbatim.
                  </div>

                  <div className="p-3 rounded-lg bg-[#12121A] border border-[#222232]">
                    <span className="font-semibold text-white block mb-1">
                      🔍 Human-in-the-Loop Review
                    </span>
                    Extracted slots are presented for your review and manual editing before saving into the tournament.
                  </div>
                </div>
              </div>

              {/* Extraction Loading Overlay Box */}
              {isExtracting && (
                <div className="rounded-xl bg-[#171722] border border-[#F58F7C]/40 p-6 space-y-3 animate-in fade-in">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-[#F58F7C] animate-spin shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-white">AI Vision Processing</h4>
                      <p className="text-xs text-[#F58F7C] font-mono mt-0.5">
                        {extractionSteps[extractionProgressStep] || extractionSteps[0]}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-[#12121A] h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className="bg-[#F58F7C] h-full transition-all duration-700 rounded-full"
                      style={{ width: `${Math.min(95, (extractionProgressStep + 1) * 22)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. REVIEW EXTRACTED SLOTS VIEW */}
      {/* ======================================================== */}
      {viewMode === 'review' && (
        <div className="space-y-6">
          {/* Review Banner Header */}
          <div className="rounded-xl bg-[#171722] border border-[#29293E] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono uppercase text-[#F58F7C] bg-[#F58F7C]/10 px-2.5 py-1 rounded border border-[#F58F7C]/25 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Extraction Complete • Ready for Verification</span>
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                Review Extracted Slot List
              </h3>
              <p className="text-sm text-[#9CA3AF] mt-1">
                Verify detected slots and player names. Click <strong>Edit</strong> on any slot to fix spelling or add missing teammates.
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
                variant="secondary"
                size="md"
                onClick={handleDownloadSlotList}
                disabled={isSlotListExporting}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download Slot List
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleSaveSlotList}
                leftIcon={<Check className="w-4 h-4" />}
                className="shadow-md shadow-[#F58F7C]/25"
              >
                Save Slot List
              </Button>
            </div>
          </div>

          {/* Missing Slots Alert */}
          {missingSlotNumbers.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>
                  <strong>{missingSlotNumbers.length} slot {missingSlotNumbers.length === 1 ? 'is' : 'are'} missing:</strong>{' '}
                  Slot {missingSlotNumbers.join(', ')} not detected in screenshots.
                </span>
              </div>
              <div className="flex items-center gap-2">
                {missingSlotNumbers.map((slotNum) => (
                  <Button
                    key={slotNum}
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenAddSlot(slotNum)}
                    leftIcon={<Plus className="w-3.5 h-3.5" />}
                    className="border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
                  >
                    Add Slot {slotNum}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Slots Cards List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {draftSlots.map((slot) => {
              const warnings = getSlotWarnings(slot);
              const hasWarnings = warnings.length > 0;

              return (
                <div
                  key={slot.slotNumber}
                  className={`rounded-xl border p-5 flex flex-col justify-between transition-all duration-150 ${
                    hasWarnings
                      ? 'bg-[#18161A] border-amber-500/40 hover:border-amber-500/70'
                      : 'bg-[#17171F] border-[#242434] hover:border-[#38384E]'
                  }`}
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-[#20202F] border border-[#2E2E42] text-[#F58F7C] font-mono font-bold text-sm flex items-center justify-center">
                          #{slot.slotNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-white text-[16px] tracking-tight">
                            {slot.teamName || `Slot ${slot.slotNumber}`}
                          </h4>
                          <span className="text-xs font-mono text-[#9CA3AF]">
                            Slot #{slot.slotNumber}
                          </span>
                        </div>
                      </div>

                      {/* Player count status */}
                      <span
                        className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                          slot.players.length === tournament.playersPerTeam
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {slot.players.length === tournament.playersPerTeam ? '✓' : '⚠'} {slot.players.length} Players
                      </span>
                    </div>

                    {/* Warnings List */}
                    {hasWarnings && (
                      <div className="my-2.5 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 space-y-1">
                        {warnings.map((w, wIdx) => (
                          <div key={wIdx} className="flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Players Roster */}
                    <div className="space-y-1.5 pt-2 border-t border-[#222232]">
                      {slot.players.map((player, pIdx) => (
                        <div
                          key={player.id}
                          className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded bg-[#13131B] border border-[#1E1E2B] text-[#D1D5DB]"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-[11px] font-mono text-[#6B7280]">
                              {pIdx + 1}.
                            </span>
                            <span className="font-medium text-white truncate font-mono">
                              {player.name}
                            </span>
                          </div>

                          {player.needsReview && (
                            <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                              Needs Review
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-[#20202E] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(slot.slotNumber)}
                      className="text-xs text-[#6B7280] hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove Slot</span>
                    </button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenEditSlot(slot)}
                      leftIcon={<Edit2 className="w-3.5 h-3.5 text-[#F58F7C]" />}
                    >
                      Edit Slot
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Save Action Bar */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#14141E] border border-[#232332]">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenAddSlot()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Add Another Slot
            </Button>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setViewMode('upload')}
              >
                Back to Upload
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadSlotList}
                disabled={isSlotListExporting}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveSlotList}
                leftIcon={<Check className="w-4 h-4" />}
                className="shadow-md shadow-[#F58F7C]/20"
              >
                Save Slot List
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. SAVED / READY WORKSPACE VIEW */}
      {/* ======================================================== */}
      {viewMode === 'saved_ready' && (
        <div className="space-y-6">
          {/* Status Header Banner */}
          <div className="rounded-xl bg-[#14141E] border border-[#232332] p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  Slot List Ready
                </h3>
                <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 uppercase font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Complete & Active
                </span>
              </div>
              <p className="text-sm text-[#9CA3AF]">
                {draftSlots.length} / {tournament.teamCount} Slots configured •{' '}
                {draftSlots.reduce((acc, s) => acc + s.players.length, 0)} Total Players registered.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsResetSlotModalOpen(true)}
                leftIcon={<RotateCcw className="w-4 h-4 text-amber-400" />}
                className="text-amber-400 border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50"
              >
                Reset Slot List
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadSlotList}
                disabled={isSlotListExporting}
                leftIcon={<Download className="w-4 h-4" />}
              >
                Download Slot List
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
                variant="outline"
                size="sm"
                onClick={() => {
                  setImages([]);
                  setViewMode('upload');
                }}
                leftIcon={<Upload className="w-4 h-4" />}
              >
                Add More Screenshots
              </Button>
            </div>
          </div>

          {/* Grid of Saved Slots */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {draftSlots.map((slot) => (
              <div
                key={slot.slotNumber}
                className="p-5 rounded-xl bg-[#17171F] border border-[#242434] hover:border-[#38384E] transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-[#20202E] border border-[#2E2E42] text-[#F58F7C] font-mono font-bold text-xs flex items-center justify-center">
                        #{slot.slotNumber}
                      </span>
                      <div>
                        <h4 className="font-bold text-white text-[16px] tracking-tight">
                          {slot.teamName || `Slot ${slot.slotNumber}`}
                        </h4>
                        <span className="text-xs font-mono text-[#9CA3AF]">
                          Slot {slot.slotNumber} of {tournament.teamCount}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {slot.players.length} Players
                    </span>
                  </div>

                  {/* Player Roster */}
                  <div className="mt-3 pt-3 border-t border-[#20202E] space-y-1.5">
                    {slot.players.map((player, pIdx) => (
                      <div
                        key={player.id}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded bg-[#13131B] text-[#D1D5DB]"
                      >
                        <span className="font-medium text-white font-mono">{player.name}</span>
                        <span className="text-[11px] text-[#6B7280] font-mono">
                          {player.role || `P${pIdx + 1}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#20202E] flex items-center justify-between text-xs text-[#9CA3AF]">
                  <span>Slot #{slot.slotNumber}</span>
                  <button
                    onClick={() => handleOpenEditSlot(slot)}
                    className="text-[#F58F7C] hover:underline font-medium cursor-pointer"
                  >
                    Edit Roster
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Off-screen poster used only for PNG export. */}
      <div
        aria-hidden="true"
        className="fixed left-[-20000px] top-0 pointer-events-none"
        style={{ width: 1600 }}
      >
        <SlotListGraphic
          ref={slotGraphicRef}
          tournament={tournament}
          slots={draftSlots}
        />
      </div>

      {/* ======================================================== */}
      {/* 4. MODALS */}
      {/* ======================================================== */}

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
              alt="Lobby Screenshot"
              className="max-h-[60vh] max-w-full object-contain rounded"
            />
          </div>
        </Modal>
      )}

      {/* Edit Slot Modal */}
      {isSlotModalOpen && editingSlot && (
        <Modal
          isOpen={isSlotModalOpen}
          onClose={() => setIsSlotModalOpen(false)}
          title={isNewSlotModal ? 'Add Tournament Slot' : `Edit Slot #${editingSlot.slotNumber}`}
          subtitle="Correct OCR readings or manually adjust player roster."
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsSlotModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveEditedSlot}>
                Save Changes
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Slot Number"
                type="number"
                value={editingSlot.slotNumber}
                onChange={(e) =>
                  setEditingSlot({ ...editingSlot, slotNumber: parseInt(e.target.value, 10) || 1 })
                }
              />
              <Input
                label="Team / Clan Name"
                value={editingSlot.teamName || ''}
                onChange={(e) => setEditingSlot({ ...editingSlot, teamName: e.target.value })}
                placeholder={`Slot ${editingSlot.slotNumber}`}
              />
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Player Roster</label>
                <button
                  type="button"
                  onClick={() => {
                    const newPlayer: Player = {
                      id: `p-${editingSlot.slotNumber}-${Date.now()}`,
                      name: '',
                      confidence: 'high',
                    };
                    setEditingSlot({
                      ...editingSlot,
                      players: [...editingSlot.players, newPlayer],
                    });
                  }}
                  className="text-xs text-[#F58F7C] hover:underline font-mono cursor-pointer"
                >
                  + Add Player Field
                </button>
              </div>

              {editingSlot.players.map((player, pIdx) => (
                <div key={player.id} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#6B7280] w-6">
                    #{pIdx + 1}
                  </span>
                  <div className="flex-1">
                    <Input
                      placeholder={`Player ${pIdx + 1} name`}
                      value={player.name}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setEditingSlot({
                          ...editingSlot,
                          players: editingSlot.players.map((p, idx) =>
                            idx === pIdx ? { ...p, name: newName, needsReview: false } : p
                          ),
                        });
                      }}
                    />
                  </div>
                  {editingSlot.players.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSlot({
                          ...editingSlot,
                          players: editingSlot.players.filter((_, idx) => idx !== pIdx),
                        });
                      }}
                      className="p-2 text-[#9CA3AF] hover:text-red-400 rounded transition-colors"
                      title="Remove player"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Re-extract Confirmation Modal */}
      <Modal
        isOpen={isReExtractConfirmOpen}
        onClose={() => setIsReExtractConfirmOpen(false)}
        title="Re-extract slot list?"
        subtitle="New AI extraction may replace your current extracted data."
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
          Proceeding will open the screenshot uploader so you can upload fresh Free Fire lobby screenshots. Any unsaved edits will be replaced by the new extraction.
        </p>
      </Modal>

      {/* Reset Slot List Modal (Requirement 12) */}
      <Modal
        isOpen={isResetSlotModalOpen}
        onClose={() => setIsResetSlotModalOpen(false)}
        title="Reset Slot List?"
        subtitle="Remove the currently saved slot list and player rosters."
        footer={
          <div className="flex items-center justify-end gap-2.5">
            <Button variant="secondary" onClick={() => setIsResetSlotModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                resetSlotList(tournament.id);
                setDraftSlots([]);
                setImages([]);
                setViewMode('upload');
                setIsResetSlotModalOpen(false);
              }}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Reset Slot List
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-[#D1D5DB] leading-relaxed">
            This will remove the currently saved slot list. Your saved match results will remain unless you explicitly reset tournament data.
          </p>
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-300">
            • All registered team names and player slots will be cleared.
            <br />
            • You can immediately upload replacement lobby screenshots.
          </div>
        </div>
      </Modal>
    </div>
  );
};
