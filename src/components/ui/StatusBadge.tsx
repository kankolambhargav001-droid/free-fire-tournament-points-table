import React from 'react';
import { TournamentStatus } from '../../types';

export interface StatusBadgeProps {
  status: TournamentStatus | 'confirmed' | 'reserved' | 'empty' | 'pending';
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  className = '',
  size = 'md',
}) => {
  const configs: Record<
    string,
    { label: string; bg: string; text: string; dot: string; border: string }
  > = {
    in_progress: {
      label: 'In Progress',
      bg: 'bg-[#F58F7C]/10',
      text: 'text-[#F58F7C]',
      dot: 'bg-[#F58F7C]',
      border: 'border-[#F58F7C]/30',
    },
    completed: {
      label: 'Completed',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      border: 'border-emerald-500/30',
    },
    upcoming: {
      label: 'Upcoming',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      dot: 'bg-blue-400',
      border: 'border-blue-500/30',
    },
    draft: {
      label: 'Draft',
      bg: 'bg-gray-500/10',
      text: 'text-gray-400',
      dot: 'bg-gray-400',
      border: 'border-gray-500/30',
    },
    confirmed: {
      label: 'Confirmed',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      dot: 'bg-emerald-400',
      border: 'border-emerald-500/30',
    },
    reserved: {
      label: 'Reserved',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      dot: 'bg-amber-400',
      border: 'border-amber-500/30',
    },
    empty: {
      label: 'Empty Slot',
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      dot: 'bg-zinc-400',
      border: 'border-zinc-500/30',
    },
    pending: {
      label: 'Pending',
      bg: 'bg-zinc-500/10',
      text: 'text-zinc-400',
      dot: 'bg-zinc-400',
      border: 'border-zinc-500/30',
    },
  };

  const config = configs[status] || configs.draft;
  const sizeClasses =
    size === 'sm' ? 'text-xs px-2 py-0.5 gap-1.5' : 'text-xs px-2.5 py-1 gap-2';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border tracking-wide uppercase font-mono ${config.bg} ${config.text} ${config.border} ${sizeClasses} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      <span>{config.label}</span>
    </span>
  );
};
