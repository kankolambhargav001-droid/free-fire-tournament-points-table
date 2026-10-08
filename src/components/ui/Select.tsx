import React from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, hint, error, options, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-sm font-medium text-[#E5E7EB] tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            id={selectId}
            ref={ref}
            className={`w-full appearance-none bg-[#14141C] text-[#F3F4F6] text-[15px] rounded-lg border transition-all duration-150 py-2.5 pl-3.5 pr-10 ${
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-[#262636] hover:border-[#333347] focus:border-[#F58F7C] focus:ring-1 focus:ring-[#F58F7C]'
            } outline-none cursor-pointer disabled:opacity-50 ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#14141C] text-white">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 text-[#6B7280] pointer-events-none flex items-center justify-center">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {hint && !error && <span className="text-xs text-[#9CA3AF]">{hint}</span>}
        {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
      </div>
    );
  }
);

Select.displayName = 'Select';
