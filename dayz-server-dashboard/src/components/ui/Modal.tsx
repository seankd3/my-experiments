import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: ModalSize;
  children: React.ReactNode;
  footer?: React.ReactNode;
  closeOnOverlay?: boolean;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-5xl',
};

export default function Modal({
  isOpen,
  onClose,
  title,
  size = 'md',
  children,
  footer,
  closeOnOverlay = true,
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={closeOnOverlay ? onClose : undefined}
      />
      <div
        className={`
          relative w-full ${sizeClasses[size]} mx-4
          bg-surface-800 border border-surface-700/50 rounded-lg shadow-2xl
          animate-slide-up
        `}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-700/50">
            <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-surface-700 text-gray-400 hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-surface-700/50 flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
