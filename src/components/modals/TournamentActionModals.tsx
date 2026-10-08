import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { NumberStepper } from '../ui/NumberStepper';
import {
  AlertTriangle,
  Trash2,
  RotateCcw,
  Copy,
  Edit,
  CheckCircle2,
  Users,
  Swords,
  Layers,
  Palette,
} from 'lucide-react';
import { TournamentConfig } from '../../types';
import { DuplicateTournamentOptions } from '../../utils/tournamentStorage';

// ============================================================================
// 1. EDIT TOURNAMENT MODAL
// ============================================================================

export interface EditTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentConfig;
  onSave: (updates: Partial<TournamentConfig>) => void;
}

export const EditTournamentModal: React.FC<EditTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onSave,
}) => {
  const [name, setName] = useState(tournament.name);
  const [subtitle, setSubtitle] = useState(tournament.subtitle || '');
  const [organizer, setOrganizer] = useState(tournament.organizer || '');
  const [date, setDate] = useState(tournament.date || '');
  const [teamCount, setTeamCount] = useState(tournament.teamCount || 12);
  const [playersPerTeam, setPlayersPerTeam] = useState(tournament.playersPerTeam || 4);
  const [matchCount, setMatchCount] = useState(tournament.matchCount || 3);
  const [scoringPreset, setScoringPreset] = useState(tournament.scoring?.preset || 'Free Fire Standard');

  // Reset local state whenever modal opens with fresh tournament data
  useEffect(() => {
    if (isOpen) {
      setName(tournament.name);
      setSubtitle(tournament.subtitle || '');
      setOrganizer(tournament.organizer || '');
      setDate(tournament.date || '');
      setTeamCount(tournament.teamCount || 12);
      setPlayersPerTeam(tournament.playersPerTeam || 4);
      setMatchCount(tournament.matchCount || 3);
      setScoringPreset(tournament.scoring?.preset || 'Free Fire Standard');
    }
  }, [isOpen, tournament]);

  const hasStructureChanged =
    teamCount !== tournament.teamCount ||
    playersPerTeam !== tournament.playersPerTeam ||
    matchCount !== tournament.matchCount;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      subtitle: subtitle.trim(),
      organizer: organizer.trim(),
      date,
      teamCount,
      playersPerTeam,
      matchCount,
      scoring: {
        ...(tournament.scoring || {}),
        preset: scoringPreset,
        placementPoints: tournament.scoring?.placementPoints || {},
        pointsPerKill: tournament.scoring?.pointsPerKill ?? 1,
      },
      lastUpdated: 'Just now',
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Tournament Details"
      subtitle="Update tournament metadata, teams, matches, and scoring rules."
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>
            Save Changes
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1 font-mono uppercase">
            Tournament Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 9 PM PRACTICE"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1 font-mono uppercase">
              Subtitle
            </label>
            <Input
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              placeholder="e.g. Daily Practice Match"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-zinc-300 block mb-1 font-mono uppercase">
              Organizer
            </label>
            <Input
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="e.g. Vortex Esports"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1 font-mono uppercase">
            Tournament Date
          </label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div className="p-3.5 rounded-xl bg-[#101018] border border-[#242436] space-y-3">
          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block">
            Structure & Teams
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <NumberStepper
                label="Teams Count"
                value={teamCount}
                onChange={setTeamCount}
                min={2}
                max={24}
              />
            </div>

            <div>
              <NumberStepper
                label="Players / Team"
                value={playersPerTeam}
                onChange={setPlayersPerTeam}
                min={1}
                max={6}
              />
            </div>

            <div>
              <NumberStepper
                label="Match Count"
                value={matchCount}
                onChange={setMatchCount}
                min={1}
                max={12}
              />
            </div>
          </div>

          {hasStructureChanged && (
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono flex items-start gap-2 animate-in fade-in duration-150">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
              <span>
                Changing team or match counts may affect existing slot configurations. Existing saved match data will be safely preserved.
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1 font-mono uppercase">
            Scoring Ruleset
          </label>
          <Select
            value={scoringPreset}
            onChange={(e) => setScoringPreset(e.target.value as 'Custom' | 'Free Fire Standard')}
            options={[
              { value: 'Free Fire Standard', label: 'Free Fire Standard (12, 9, 8...)' },
              { value: 'Custom', label: 'Custom Scoring Rules' },
            ]}
          />
        </div>
      </form>
    </Modal>
  );
};

// ============================================================================
// 2. DUPLICATE TOURNAMENT MODAL
// ============================================================================

export interface DuplicateTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentConfig;
  onDuplicate: (options: DuplicateTournamentOptions) => void;
}

export const DuplicateTournamentModal: React.FC<DuplicateTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onDuplicate,
}) => {
  const [name, setName] = useState(`${tournament.name} (Copy)`);
  const [copySlotList, setCopySlotList] = useState(true);
  const [copySavedMatches, setCopySavedMatches] = useState(false);
  const [copyDesign, setCopyDesign] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setName(`${tournament.name} (Copy)`);
      setCopySlotList(true);
      setCopySavedMatches(false);
      setCopyDesign(true);
    }
  }, [isOpen, tournament]);

  const handleConfirm = () => {
    if (!name.trim()) return;
    onDuplicate({
      customName: name.trim(),
      copySlotList,
      copySavedMatches,
      copyDesign,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Duplicate Tournament"
      subtitle="Create a new independent tournament using this tournament's configuration."
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!name.trim()}
            leftIcon={<Copy className="w-4 h-4" />}
          >
            Duplicate Tournament
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1 font-mono uppercase">
            New Tournament Name *
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 9 PM Practice (Copy)"
            required
          />
        </div>

        <div className="p-4 rounded-xl bg-[#101018] border border-[#242436] space-y-3.5">
          <span className="text-xs font-bold text-white font-mono uppercase tracking-wider block">
            Select Data to Copy
          </span>

          {/* Copy Slot List */}
          <label className="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={copySlotList}
              onChange={(e) => setCopySlotList(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[#3A3A52] text-[#F58F7C] focus:ring-0 focus:ring-offset-0 bg-[#161622] cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold text-white group-hover:text-[#F58F7C] transition-colors flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-[#F58F7C]" />
                Copy slot list
              </span>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Copies all teams, player rosters, tags, and verified slot assignments.
              </p>
            </div>
          </label>

          {/* Copy Saved Matches */}
          <label className="flex items-start gap-3 cursor-pointer group border-t border-[#1C1C2C] pt-3">
            <input
              type="checkbox"
              checked={copySavedMatches}
              onChange={(e) => setCopySavedMatches(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[#3A3A52] text-[#F58F7C] focus:ring-0 focus:ring-offset-0 bg-[#161622] cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold text-white group-hover:text-[#F58F7C] transition-colors flex items-center gap-1.5">
                <Swords className="w-3.5 h-3.5 text-[#F58F7C]" />
                Copy saved matches
              </span>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Copies all saved match results and scores into the new tournament.
              </p>
            </div>
          </label>

          {/* Copy Points Table Design */}
          <label className="flex items-start gap-3 cursor-pointer group border-t border-[#1C1C2C] pt-3">
            <input
              type="checkbox"
              checked={copyDesign}
              onChange={(e) => setCopyDesign(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-[#3A3A52] text-[#F58F7C] focus:ring-0 focus:ring-offset-0 bg-[#161622] cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold text-white group-hover:text-[#F58F7C] transition-colors flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#F58F7C]" />
                Copy Points Table design
              </span>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Copies theme colors, typography scale, 9:16 / 16:9 format, and visual presets.
              </p>
            </div>
          </label>
        </div>

        <p className="text-[11px] text-[#6B7280] font-mono">
          The duplicated tournament receives a brand new unique ID. Changes to it will never affect the original tournament.
        </p>
      </div>
    </Modal>
  );
};

// ============================================================================
// 3. DELETE TOURNAMENT MODAL (With "DELETE" confirmation)
// ============================================================================

export interface DeleteTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentConfig;
  onConfirmDelete: () => void;
}

export const DeleteTournamentModal: React.FC<DeleteTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onConfirmDelete,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  const isConfirmed = confirmationInput === 'DELETE';

  const handleDelete = () => {
    if (!isConfirmed) return;
    onConfirmDelete();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Tournament?"
      subtitle="Permanently remove this tournament and all associated records."
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={!isConfirmed}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Delete Tournament
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#D1D5DB]">
          You are about to permanently delete{' '}
          <strong className="text-white font-bold">"{tournament.name}"</strong>.
        </p>

        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>This will permanently delete:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[#E5E7EB]">
            <li>Tournament configuration</li>
            <li>Slot list and player rosters</li>
            <li>Saved match results and scores</li>
            <li>Standings calculations</li>
            <li>Points Table Studio design</li>
          </ul>
          <p className="text-red-400 font-bold pt-1">This action cannot be undone.</p>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1 font-mono uppercase">
            Type <span className="text-red-400 font-bold">DELETE</span> to confirm:
          </label>
          <Input
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder="DELETE"
            className={
              confirmationInput === 'DELETE'
                ? 'border-red-500 focus:border-red-400 font-mono tracking-wider'
                : 'font-mono'
            }
          />
        </div>
      </div>
    </Modal>
  );
};

// ============================================================================
// 4. RESET TOURNAMENT DATA MODAL (With "RESET" confirmation)
// ============================================================================

export interface ResetTournamentModalProps {
  isOpen: boolean;
  onClose: () => void;
  tournament: TournamentConfig;
  onConfirmReset: () => void;
}

export const ResetTournamentModal: React.FC<ResetTournamentModalProps> = ({
  isOpen,
  onClose,
  tournament,
  onConfirmReset,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  const isConfirmed = confirmationInput === 'RESET';

  const handleReset = () => {
    if (!isConfirmed) return;
    onConfirmReset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reset Tournament Data?"
      subtitle="Clear all match scores and slot rosters while keeping tournament settings."
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleReset}
            disabled={!isConfirmed}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reset Data
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-[#D1D5DB]">
          Resetting data for{' '}
          <strong className="text-white font-bold">"{tournament.name}"</strong> will wipe all dynamic match rounds.
        </p>

        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>This will remove:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pl-1 text-[#E5E7EB]">
            <li>Saved Slot List</li>
            <li>All Match Results and kill tallies</li>
            <li>Current Standings</li>
          </ul>
          <p className="text-emerald-400 font-medium pt-1">
            ✓ Your tournament configuration and Points Table design will remain intact.
          </p>
        </div>

        <div>
          <label className="text-xs font-semibold text-zinc-300 block mb-1 font-mono uppercase">
            Type <span className="text-amber-400 font-bold">RESET</span> to confirm:
          </label>
          <Input
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            placeholder="RESET"
            className={
              confirmationInput === 'RESET'
                ? 'border-amber-500 focus:border-amber-400 font-mono tracking-wider'
                : 'font-mono'
            }
          />
        </div>
      </div>
    </Modal>
  );
};
