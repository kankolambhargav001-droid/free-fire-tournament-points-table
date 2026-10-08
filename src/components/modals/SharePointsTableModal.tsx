import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Share2, Copy, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  generatePointsTablePngBlob,
  exportPointsTableAsPng,
  copyPointsTableToClipboard,
  sanitizePointsTableFilename,
  ExportPointsTableOptions,
} from '../../utils/exportPointsTable';

export interface SharePointsTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  graphicElement: HTMLElement | null;
  tournamentName: string;
  format?: '4:5' | '9:16' | '16:9';
  onToast?: (message: string) => void;
}

export const SharePointsTableModal: React.FC<SharePointsTableModalProps> = ({
  isOpen,
  onClose,
  graphicElement,
  tournamentName,
  format = '4:5',
  onToast,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionType, setActionType] = useState<'share' | 'copy' | 'download' | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Feature detection
  const supportsClipboardImage =
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    Boolean(navigator.clipboard?.write);

  const supportsWebShare =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.share);

  const filename = sanitizePointsTableFilename(tournamentName, format);
  const options: ExportPointsTableOptions = { format };

  const handleSharePng = async () => {
    if (!graphicElement) {
      setError("Couldn't generate the points table image. Please try again.");
      return;
    }

    try {
      setIsProcessing(true);
      setActionType('share');
      setError(null);

      const blob = await generatePointsTablePngBlob(graphicElement, options);
      const file = new File([blob], filename, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${tournamentName} - Points Table`,
          text: 'Tournament Points Table',
          files: [file],
        });
        if (onToast) onToast('Points table shared successfully.');
        onClose();
      } else {
        // Fallback to clipboard if share with files unsupported
        if (supportsClipboardImage) {
          await handleCopyImage();
        } else {
          await handleDownload();
        }
      }
    } catch (err: any) {
      // AbortError indicates user cancelled native share sheet — normal behavior!
      if (err.name === 'AbortError') {
        return;
      }
      console.error('Share PNG error:', err);
      setError("Couldn't generate the points table image. Please try again.");
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handleCopyImage = async () => {
    if (!graphicElement) {
      setError("Couldn't generate the points table image. Please try again.");
      return;
    }

    try {
      setIsProcessing(true);
      setActionType('copy');
      setError(null);

      await copyPointsTableToClipboard(graphicElement, options);
      if (onToast) onToast('Points table copied to clipboard.');
      onClose();
    } catch (err: any) {
      console.warn('Copy Image error, falling back to download:', err);
      // If clipboard copy fails, fallback to download
      try {
        await exportPointsTableAsPng(graphicElement, filename, options);
        if (onToast) onToast('PNG downloaded successfully.');
        onClose();
      } catch (dErr: any) {
        setError("Couldn't generate the points table image. Please try again.");
      }
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  const handleDownload = async () => {
    if (!graphicElement) {
      setError("Couldn't generate the points table image. Please try again.");
      return;
    }

    try {
      setIsProcessing(true);
      setActionType('download');
      setError(null);

      await exportPointsTableAsPng(graphicElement, filename, options);
      if (onToast) onToast('PNG downloaded successfully.');
      onClose();
    } catch (err: any) {
      console.error('Download error:', err);
      setError("Couldn't generate the points table image. Please try again.");
    } finally {
      setIsProcessing(false);
      setActionType(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onClose}
      title="Share Points Table"
      subtitle="Share your final tournament standings."
    >
      <div className="space-y-4 text-sm">
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <p className="text-xs text-[#9CA3AF] leading-relaxed">
          Choose how you would like to export or share your tournament points table graphic (
          {format === '4:5' ? '1080 × 1350' : format === '9:16' ? '1080 × 1920' : '1920 × 1080'}
          ).
        </p>

        <div className="space-y-2.5">
          {/* Share PNG (when Web Share is available) */}
          {supportsWebShare && (
            <button
              type="button"
              onClick={handleSharePng}
              disabled={isProcessing}
              className="w-full p-3.5 rounded-xl border border-[#27273C] bg-[#161622] hover:bg-[#1E1E2E] hover:border-[#F58F7C]/50 text-left transition-all cursor-pointer flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[#F58F7C]/15 border border-[#F58F7C]/30 flex items-center justify-center text-[#F58F7C] group-hover:scale-105 transition-transform">
                  {isProcessing && actionType === 'share' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Share2 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {isProcessing && actionType === 'share' ? 'Generating...' : 'Share PNG'}
                  </h4>
                  <p className="text-xs text-[#9CA3AF]">
                    Open native share sheet (WhatsApp, Telegram, Socials)
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Copy Image (when ClipboardItem is supported) */}
          {supportsClipboardImage && (
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isProcessing}
              className="w-full p-3.5 rounded-xl border border-[#27273C] bg-[#161622] hover:bg-[#1E1E2E] hover:border-[#F58F7C]/50 text-left transition-all cursor-pointer flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
                  {isProcessing && actionType === 'copy' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">
                    {isProcessing && actionType === 'copy' ? 'Generating...' : 'Copy Image'}
                  </h4>
                  <p className="text-xs text-[#9CA3AF]">
                    Copy graphic directly to clipboard to paste in Discord, Twitter, etc.
                  </p>
                </div>
              </div>
            </button>
          )}

          {/* Download PNG (reliable fallback on all devices) */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isProcessing}
            className="w-full p-3.5 rounded-xl border border-[#27273C] bg-[#161622] hover:bg-[#1E1E2E] hover:border-[#F58F7C]/50 text-left transition-all cursor-pointer flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 group-hover:scale-105 transition-transform">
                {isProcessing && actionType === 'download' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">
                  {isProcessing && actionType === 'download' ? 'Generating...' : 'Download PNG'}
                </h4>
                <p className="text-xs text-[#9CA3AF]">
                  Save high-resolution image file to your device
                </p>
              </div>
            </div>
          </button>
        </div>

        <div className="pt-2 flex justify-end border-t border-[#212130]">
          <Button variant="ghost" onClick={onClose} disabled={isProcessing} className="text-xs">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};
