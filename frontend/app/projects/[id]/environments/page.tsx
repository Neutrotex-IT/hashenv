'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { environmentsAPI, projectsAPI, ProjectEnvironment } from '@/lib/api';
import { ManageEnvironmentsPanel } from '@/components/ui/ManageEnvironmentsPanel';
import { ProjectPageHeader } from '@/components/ProjectPageHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { canWriteProject } from '@/lib/permissions';

export default function ProjectEnvironmentsPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [project, setProject] = useState<{ name: string } | null>(null);
  const [environments, setEnvironments] = useState<ProjectEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [canWrite, setCanWrite] = useState(false);

  const load = async () => {
    try {
      const [projectData, envData, permissions] = await Promise.all([
        projectsAPI.get(projectId),
        environmentsAPI.list(projectId),
        projectsAPI.getPermissions(projectId),
      ]);
      setProject(projectData);
      setEnvironments(envData);
      setCanWrite(canWriteProject(permissions.effective));
      setError('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to load environments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  return (
    <div className="max-w-3xl">
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
        <div className="rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
          <p className="text-sm text-[var(--error)]">{error}</p>
        </div>
      ) : (
        <ManageEnvironmentsPanel
          projectId={projectId}
          environments={environments}
          canWrite={canWrite}
          onChanged={load}
        />
      )}
    </div>
  );
}
