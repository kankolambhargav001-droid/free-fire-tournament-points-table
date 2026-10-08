import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Never render a backdrop when the modal is closed.
  // Portaling to <body> also prevents parent stacking contexts, transforms,
  // filters, or isolation rules from placing the dialog underneath its backdrop.
  if (!isOpen || typeof document === 'undefined') return null;

  const maxWidthStyles = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        style={{ zIndex: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidthStyles[maxWidth]} bg-[#15151E] border border-[#2A2A3C] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150`}
        style={{ zIndex: 1 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tp-modal-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-[#232332]">
          <div>
            <h3
              id="tp-modal-title"
              className="text-xl font-bold text-white tracking-tight"
            >
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-[#9CA3AF] mt-1">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#9CA3AF] hover:text-white rounded-lg hover:bg-[#20202E] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 bg-[#111119] border-t border-[#232332]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
