'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';

interface Project {
  _id: string;
  name: string;
  createdBy: { _id: string };
}

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const projectId = params.id as string;
  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [name, setName] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isOwner = project?.createdBy._id === user?.id;

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const loadProject = async () => {
    try {
      const data = await projectsAPI.get(projectId);
      setProject(data);
      setName(data.name);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string }; status?: number } };
      toastError(axiosErr.response?.data?.error || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === project?.name) return;
    setSaving(true);
    try {
      const updated = await projectsAPI.update(projectId, { name: name.trim() });
      setProject((prev) => (prev ? { ...prev, name: updated.name } : prev));
      toastSuccess('Project renamed successfully');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to rename project');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project || deleteConfirmName !== project.name) return;
    const ok = await confirm({
      title: 'Delete project permanently?',
      message: 'All environment files, secrets, accounts, tokens, and encryption keys will be deleted. This cannot be undone.',
      confirmLabel: 'Delete project',
      variant: 'danger',
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await projectsAPI.delete(projectId);
      toastSuccess('Project deleted');
      router.push('/dashboard');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-3xl font-bold text-[var(--foreground)] mb-2">Project settings</h1>
          <p className="text-sm text-[var(--text-muted)] mb-6">Rename or delete this project.</p>

          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 mb-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">General</h2>
            <form onSubmit={handleRename} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Project name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  maxLength={100}
                  className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)]"
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  disabled={saving || !name.trim() || name.trim() === project?.name}
                >
                  {saving ? 'Saving...' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>

          {isOwner && (
            <div className="rounded-lg border border-[var(--error)]/40 bg-[var(--error)]/5 p-6">
              <h2 className="text-lg font-semibold text-[var(--error)] mb-2">Danger zone</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-4">
                Deleting this project removes all data permanently. Type the project name to confirm.
              </p>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={project?.name}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm mb-4"
              />
              <Button
                variant="outline"
                size="md"
                onClick={handleDelete}
                disabled={deleting || deleteConfirmName !== project?.name}
                className="border-[var(--error)] text-[var(--error)] hover:bg-[var(--error)]/10"
              >
                {deleting ? 'Deleting...' : 'Delete project'}
              </Button>
            </div>
          )}
    </div>
  );
}
