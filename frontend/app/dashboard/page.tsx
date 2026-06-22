'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { CreateProjectButton } from '@/components/ui/CreateProjectButton';
import { ProjectCard } from '@/components/ProjectCard';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { canCreateProject, OrgPermission } from '@/lib/permissions';
import { useProjects, useInvalidateProjects } from '@/hooks/queries/useProjects';

export default function DashboardPage() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const invalidateProjects = useInvalidateProjects();
  const {
    data: projects = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useProjects(currentOrg?._id);

  const error = queryError
    ? (queryError as { response?: { data?: { error?: string } } }).response?.data?.error ||
      'Failed to load projects'
    : '';

  useEffect(() => {
    const onPanicExecuted = () => {
      invalidateProjects(currentOrg?._id);
    };

    window.addEventListener('hashenv:panic-executed', onPanicExecuted);
    return () => window.removeEventListener('hashenv:panic-executed', onPanicExecuted);
  }, [currentOrg?._id, invalidateProjects]);

  const orgPermissions = (currentOrg?.permissions ?? []) as OrgPermission[];
  const canCreate = currentOrg
    ? canCreateProject(currentOrg.role, orgPermissions)
    : true;

  const ownedCount = projects.filter((p) => p.createdBy._id === user?.id).length;
  const sharedCount = projects.filter(
    (p) =>
      p.members.some((m) => m.userId._id === user?.id) &&
      p.createdBy._id !== user?.id
  ).length;

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <PageHeader
          title="Dashboard"
          description={
            currentOrg
              ? `Projects in ${currentOrg.name}`
              : 'Manage your environment files'
          }
          actions={canCreate ? <CreateProjectButton size="md" /> : undefined}
        />

        {!loading && projects.length > 0 && (
          <section
            aria-label="Project overview"
            className="mb-8 border-y border-[var(--border-subtle)] py-6"
          >
            <dl className="grid grid-cols-3 gap-4 sm:gap-10">
              <StatItem label="Total" value={projects.length} highlight />
              <StatItem label="Owned" value={ownedCount} />
              <StatItem label="Shared" value={sharedCount} />
            </dl>
          </section>
        )}

        {error && (
          <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--error)]/40 bg-[var(--error)]/10 p-4">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        <section aria-labelledby="projects-heading">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="panel py-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent-muted)]">
                <svg className="h-6 w-6 text-[var(--accent)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
              </div>
              <h2 id="projects-heading" className="text-lg font-semibold text-[var(--foreground)]">
                No projects yet
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-[var(--text-muted)]">
                {canCreate
                  ? 'Create a project to upload and share environment files across dev, staging, and prod.'
                  : 'You do not have permission to create projects in this organization.'}
              </p>
              {canCreate && (
                <div className="mt-6">
                  <CreateProjectButton size="md" />
                </div>
              )}
            </div>
          ) : (
            <>
              <h2
                id="projects-heading"
                className="mb-4 text-sm font-semibold text-[var(--text-secondary)]"
              >
                All projects
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    onRefresh={() => void refetch()}
                  />
                ))}
              </div>
            </>
          )}
        </section>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}

function StatItem({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-[var(--text-muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl md:text-4xl ${
          highlight ? 'text-[var(--accent)]' : 'text-[var(--foreground)]'
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
