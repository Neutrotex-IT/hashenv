'use client';

import { useCallback, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onDismiss: () => void;
  duration?: number;
}

const EXIT_MS = 160;

const styles: Record<ToastType, string> = {
  success: 'border-green-500/30 bg-green-500/10 text-green-400',
  error: 'border-[var(--error)]/50 bg-[var(--error)]/10 text-[var(--error)]',
  info: 'border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]',
};

export function Toast({ message, type, onDismiss, duration = 4000 }: ToastProps) {
  const [exiting, setExiting] = useState(false);

  const dismiss = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    window.setTimeout(onDismiss, EXIT_MS);
  }, [exiting, onDismiss]);

  useEffect(() => {
    const timer = window.setTimeout(dismiss, duration);
    return () => window.clearTimeout(timer);
  }, [dismiss, duration]);

  return (
    <div
      className={`toast-item pointer-events-auto flex min-w-[280px] max-w-sm items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 ${styles[type]} ${exiting ? 'is-exiting' : ''}`}
      role="status"
    >
      <p className="flex-1 text-sm">{message}</p>
      <button
        onClick={dismiss}
        className="motion-press shrink-0 opacity-70 hover:opacity-100 motion-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
