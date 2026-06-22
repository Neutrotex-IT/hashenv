'use client';

import Link from 'next/link';
import { envAPI } from '@/lib/api';
import { formatEnvLabel } from '@/lib/environments';
import {
  canAccessProjectMembers,
  canReadProject,
  canWriteProject,
} from '@/lib/permissions';
import { UploadEnvButton } from './ui/UploadEnvButton';
import { Button } from './ui/Button';
import { AvatarGroup } from './ui/Avatar';
import { Tag, envTagVariant } from './ui/Tag';
import { useToast } from '@/contexts/ToastContext';
import type { ProjectListItem } from '@/hooks/queries/useProjects';

interface ProjectCardProps {
  project: ProjectListItem;
  onRefresh?: () => void;
}

const DEFAULT_ENV_SLUGS = ['dev', 'staging', 'prod'];

export function ProjectCard({ project, onRefresh }: ProjectCardProps) {
  const { error: toastError } = useToast();

  const envSlugs =
    project.environmentSlugs && project.environmentSlugs.length > 0
      ? project.environmentSlugs
      : DEFAULT_ENV_SLUGS;
  const effectivePermissions = project.effectivePermissions ?? [];

  const canRead = canReadProject(effectivePermissions);
  const canWrite = canWriteProject(effectivePermissions);
  const canManageMembers = canAccessProjectMembers(effectivePermissions);

  const memberNames = project.members.map((m) => m.userId.name);

  const handleQuickDownload = async (e: React.MouseEvent, environment: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await envAPI.download(project._id, environment);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to download environment file');
    }
  };

  const showQuickActions = canRead || canWrite || canManageMembers;

  return (
    <article className="group panel flex h-full flex-col p-5">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {envSlugs.slice(0, 3).map((env) => (
          <Tag key={env} label={formatEnvLabel(env)} variant={envTagVariant(env)} />
        ))}
        {envSlugs.length > 3 && (
          <Tag label={`+${envSlugs.length - 3}`} variant="neutral" />
        )}
      </div>

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
        Environment files for {envSlugs.map(formatEnvLabel).join(', ')}.
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
        <div className="mt-4 space-y-2 border-t border-[var(--border-subtle)] pt-4">
          {canRead && (
            <div className="flex flex-wrap gap-1.5">
              {envSlugs.slice(0, 4).map((env) => (
                <Button
                  key={env}
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleQuickDownload(e, env)}
                  title={`Download ${formatEnvLabel(env)}`}
                  className="gap-1.5"
                >
                  <svg
                    className="h-3.5 w-3.5 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.75}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  {formatEnvLabel(env)}
                </Button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="primary" size="sm" asLink href={`/projects/${project._id}`} className="flex-1">
              Open
            </Button>
            {canWrite && (
              <UploadEnvButton
                projectId={project._id}
                variant="secondary"
                size="sm"
                label="Upload"
                className="flex-1"
              />
            )}
          </div>
        </div>
      )}
    </article>
  );
}
