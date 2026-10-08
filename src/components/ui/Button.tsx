import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  isLoading,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 rounded-md gap-1.5 h-8',
    md: 'text-sm px-4 py-2.5 rounded-lg gap-2 h-10',
    lg: 'text-base px-6 py-3 rounded-lg gap-2.5 h-12',
  };

  const variantStyles = {
    primary:
      'bg-[#F58F7C] text-[#0B0B0D] font-extrabold hover:bg-[#E87568] shadow-lg shadow-[#F58F7C]/15 border border-[#F58F7C]/80 hover:-translate-y-0.5',
    secondary:
      'bg-white/[0.055] text-white hover:bg-white/[0.085] border border-white/[0.09] hover:border-white/[0.18]',
    outline:
      'bg-transparent text-[#D7DEEA] hover:text-white border border-white/[0.10] hover:border-[#F58F7C]/50 hover:bg-[#F58F7C]/[0.04]',
    ghost:
      'bg-transparent text-[#8F9BAD] hover:text-white hover:bg-white/[0.045]',
    danger:
      'bg-[#DC2626]/10 text-[#F87171] border border-[#EF4444]/30 hover:bg-[#DC2626]/20',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        leftIcon
      )}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
