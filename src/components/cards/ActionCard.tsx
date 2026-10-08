import React from 'react';
import { ArrowRight } from 'lucide-react';

export interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  onClick: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  description,
  badge,
  onClick,
}) => (
  <button onClick={onClick} className="tp-action-card group w-full cursor-pointer">
    <div>
      <div className="flex items-start justify-between gap-4">
        <div className="tp-action-card-icon">{icon}</div>
        {badge && <span className="tp-action-card-meta pt-2 text-right">{badge}</span>}
      </div>
      <h3 className="mt-7 text-xl font-extrabold tracking-[-0.02em] text-white group-hover:text-[#F58F7C] transition-colors">
        {title}
      </h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-[#99999E]">{description}</p>
    </div>
    <div className="tp-action-card-arrow group-hover:text-white transition-colors">
      <span>Open section</span>
      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
    </div>
  </button>
);
