import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backTo,
  backLabel = 'Back',
  badge,
  actions,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`mb-8 ${className}`}>
      {backTo && (
        <button
          onClick={() => navigate(backTo)}
          className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#9CA3AF] hover:text-[#F58F7C] transition-colors mb-3 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>{backLabel}</span>
        </button>
      )}

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl lg:text-[36px] font-extrabold text-white tracking-tight font-sans">
              {title}
            </h2>
            {badge && <div>{badge}</div>}
          </div>
          {subtitle && (
            <p className="text-sm md:text-base text-[#9CA3AF] mt-1.5 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
      </div>
    </div>
  );
};
