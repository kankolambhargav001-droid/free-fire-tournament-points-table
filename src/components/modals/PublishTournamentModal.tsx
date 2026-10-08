import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import {
  Globe,
  CheckCircle2,
  Copy,
  ExternalLink,
  AlertCircle,
  Loader2,
  Users,
  Swords,
  Trophy,
  RefreshCw,
  LogOut,
} from 'lucide-react';
import { TournamentConfig, SlotList, SavedMatch, PointsTableDesignConfig, TeamStanding } from '../../types';
import { publishTournamentToCloud } from '../../services/tournamentCloud';
import { useAuth } from '../../context/AuthContext';

export interface PublishTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentConfig;
  slotList: SlotList;
  savedMatches: Record<number, SavedMatch>;
  design: PointsTableDesignConfig;
  standings: TeamStanding[];
  onPublishedSuccess?: (publicId: string, publicUrl: string) => void;
}

export const PublishTournamentModal: React.FC<PublishTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  slotList,
  savedMatches,
  design,
  standings,
  onPublishedSuccess,
}) => {
  const { user: currentUser, signOut: handleSignOut } = useAuth();
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{
    publicId: string;
    publicUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCopied(false);
      if (tournament.isPublished && tournament.publicId) {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        setSuccessInfo({
          publicId: tournament.publicId,
          publicUrl: `${origin}/results/${tournament.publicId}`,
        });
      } else {
        setSuccessInfo(null);
      }
    }
  }, [isOpen, tournament]);

  const handlePublish = async () => {
    if (!currentUser) {
      setError('Please sign in as an authorized organizer before publishing.');
      return;
    }

    try {
      setIsPublishing(true);
      setError(null);

      const result = await publishTournamentToCloud({
        tournament,
        slotList,
        savedMatches,
        design,
        standings,
        existingPublicId: tournament.publicId,
      });

      setSuccessInfo(result);
      if (onPublishedSuccess) {
        onPublishedSuccess(result.publicId, result.publicUrl);
      }
    } catch (err: any) {
      console.error('Publish error:', err);
      setError(err.message || 'Cloud publishing failed. Your local tournament data is safe.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyLink = async () => {
    if (!successInfo?.publicUrl) return;
    try {
      await navigator.clipboard.writeText(successInfo.publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const isAlreadyPublished = Boolean(tournament.isPublished && tournament.publicId);

  // Compute modal titles based on auth and publishing state
  const modalTitle = !currentUser
    ? 'Sign in required'
    : successInfo
    ? 'Your Tournament is Live!'
    : isAlreadyPublished
    ? 'Update Published Results'
    : 'Publish Tournament Results';

  const modalSubtitle = !currentUser
    ? 'Sign in as an authorized organizer to publish tournament results.'
    : successInfo
    ? 'Anyone with this public link can view live read-only standings.'
    : "Anyone with the public link will be able to view this tournament's results.";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      subtitle={modalSubtitle}
    >
      <div className="space-y-4 text-sm">
        {/* Error message */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-2.5 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{error}</p>
              <p className="text-[11px] text-red-400/80 mt-0.5">
                Your local tournament data is safe and intact.
              </p>
            </div>
          </div>
        )}

        {/* Success View */}
        {successInfo ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#121E14] border border-[#23582E] flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
              <div>
                <h4 className="font-bold text-white text-sm">Published Successfully</h4>
                <p className="text-xs text-emerald-400/90 font-mono">
                  Read-only public standings page is now active.
                </p>
              </div>
            </div>

            {/* Public URL Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono uppercase text-[#9CA3AF]">
                Public Results URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successInfo.publicUrl}
                  className="w-full px-3 py-2 rounded-lg bg-[#0E0E16] border border-[#27273C] text-white font-mono text-xs select-all focus:outline-none focus:border-[#F58F7C]"
                />
                <Button
                  variant="primary"
                  onClick={handleCopyLink}
                  className="shrink-0 text-xs py-2 px-3"
                  leftIcon={copied ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
              {copied && (
                <p className="text-[11px] font-mono text-emerald-400">
                  Public results link copied.
                </p>
              )}
            </div>

            {/* Summary preview */}
            <div className="p-3 rounded-xl bg-[#14141E] border border-[#242436] space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Tournament</span>
                <span className="font-bold text-white">{tournament.name}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Teams</span>
                <span className="font-mono text-white">{tournament.teamCount} teams</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Matches</span>
                <span className="font-mono text-white">{tournament.completedMatches} / {tournament.matchCount} completed</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-[#212130]">
              <Button
                variant="secondary"
                onClick={() => {
                  window.open(successInfo.publicUrl, '_blank');
                }}
                className="text-xs"
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Open Results
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="text-xs"
                  leftIcon={isPublishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                >
                  {isPublishing ? 'Updating...' : 'Update Again'}
                </Button>
                <Button variant="ghost" onClick={onClose} className="text-xs">
                  Close
                </Button>
              </div>
            </div>
          </div>
        ) : !currentUser ? (
          /* Unauthenticated State: Sign in required modal matching requirement 9 */
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-[#14141E] border border-[#242436] space-y-2.5">
              <div className="text-xs font-mono uppercase text-[#F58F7C] tracking-wider font-bold">
                Tournament to Publish
              </div>
              <div className="text-base font-bold text-white">{tournament.name}</div>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">
                Publishing creates a secure public link owned by your organizer account.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Sign in as an authorized organizer to publish tournament results.</span>
            </div>

            <div className="pt-2 flex items-center justify-end border-t border-[#212130]">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          /* Authenticated State: Ready to Publish */
          <div className="space-y-4">
            {/* Tournament Summary Card */}
            <div className="p-4 rounded-xl bg-[#14141E] border border-[#242436] space-y-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#212130]">
                <span className="text-xs font-mono uppercase text-[#9CA3AF]">
                  Tournament Overview
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#F58F7C]/10 text-[#F58F7C] border border-[#F58F7C]/20">
                  {tournament.game}
                </span>
              </div>

              <div className="text-base font-bold text-white">{tournament.name}</div>
              {tournament.subtitle && (
                <div className="text-xs text-[#9CA3AF] -mt-1">{tournament.subtitle}</div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-[#0E0E16] border border-[#222232] text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-[#9CA3AF] mb-0.5">
                    <Users className="w-3 h-3" /> Teams
                  </div>
                  <span className="font-mono font-bold text-white">{tournament.teamCount}</span>
                </div>

                <div className="p-2 rounded-lg bg-[#0E0E16] border border-[#222232] text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-[#9CA3AF] mb-0.5">
                    <Swords className="w-3 h-3" /> Matches
                  </div>
                  <span className="font-mono font-bold text-white">
                    {tournament.completedMatches} / {tournament.matchCount}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-[#0E0E16] border border-[#222232] text-center">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-[#9CA3AF] mb-0.5">
                    <Trophy className="w-3 h-3" /> Standings
                  </div>
                  <span className="font-mono font-bold text-white">
                    {standings?.length || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Organizer Auth Status */}
            <div className="p-3.5 rounded-xl bg-[#101018] border border-[#242436] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#9CA3AF] uppercase">
                  Publisher Identity
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Organizer
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-[#1F1F2E] border border-[#303046] flex items-center justify-center text-xs font-bold text-white uppercase">
                    {currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || 'U'}
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-semibold text-white truncate max-w-[200px]">
                      {currentUser.displayName || currentUser.email}
                    </p>
                    <p className="text-[10px] text-[#6B7280] font-mono truncate max-w-[200px]">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[11px] font-mono text-[#9CA3AF] hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3 h-3" /> Switch
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#212130]">
              <Button variant="secondary" onClick={onClose} disabled={isPublishing}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handlePublish}
                disabled={isPublishing || !currentUser}
                className="min-w-[140px] justify-center"
                leftIcon={isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
              >
                {isPublishing
                  ? 'Publishing...'
                  : isAlreadyPublished
                  ? 'Update Published Results'
                  : 'Publish Results'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
