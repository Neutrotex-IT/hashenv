'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { projectsAPI } from '@/lib/api';
import { canWriteProject, canExportProject } from '@/lib/permissions';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ProjectPageHeader } from '@/components/ProjectPageHeader';
import { DataTransferPanel } from '@/components/ui/DataTransferPanel';
import { useAuth } from '@/contexts/AuthContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';
import { useProject, useProjectPermissions, useInvalidateProject } from '@/hooks/queries/useProject';
import { useInvalidateProjects } from '@/hooks/queries/useProjects';
import { useOrganization } from '@/contexts/OrganizationContext';

export default function ProjectSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const projectId = params.id as string;
  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const invalidateProject = useInvalidateProject();
  const invalidateProjects = useInvalidateProjects();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: permissions, isLoading: permissionsLoading } = useProjectPermissions(projectId);

  const [name, setName] = useState('');
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (project?.name) {
      setName(project.name);
    }
  }, [project?.name]);

  const loading = projectLoading || permissionsLoading;
  const canExport = permissions ? canExportProject(permissions.effective) : false;
  const canImport = permissions?.effective.includes('project:write') ?? false;
  const canWrite = permissions ? canWriteProject(permissions.effective) : false;
  const isOwner = project?.createdBy._id === user?.id;

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim() === project?.name) return;
    setSaving(true);
    try {
      const updated = await projectsAPI.update(projectId, { name: name.trim() });
      invalidateProject(projectId);
      invalidateProjects(currentOrg?._id);
      setName(updated.name);
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
      invalidateProjects(currentOrg?._id);
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
      {project && (
        <ProjectPageHeader
          projectId={projectId}
          projectName={project.name}
          title="Project settings"
          description="Rename, export/import, or delete this project."
        />
      )}

      {(canExport || canImport) && (
        <DataTransferPanel
          scope="project"
          projectId={projectId}
          canExport={canExport}
          canImport={canImport}
          resourceName={project?.name || 'project'}
        />
      )}

      {canWrite && (
        <section className="content-section">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">General</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Update the display name for this project.
          </p>
          <form onSubmit={handleRename} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Project name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="border-t border-[var(--border)] pt-4">
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
        </section>
      )}

      {isOwner && (
        <section className="content-section border-t border-[var(--error)]/30">
          <h2 className="text-lg font-semibold text-[var(--error)]">Danger zone</h2>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Deleting this project removes all data permanently. Type the project name to confirm.
          </p>
          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">
                Confirm project name
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder={project?.name}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
            </div>
            <div className="border-t border-[var(--error)]/20 pt-4">
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
          </div>
        </section>
      )}
    </div>
  );
}
