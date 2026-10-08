import React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string;
  stepNumber: string;
  label: string;
  status: 'active' | 'inactive' | 'completed';
}

export interface ProgressIndicatorProps {
  currentStep?: number;
  className?: string;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep = 1,
  className = '',
}) => {
  const steps: StepItem[] = [
    { id: 'step-1', stepNumber: '01', label: 'Tournament Setup', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'inactive' },
    { id: 'step-2', stepNumber: '02', label: 'Slot List', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'inactive' },
    { id: 'step-3', stepNumber: '03', label: 'Matches', status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'inactive' },
    { id: 'step-4', stepNumber: '04', label: 'Standings', status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'inactive' },
  ];

  return (
    <div className={`w-full overflow-x-auto py-2 ${className}`}>
      <div className="flex items-center justify-between min-w-[540px] max-w-2xl mx-auto px-2">
        {steps.map((step, idx) => {
          const isActive = step.status === 'active';
          const isCompleted = step.status === 'completed';

          return (
            <React.Fragment key={step.id}>
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono text-xs font-bold transition-all duration-200 ${
                    isActive
                      ? 'bg-[#F58F7C] text-[#0B0B0F] shadow-sm shadow-[#F58F7C]/30 ring-2 ring-[#F58F7C]/20'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-[#181824] text-[#6B7280] border border-[#262638]'
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : step.stepNumber}
                </div>
                <span
                  className={`text-xs sm:text-sm font-medium tracking-tight whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-white font-bold'
                      : isCompleted
                      ? 'text-[#9CA3AF]'
                      : 'text-[#6B7280]'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={`flex-1 h-[1px] mx-3 transition-colors ${
                    isCompleted ? 'bg-emerald-500/40' : 'bg-[#232332]'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
