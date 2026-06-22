'use client';

import { useState } from 'react';
import { environmentsAPI, ProjectEnvironment } from '@/lib/api';
import { formatEnvLabel } from '@/lib/environments';
import { Button } from './Button';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';

interface ManageEnvironmentsPanelProps {
  projectId: string;
  environments: ProjectEnvironment[];
  canWrite: boolean;
  onChanged: () => void;
}

export function ManageEnvironmentsPanel({
  projectId,
  environments,
  canWrite,
  onChanged,
}: ManageEnvironmentsPanelProps) {
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      await environmentsAPI.create(projectId, newName.trim());
      setNewName('');
      toastSuccess('Environment added');
      onChanged();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to add environment');
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async (slug: string) => {
    if (!editName.trim() || editName.trim() === slug) {
      setEditingSlug(null);
      return;
    }
    setSaving(true);
    try {
      await environmentsAPI.rename(projectId, slug, editName.trim());
      toastSuccess('Environment renamed');
      setEditingSlug(null);
      onChanged();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to rename environment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (env: ProjectEnvironment) => {
    if (env.hasFiles) {
      const ok = await confirm({
        title: `Delete "${env.slug}" and all versions?`,
        message: `This environment has ${env.versionCount} version(s). All encrypted files will be permanently deleted.`,
        confirmLabel: 'Delete all',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await environmentsAPI.delete(projectId, env.slug, true);
        toastSuccess('Environment and all versions deleted');
        onChanged();
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        toastError(axiosErr.response?.data?.error || 'Failed to delete environment');
      }
    } else {
      const ok = await confirm({
        title: `Remove "${env.slug}"?`,
        message: 'This environment has no uploaded files.',
        confirmLabel: 'Remove',
        variant: 'danger',
      });
      if (!ok) return;
      try {
        await environmentsAPI.delete(projectId, env.slug);
        toastSuccess('Environment removed');
        onChanged();
      } catch (err: unknown) {
        const axiosErr = err as { response?: { data?: { error?: string } } };
        toastError(axiosErr.response?.data?.error || 'Failed to remove environment');
      }
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-3">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      )}

      <div className="data-table-wrap">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-[var(--surface-elevated)]">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Slug</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Versions</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-[var(--text-muted)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {environments.map((env) => (
              <tr key={env.slug}>
                <td className="px-4 py-3">
                  {editingSlug === env.slug ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm font-mono"
                      autoFocus
                    />
                  ) : (
                    <div>
                      <span className="font-mono text-sm text-[var(--foreground)]">{env.slug}</span>
                      <span className="ml-2 text-xs text-[var(--text-muted)]">{formatEnvLabel(env.slug)}</span>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                  {env.hasFiles ? `v${env.latestVersion} (${env.versionCount} total)` : 'No files'}
                </td>
                <td className="px-4 py-3 text-right">
                  {canWrite && (
                    <div className="flex justify-end gap-2">
                      {editingSlug === env.slug ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleRename(env.slug)}
                            disabled={saving || !editName.trim() || editName.trim() === env.slug}
                            className="text-sm text-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 disabled:text-[var(--text-muted)]"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSlug(null)}
                            className="text-sm text-[var(--text-muted)]"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingSlug(env.slug);
                              setEditName(env.slug);
                            }}
                            className="text-sm text-[var(--accent)]"
                          >
                            Rename
                          </button>
                          {environments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDelete(env)}
                              className="text-sm text-[var(--error)]"
                            >
                              Delete
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canWrite && (
        <form onSubmit={handleAdd} className="content-section">
          <h3 className="text-sm font-medium text-[var(--foreground)] mb-2">Add environment</h3>
          <p className="text-xs text-[var(--text-muted)] mb-3">
            Lowercase slug, 2-32 characters (e.g. qa, preview, uat).
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value.toLowerCase())}
              placeholder="qa"
              pattern="[a-z][a-z0-9-]{1,31}"
              className="flex-1 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm font-mono"
            />
            <Button variant="primary" size="md" type="submit" disabled={adding || !newName.trim()}>
              {adding ? 'Adding...' : 'Add'}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
