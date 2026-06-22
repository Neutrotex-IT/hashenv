'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { projectsAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { CreateProjectButton } from '@/components/ui/CreateProjectButton';
import { ProjectCard } from '@/components/ProjectCard';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { canCreateProject, OrgPermission } from '@/lib/permissions';

interface Project {
  _id: string;
  name: string;
  organizationId?: {
    _id: string;
    name: string;
    slug: string;
    type: 'personal' | 'team';
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  members: Array<{
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    permission: 'read' | 'write';
  }>;
  createdAt: string;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await projectsAPI.list(currentOrg?._id);
      setProjects(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [currentOrg?._id]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    const onPanicExecuted = () => {
      void loadProjects();
    };

    window.addEventListener('hashenv:panic-executed', onPanicExecuted);
    return () => window.removeEventListener('hashenv:panic-executed', onPanicExecuted);
  }, [loadProjects]);

  const orgPermissions = (currentOrg?.permissions ?? []) as OrgPermission[];
  const canCreate = currentOrg
    ? canCreateProject(currentOrg.role, orgPermissions)
    : true;

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="mx-auto max-w-6xl p-6 lg:p-8">
          <PageHeader
            title="Dashboard"
            description={
              currentOrg
                ? `Projects in ${currentOrg.name}`
                : 'Manage your environment files'
            }
            actions={canCreate ? <CreateProjectButton size="lg" /> : undefined}
          />

          <div className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Total projects</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                {projects.length}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Owned by you</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                {projects.filter((p) => p.createdBy._id === user?.id).length}
              </p>
            </div>
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm text-[var(--text-muted)]">Shared with you</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-[var(--foreground)]">
                {
                  projects.filter(
                    (p) =>
                      p.members.some((m) => m.userId._id === user?.id) &&
                      p.createdBy._id !== user?.id
                  ).length
                }
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          )}

          <section aria-labelledby="projects-heading">
            {loading ? (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <Skeleton variant="rectangular" height={28} width={150} />
                  <Skeleton variant="rectangular" height={20} width={100} />
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </>
            ) : projects.length === 0 ? (
              <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] py-12 text-center">
                <h2
                  id="projects-heading"
                  className="text-xl font-semibold text-[var(--foreground)]"
                >
                  No projects yet
                </h2>
                <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
                  {canCreate
                    ? 'Create a project to upload and share environment files across dev, staging, and production.'
                    : 'You do not have permission to create projects in this organization.'}
                </p>
                {canCreate && (
                  <div className="mt-6">
                    <CreateProjectButton size="lg" />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    id="projects-heading"
                    className="text-lg font-semibold text-[var(--foreground)]"
                  >
                    Projects
                  </h2>
                  <span className="text-sm text-[var(--text-muted)]">
                    {projects.length} total
                  </span>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {projects.map((project) => (
                    <ProjectCard
                      key={project._id}
                      project={project}
                      onRefresh={loadProjects}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
