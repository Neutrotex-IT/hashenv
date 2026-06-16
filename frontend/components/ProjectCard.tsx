'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { envAPI } from '@/lib/api';
import { formatPermission } from '@/lib/permissions';
import { UploadEnvButton } from './ui/UploadEnvButton';
import { Button } from './ui/Button';
import { useToast } from '@/contexts/ToastContext';

interface ProjectMember {
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  permission: 'read' | 'write';
}

interface Project {
  _id: string;
  name: string;
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  members: ProjectMember[];
  createdAt: string;
}

interface ProjectCardProps {
  project: Project;
  onRefresh?: () => void;
}

export function ProjectCard({ project, onRefresh }: ProjectCardProps) {
  const { user } = useAuth();
  const { error: toastError } = useToast();
  
  // Check if user is the project owner (created it)
  const isProjectOwner = project.createdBy._id === user?.id;
  const userPermission = project.members.find(
    (m) => m.userId._id === user?.id
  )?.permission || null;

  // Only project owner or users with write permission can write
  const canWrite = isProjectOwner || userPermission === 'write';
  // Project owner or members with read/write can read
  const canRead = isProjectOwner || userPermission === 'read' || userPermission === 'write';

  const handleQuickDownload = async (e: React.MouseEvent, environment: 'dev' | 'staging' | 'prod') => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await envAPI.download(project._id, environment);
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to download file');
    }
  };

  return (
    <div className="group relative rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 hover:border-[var(--accent)]/50 hover:shadow-lg transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <Link href={`/projects/${project._id}`} className="flex-1">
          <h3 className="text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Created by {typeof project.createdBy === 'object' ? project.createdBy.name : 'Unknown'}
          </p>
        </Link>
        <Link href={`/projects/${project._id}`}>
          <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mb-4 pb-4 border-b border-[var(--border)]">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          {project.members.length} member{project.members.length !== 1 ? 's' : ''}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {new Date(project.createdAt).toLocaleDateString()}
        </span>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--foreground)]">Quick Actions</span>
          {canRead && (
            <span className="text-xs text-[var(--text-muted)]">
              Your permission: {isProjectOwner ? 'Owner' : userPermission ? formatPermission(userPermission) : 'None'}
            </span>
          )}
        </div>

        {/* Environment Quick Download Buttons */}
        {canRead && (
          <div className="grid grid-cols-3 gap-2">
            {(['dev', 'staging', 'prod'] as const).map((env) => (
              <Button
                key={env}
                variant="outline"
                size="sm"
                onClick={(e) => handleQuickDownload(e, env)}
                className="text-xs capitalize"
                title={`Download latest ${env} environment file`}
              >
                <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {env}
              </Button>
            ))}
          </div>
        )}

        {/* Primary Actions */}
        <div className="flex gap-2 pt-2 border-t border-[var(--border)]">
          <Button
            variant="primary"
            size="sm"
            asLink
            href={`/projects/${project._id}`}
            className="flex-1"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
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

        {/* Project Owner Actions */}
        {isProjectOwner && (
          <Link href={`/projects/${project._id}/members`} className="block">
            <Button variant="ghost" size="sm" className="w-full">
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Manage Members
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
