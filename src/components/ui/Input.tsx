import React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-[#E5E7EB] tracking-wide">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3.5 text-[#6B7280] pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={`w-full bg-[#14141C] text-[#F3F4F6] placeholder-[#525266] text-[15px] rounded-lg border transition-all duration-150 py-2.5 ${
              leftIcon ? 'pl-10' : 'pl-3.5'
            } ${rightIcon ? 'pr-10' : 'pr-3.5'} ${
              error
                ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                : 'border-[#262636] hover:border-[#333347] focus:border-[#F58F7C] focus:ring-1 focus:ring-[#F58F7C]'
            } outline-none disabled:opacity-50 disabled:bg-[#0E0E14] ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 text-[#6B7280] flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {hint && !error && <span className="text-xs text-[#9CA3AF]">{hint}</span>}
        {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
