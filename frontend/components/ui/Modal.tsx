'use client';

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'sheet';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  zIndex?: number;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  portal?: boolean;
}

const SIZE_CLASS: Record<ModalSize, string> = {
  sm: 'modal-panel-sm',
  md: 'modal-panel-md',
  lg: 'modal-panel-lg',
  xl: 'modal-panel-xl',
  sheet: 'modal-panel-sheet',
};

export function Modal({
  open,
  onClose,
  children,
  size = 'md',
  labelledBy,
  describedBy,
  className = '',
  zIndex = 50,
  closeOnBackdrop = true,
  closeOnEscape = true,
  portal = false,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !closeOnEscape) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, closeOnEscape, onClose]);

  if (!open) return null;

  const content = (
    <div className="modal-overlay" style={{ zIndex }} role="presentation">
      <button
        type="button"
        className="modal-backdrop"
        aria-label="Close dialog"
        onClick={closeOnBackdrop ? onClose : undefined}
        tabIndex={-1}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className={`modal-panel ${SIZE_CLASS[size]} ${className}`.trim()}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  if (portal && typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }

  return content;
}

interface ModalActionsProps {
  children: ReactNode;
  className?: string;
}

export function ModalActions({ children, className = '' }: ModalActionsProps) {
  return <div className={`modal-actions ${className}`.trim()}>{children}</div>;
}
