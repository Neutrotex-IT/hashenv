'use client';

import { useEffect, useState } from 'react';
import { ProjectPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { ProjectPermissionPicker } from '@/components/ui/PermissionPicker';

interface EditProjectMemberModalProps {
  memberName: string;
  memberEmail: string;
  permission: 'read' | 'write';
  capabilities: ProjectPermission[];
  grantablePermissions: ProjectPermission[];
  onSave: (data: { permission: 'read' | 'write'; permissions: ProjectPermission[] }) => Promise<void>;
  onClose: () => void;
}

export function EditProjectMemberModal({
  memberName,
  memberEmail,
  permission: initialPermission,
  capabilities: initialCapabilities,
  grantablePermissions,
  onSave,
  onClose,
}: EditProjectMemberModalProps) {
  const [permission, setPermission] = useState<'read' | 'write'>(initialPermission);
  const [capabilities, setCapabilities] = useState<ProjectPermission[]>(initialCapabilities);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await onSave({ permission, permissions: capabilities });
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to update member');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit member access</h3>
            <p className="text-sm text-[var(--text-muted)]">{memberName} · {memberEmail}</p>
          </div>
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

        {error && (
          <div className="mb-4 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-3">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Access level</label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value as 'read' | 'write')}
              className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="read">Read Only</option>
              <option value="write">Read/Write</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Additional capabilities
            </label>
            <ProjectPermissionPicker
              grantable={grantablePermissions}
              selected={capabilities}
              onChange={setCapabilities}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border)]">
            <Button type="button" variant="outline" size="md" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
