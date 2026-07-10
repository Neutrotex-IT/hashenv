'use client';

import { useState } from 'react';
import { ProjectPermission } from '@/lib/permissions';
import { arraysEqual } from '@/lib/formUtils';
import { Button } from '@/components/ui/Button';
import { ProjectPermissionPicker } from '@/components/ui/PermissionPicker';
import { Modal, ModalActions } from '@/components/ui/Modal';
import { ResourceOption, ResourceScopePicker } from '@/components/ui/ResourceScopePicker';

export interface ProjectMemberSaveData {
  permission: 'read' | 'write';
  permissions: ProjectPermission[];
  resourceAccess: 'full' | 'restricted';
  componentIds: string[];
  accountIds: string[];
}

interface EditProjectMemberModalProps {
  memberName: string;
  memberEmail: string;
  permission: 'read' | 'write';
  capabilities: ProjectPermission[];
  grantablePermissions: ProjectPermission[];
  resourceAccess: 'full' | 'restricted';
  componentIds: string[];
  accountIds: string[];
  grantableComponents: ResourceOption[];
  grantableAccounts: ResourceOption[];
  radioName?: string;
  projectId?: string;
  loading?: boolean;
  onSave: (data: ProjectMemberSaveData) => Promise<void>;
  onClose: () => void;
}

export function EditProjectMemberModal({
  memberName,
  memberEmail,
  permission: initialPermission,
  capabilities: initialCapabilities,
  grantablePermissions,
  resourceAccess: initialResourceAccess,
  componentIds: initialComponentIds,
  accountIds: initialAccountIds,
  grantableComponents,
  grantableAccounts,
  radioName = 'editMemberResourceAccess',
  projectId,
  loading = false,
  onSave,
  onClose,
}: EditProjectMemberModalProps) {
  const [permission, setPermission] = useState<'read' | 'write'>(initialPermission);
  const [capabilities, setCapabilities] = useState<ProjectPermission[]>(initialCapabilities);
  const [resourceAccess, setResourceAccess] = useState<'full' | 'restricted'>(initialResourceAccess);
  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>(initialComponentIds);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(initialAccountIds);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const hasChanges =
    permission !== initialPermission ||
    !arraysEqual(capabilities, initialCapabilities) ||
    resourceAccess !== initialResourceAccess ||
    !arraysEqual(selectedComponentIds, initialComponentIds) ||
    !arraysEqual(selectedAccountIds, initialAccountIds);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (resourceAccess === 'restricted' && selectedComponentIds.length === 0 && selectedAccountIds.length === 0) {
      setError('Select at least one component or account for restricted access');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSave({
        permission,
        permissions: capabilities,
        resourceAccess,
        componentIds: selectedComponentIds,
        accountIds: selectedAccountIds,
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
    <Modal open onClose={onClose} size="md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold text-[var(--foreground)]">Edit member access</h3>
          <p className="text-sm text-[var(--text-muted)] break-all">
            {memberName} · {memberEmail}
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

      {error && (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-3">
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

        <ResourceScopePicker
          grantableComponents={grantableComponents}
          grantableAccounts={grantableAccounts}
          resourceAccess={resourceAccess}
          selectedComponentIds={selectedComponentIds}
          selectedAccountIds={selectedAccountIds}
          onResourceAccessChange={setResourceAccess}
          onComponentIdsChange={setSelectedComponentIds}
          onAccountIdsChange={setSelectedAccountIds}
          radioName={radioName}
          projectId={projectId}
          loading={loading}
        />

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
