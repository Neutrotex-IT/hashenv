'use client';

import { Button } from '@/components/ui/Button';
import { Modal, ModalActions } from '@/components/ui/Modal';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      labelledBy="confirm-title"
      describedBy="confirm-message"
      zIndex={90}
    >
      <h3 id="confirm-title" className="text-lg font-semibold text-[var(--foreground)] mb-2">
        {title}
      </h3>
      <p id="confirm-message" className="text-sm text-[var(--text-secondary)] whitespace-pre-line mb-6">
        {message}
      </p>
      <ModalActions>
        <Button type="button" variant="outline" size="md" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button
          type="button"
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="md"
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </ModalActions>
    </Modal>
  );
}
