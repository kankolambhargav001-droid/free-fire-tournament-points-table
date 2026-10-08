import React from 'react';

export interface ToggleSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  label,
  checked,
  onChange,
  description,
  disabled = false,
  id,
}) => {
  const switchId = id || `toggle-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  return (
    <label
      htmlFor={switchId}
      className={`flex items-center justify-between p-3 rounded-xl border border-[#242436] bg-[#161622] transition-colors cursor-pointer select-none ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#38384E] hover:bg-[#1A1A28]'
      }`}
    >
      <div className="pr-4">
        <span className="text-sm font-semibold text-white block">{label}</span>
        {description && (
          <span className="text-xs text-[#9CA3AF] block mt-0.5">{description}</span>
        )}
      </div>

      <div className="relative inline-flex items-center shrink-0">
        <input
          type="checkbox"
          id={switchId}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        <div
          className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${
            checked ? 'bg-[#F58F7C]' : 'bg-[#282838]'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 ease-in-out transform ${
              checked ? 'translate-x-5.5' : 'translate-x-0.5'
            } mt-0.5 shadow-sm`}
          />
        </div>
      </div>
    </label>
  );
};
