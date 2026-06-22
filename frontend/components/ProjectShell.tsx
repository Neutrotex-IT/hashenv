'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { getProjectNav, isNavActive } from '@/lib/navigation';
import { AvatarGroup } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { canAccessProjectMembers } from '@/lib/permissions';
import { Skeleton } from '@/components/ui/Skeleton';
import { useProject, useProjectPermissions } from '@/hooks/queries/useProject';

export function ProjectShell({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;
  const { currentOrg } = useOrganization();

  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: permissions, isLoading: permissionsLoading } = useProjectPermissions(projectId);

  const loading = projectLoading || permissionsLoading;
  const effectivePermissions = permissions?.effective;

  const navItems = getProjectNav(projectId, {
    collaborationEnabled: currentOrg?.type === 'team',
    effectivePermissions,
  });

  const memberNames = project?.members.map((m) => m.userId.name) ?? [];
  const canManageMembers = effectivePermissions
    ? canAccessProjectMembers(effectivePermissions)
    : false;

  return (
    <div>
      {/* Project header */}
      <div className="mb-6 border-b border-[var(--border)] pb-5">
        {loading ? (
          <div className="space-y-3">
            <Skeleton variant="rectangular" height={28} width="40%" />
            <Skeleton variant="rectangular" height={20} width="25%" />
          </div>
        ) : project ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="mb-1">
                <ol className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <li>
                    <Link href="/dashboard" className="hover:text-[var(--accent)] transition-colors">
                      Workspace
                    </Link>
                  </li>
                  <li aria-hidden>/</li>
                  <li className="truncate text-[var(--text-secondary)]">{project.name}</li>
                </ol>
              </nav>
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] text-balance">
                {project.name}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {memberNames.length > 0 && <AvatarGroup names={memberNames} />}
              {canManageMembers && currentOrg?.type === 'team' && (
                <Button variant="primary" size="sm" asLink href={`/projects/${projectId}/members`}>
                  <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
                  </svg>
                  Add member
                </Button>
              )}
            </div>
          </div>
        ) : null}

        {/* Tab navigation */}
        {!loading && navItems.length > 0 && (
          <nav className="mt-5 -mb-px flex gap-1 overflow-x-auto" aria-label="Project sections">
            {navItems.map((item) => {
              const active = isNavActive(pathname, item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'text-[var(--foreground)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {item.name}
                  {active && <span className="tab-active-indicator" aria-hidden />}
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      {children}
    </div>
  );
}
