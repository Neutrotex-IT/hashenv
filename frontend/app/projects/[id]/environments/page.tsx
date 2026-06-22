'use client';

import { useParams } from 'next/navigation';
import { ManageEnvironmentsPanel } from '@/components/ui/ManageEnvironmentsPanel';
import { ProjectPageHeader } from '@/components/ProjectPageHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { canWriteProject } from '@/lib/permissions';
import { useProject, useProjectPermissions } from '@/hooks/queries/useProject';
import {
  useProjectEnvironments,
  useInvalidateProjectEnvironments,
} from '@/hooks/queries/useProjectEnvironments';

export default function ProjectEnvironmentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const invalidateEnvironments = useInvalidateProjectEnvironments();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: permissions, isLoading: permissionsLoading } = useProjectPermissions(projectId);
  const {
    data: environments = [],
    isLoading: envLoading,
    error: queryError,
  } = useProjectEnvironments(projectId);

  const loading = projectLoading || permissionsLoading || envLoading;
  const canWrite = permissions ? canWriteProject(permissions.effective) : false;
  const error = queryError
    ? (queryError as { response?: { data?: { error?: string } } }).response?.data?.error ||
      'Failed to load environments'
    : '';

  return (
    <div className="w-full">
      {project && (
        <ProjectPageHeader
          projectId={projectId}
          projectName={project.name}
          title="Environments"
          description="Add custom environment names beyond dev, staging, and prod."
        />
      )}

      {loading ? (
        <SkeletonCard />
      ) : error ? (
        <div className="rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      ) : (
        <ManageEnvironmentsPanel
          projectId={projectId}
          environments={environments}
          canWrite={canWrite}
          onChanged={() => invalidateEnvironments(projectId)}
        />
      )}
    </div>
  );
}
