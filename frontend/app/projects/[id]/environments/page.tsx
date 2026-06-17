'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { environmentsAPI, projectsAPI, ProjectEnvironment } from '@/lib/api';
import { ManageEnvironmentsPanel } from '@/components/ui/ManageEnvironmentsPanel';
import { ProjectPageHeader } from '@/components/ProjectPageHeader';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useAuth } from '@/contexts/AuthContext';

export default function ProjectEnvironmentsPage() {
  const params = useParams();
  const { user } = useAuth();
  const projectId = params.id as string;

  const [project, setProject] = useState<{ name: string; createdBy: { _id: string }; members: Array<{ userId: { _id: string }; permission: string }> } | null>(null);
  const [environments, setEnvironments] = useState<ProjectEnvironment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const [projectData, envData] = await Promise.all([
        projectsAPI.get(projectId),
        environmentsAPI.list(projectId),
      ]);
      setProject(projectData);
      setEnvironments(envData);
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

  const isOwner = project?.createdBy._id === user?.id;
  const userPermission = project?.members.find((m) => m.userId._id === user?.id)?.permission;
  const canWrite = isOwner || userPermission === 'write';

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
          canWrite={Boolean(canWrite)}
          onChanged={load}
        />
      )}
    </div>
  );
}
