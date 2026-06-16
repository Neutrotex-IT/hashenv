'use client';

import { useEffect, useState } from 'react';
import { OrgMember } from '@/lib/api';
import { OrgPermission } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { OrgPermissionPicker } from '@/components/ui/PermissionPicker';

interface EditOrgMemberModalProps {
  member: OrgMember;
  grantablePermissions: OrgPermission[];
  canAssignAdmin: boolean;
  onSave: (data: { role: 'member' | 'admin'; permissions?: OrgPermission[] }) => Promise<void>;
  onClose: () => void;
}

export function EditOrgMemberModal({
  member,
  grantablePermissions,
  canAssignAdmin,
  onSave,
  onClose,
}: EditOrgMemberModalProps) {
  const [role, setRole] = useState<'member' | 'admin'>(member.role === 'admin' ? 'admin' : 'member');
  const [permissions, setPermissions] = useState<OrgPermission[]>(
    (member.permissions ?? []) as OrgPermission[]
  );
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
      await onSave({
        role,
        permissions: role === 'member' ? permissions : undefined,
      });
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
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit member</h3>
            <p className="text-sm text-[var(--text-muted)]">{member.user.name} · {member.user.email}</p>
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
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Organization role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
              className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
            >
              <option value="member">Member</option>
              {canAssignAdmin && <option value="admin">Admin</option>}
            </select>
          </div>

          {role === 'member' && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Additional permissions
              </label>
              <OrgPermissionPicker
                grantable={grantablePermissions}
                selected={permissions}
                onChange={setPermissions}
              />
            </div>
          )}

          {role === 'admin' && (
            <p className="text-xs text-[var(--text-muted)]">
              Admins receive all organization permissions automatically.
            </p>
          )}

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
