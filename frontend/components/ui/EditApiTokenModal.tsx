'use client';

import { useState } from 'react';
import { ApiToken } from '@/lib/api';
import { arraysEqual } from '@/lib/formUtils';
import { Button } from '@/components/ui/Button';
import { Modal, ModalActions } from '@/components/ui/Modal';

interface EditApiTokenModalProps {
  token: ApiToken;
  onSave: (data: { name: string; scopes: ('read' | 'write')[] }) => Promise<void>;
  onClose: () => void;
}

export function EditApiTokenModal({ token, onSave, onClose }: EditApiTokenModalProps) {
  const [name, setName] = useState(token.name);
  const [scopes, setScopes] = useState<('read' | 'write')[]>([...token.scopes]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hasChanges =
    name.trim() !== token.name.trim() || !arraysEqual(scopes, token.scopes);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Token name is required');
      return;
    }
    if (scopes.length === 0) {
      setError('At least one scope is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSave({ name: name.trim(), scopes });
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to update token');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleScope = (scope: 'read' | 'write') => {
    if (scopes.includes(scope)) {
      setScopes(scopes.filter((s) => s !== scope));
    } else {
      setScopes([...scopes, scope]);
    }
  };

  return (
    <Modal open onClose={onClose} size="md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit API token</h3>
          <p className="text-sm text-[var(--text-muted)]">
            <code className="font-mono break-all">{token.tokenPrefix}…</code>
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 text-[var(--text-muted)] hover:text-[var(--foreground)] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 text-xs text-[var(--text-muted)] sm:grid-cols-2">
        <div>
          <span className="block uppercase tracking-wide">Last used</span>
          <span className="text-sm text-[var(--text-secondary)]">
            {token.lastUsedAt ? new Date(token.lastUsedAt).toLocaleString() : 'Never'}
          </span>
        </div>
        <div>
          <span className="block uppercase tracking-wide">Expires</span>
          <span className="text-sm text-[var(--text-secondary)]">
            {token.expiresAt ? new Date(token.expiresAt).toLocaleString() : 'Never'}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-3">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Token name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            required
            className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Scopes</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={scopes.includes('read')}
                onChange={() => toggleScope('read')}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-[var(--foreground)]">Read</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={scopes.includes('write')}
                onChange={() => toggleScope('write')}
                className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-[var(--foreground)]">Write</span>
            </label>
          </div>
        </div>

        <p className="text-xs text-[var(--text-muted)]">
          The token secret cannot be viewed again after creation.
        </p>

        <ModalActions className="pt-2 border-t border-[var(--border)]">
          <Button type="button" variant="outline" size="md" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" disabled={submitting || !hasChanges}>
            {submitting ? 'Saving...' : 'Save changes'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
