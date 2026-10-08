import React, { useState, useRef, useEffect } from 'react';
import {
  Users,
  Swords,
  Clock,
  ChevronRight,
  MoreVertical,
  Edit,
  Copy,
  RotateCcw,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import { Tournament } from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { formatLastUpdated } from '../../utils/tournamentStorage';

export interface TournamentCardProps {
  tournament: Tournament;
  onOpen: (id: string) => void;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onReset?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export const TournamentCard: React.FC<TournamentCardProps> = ({
  tournament,
  onOpen,
  onEdit,
  onDuplicate,
  onReset,
  onDelete,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const hasExtraActions = !!(onEdit || onDuplicate || onReset || onDelete);

  return (
    <div className="group relative rounded-xl bg-[#17171F] border border-[#242434] hover:border-[#3A3A52] transition-all duration-200 p-6 flex flex-col justify-between hover:shadow-lg hover:shadow-black/40">
      {/* Top subtle highlight */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-[#F58F7C]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 pr-2">
            <h4
              onClick={() => onOpen(tournament.id)}
              className="text-lg md:text-xl font-bold text-white tracking-tight group-hover:text-[#F58F7C] transition-colors cursor-pointer"
            >
              {tournament.name}
            </h4>
            <p className="text-sm text-[#9CA3AF] mt-0.5 line-clamp-1">
              {tournament.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusBadge status={tournament.status} size="sm" />

            {hasExtraActions && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((prev) => !prev);
                  }}
                  className="p-1 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#252538] transition-colors cursor-pointer"
                  title="Tournament actions"
                  aria-label="Tournament options menu"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {isMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-48 rounded-xl bg-[#1A1A28] border border-[#2E2E44] shadow-2xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsMenuOpen(false);
                        onOpen(tournament.id);
                      }}
                      className="w-full px-3.5 py-2 text-left text-xs font-medium text-white hover:bg-[#26263A] flex items-center gap-2.5 transition-colors cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#F58F7C]" />
                      <span>Open Tournament</span>
                    </button>

                    {onEdit && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onEdit(tournament.id);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#26263A] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5 text-[#9CA3AF]" />
                        <span>Edit Tournament</span>
                      </button>
                    )}

                    {onDuplicate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onDuplicate(tournament.id);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-zinc-300 hover:text-white hover:bg-[#26263A] flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#9CA3AF]" />
                        <span>Duplicate Tournament</span>
                      </button>
                    )}

                    {onReset && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onReset(tournament.id);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-amber-300 hover:text-amber-200 hover:bg-[#26263A] flex items-center gap-2.5 transition-colors cursor-pointer border-t border-[#252538] mt-1 pt-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reset Data</span>
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsMenuOpen(false);
                          onDelete(tournament.id);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2.5 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        <span>Delete Tournament</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Meta badges */}
        <div className="grid grid-cols-2 gap-2 my-4 pt-3 border-t border-[#212130]">
          <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
            <Users className="w-4 h-4 text-[#F58F7C]" />
            <span>{tournament.teamCount} Teams</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-[#D1D5DB]">
            <Swords className="w-4 h-4 text-[#F58F7C]" />
            <span>
              {tournament.completedMatches} / {tournament.matchCount} Matches
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-[#212130] mt-2">
        <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
          <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
          <span>Updated {formatLastUpdated(tournament.lastUpdated)}</span>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => onOpen(tournament.id)}
          rightIcon={
            <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          }
          className="hover:border-[#F58F7C]/50 hover:text-[#F58F7C]"
        >
          Open Tournament
        </Button>
      </div>
    </div>
  );
};

