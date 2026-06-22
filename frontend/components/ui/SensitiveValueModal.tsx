'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';

export interface SensitiveField {
  label: string;
  value: string;
  sensitive?: boolean;
  multiline?: boolean;
}

interface SensitiveValueModalProps {
  title: string;
  fields: SensitiveField[];
  loading?: boolean;
  error?: string;
  onClose: () => void;
}

function SensitiveFieldRow({ label, value, sensitive = true, multiline = false }: SensitiveField) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const isSensitive = sensitive && value.length > 0;
  const displayValue =
    isSensitive && !revealed
      ? multiline
        ? null
        : '•'.repeat(Math.min(value.length, 24))
      : value;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard may be unavailable
    }
  };

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] p-3">
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        <div className="flex items-center gap-2">
          {isSensitive && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              {revealed ? 'Hide' : 'Reveal'}
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--foreground)]"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
      {multiline ? (
        <pre
          className={`text-sm font-mono whitespace-pre-wrap break-all ${
            isSensitive && !revealed ? 'text-[var(--text-muted)] italic' : 'text-[var(--foreground)]'
          }`}
        >
          {displayValue ?? '(hidden — click Reveal to view)'}
        </pre>
      ) : (
        <p
          className={`text-sm break-all ${
            isSensitive && !revealed
              ? 'font-mono tracking-widest text-[var(--text-muted)]'
              : 'text-[var(--foreground)] font-mono'
          }`}
        >
          {displayValue || <span className="text-[var(--text-muted)] italic">(empty)</span>}
        </p>
      )}
    </div>
  );
}

export function SensitiveValueModal({
  title,
  fields,
  loading = false,
  error,
  onClose,
}: SensitiveValueModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const isWide = fields.some((field) => field.multiline);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={`relative w-full card p-6 shadow-xl ${
          isWide ? 'max-w-3xl' : 'max-w-lg'
        }`}
      >
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-[var(--text-muted)]">Loading…</div>
        )}

        {error && (
          <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-3">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {fields.map((field) => (
              <SensitiveFieldRow key={field.label} {...field} />
            ))}
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
