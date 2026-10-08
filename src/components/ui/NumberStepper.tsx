import React from 'react';
import { Plus, Minus } from 'lucide-react';

export interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  hint?: string;
  unit?: string;
  error?: string;
}

export const NumberStepper: React.FC<NumberStepperProps> = ({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
  unit,
  error,
}) => {
  const handleDecrement = () => {
    if (value - step >= min) {
      onChange(value - step);
    }
  };

  const handleIncrement = () => {
    if (value + step <= max) {
      onChange(value + step);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    if (rawVal === '') {
      onChange(min);
      return;
    }
    const num = parseInt(rawVal, 10);
    if (!isNaN(num)) {
      if (num < min) onChange(min);
      else if (num > max) onChange(max);
      else onChange(num);
    }
  };

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-[#E5E7EB] tracking-wide">
          {label}
        </label>
        <span className="text-xs font-mono text-[#6B7280]">
          Range: {min}–{max}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
          className="w-10 h-10 rounded-lg bg-[#14141C] border border-[#262636] hover:border-[#38384E] text-[#D1D5DB] hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Minus className="w-4 h-4" />
        </button>

        <div className="relative flex-1">
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            min={min}
            max={max}
            className={`w-full h-10 text-center font-mono font-bold text-base bg-[#14141C] text-white rounded-lg border transition-all duration-150 outline-none ${
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-[#262636] hover:border-[#333347] focus:border-[#F58F7C] focus:ring-1 focus:ring-[#F58F7C]'
            }`}
          />
          {unit && (
            <span className="absolute right-3 top-2.5 text-xs text-[#6B7280] pointer-events-none hidden sm:inline font-mono">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
          className="w-10 h-10 rounded-lg bg-[#14141C] border border-[#262636] hover:border-[#38384E] text-[#D1D5DB] hover:text-white flex items-center justify-center transition-all duration-150 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {hint && !error && <span className="text-xs text-[#9CA3AF]">{hint}</span>}
      {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
    </div>
  );
};
