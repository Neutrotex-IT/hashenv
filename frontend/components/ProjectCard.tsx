'use client';

import Link from 'next/link';
import {
  canAccessProjectMembers,
  canReadProject,
  canWriteProject,
} from '@/lib/permissions';
import { Button } from './ui/Button';
import { AvatarGroup } from './ui/Avatar';
import type { ProjectListItem } from '@/hooks/queries/useProjects';

interface ProjectCardProps {
  project: ProjectListItem;
  onRefresh?: () => void;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const effectivePermissions = project.effectivePermissions ?? [];
  const canRead = canReadProject(effectivePermissions);
  const canWrite = canWriteProject(effectivePermissions);
  const canManageMembers = canAccessProjectMembers(effectivePermissions);
  const memberNames = project.members.map((m) => m.userId.name);
  const showQuickActions = canRead || canWrite || canManageMembers;

  return (
    <article className="group panel flex h-full flex-col p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <Link href={`/projects/${project._id}`} className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
            {project.name}
          </h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Created by {typeof project.createdBy === 'object' ? project.createdBy.name : 'Unknown'}
          </p>
        </Link>
      </div>

      <p className="mb-4 line-clamp-2 text-sm text-[var(--text-secondary)]">
        Manage components with secrets files and key-value secrets per environment.
      </p>

      <div className="mt-auto flex items-center justify-between border-t border-[var(--border-subtle)] pt-4">
        <AvatarGroup names={memberNames} max={3} />
        <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {new Date(project.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>

      {showQuickActions && (
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
          <Button variant="primary" size="sm" asLink href={`/projects/${project._id}`} className="w-full">
            Open project
          </Button>
        </div>
      )}
    </article>
  );
}
