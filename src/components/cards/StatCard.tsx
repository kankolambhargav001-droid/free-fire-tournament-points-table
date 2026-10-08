import React, { useEffect, useState } from 'react';

export interface StatCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  trend?: string;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value, suffix = '', prefix = '', icon, subtitle }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 500;
    let animationFrameId: number;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(ease * value));
      if (progress < 1) animationFrameId = requestAnimationFrame(step);
      else setDisplayValue(value);
    };
    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return (
    <div className="tp-stat-card">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-[#85858A]">{label}</span>
          <div className="mt-3 flex items-baseline gap-1">
            <span className="text-3xl font-black tracking-[-0.04em] text-white">
              {prefix}{displayValue.toLocaleString()}{suffix}
            </span>
          </div>
          {subtitle && <p className="mt-1 text-xs text-[#69696E]">{subtitle}</p>}
        </div>
        {icon && <div className="tp-stat-card-icon shrink-0">{icon}</div>}
      </div>
    </div>
  );
};
