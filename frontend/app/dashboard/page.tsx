'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { projectsAPI, settingsAPI } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { CreateProjectButton } from '@/components/ui/CreateProjectButton';
import { ProjectCard } from '@/components/ProjectCard';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import Link from 'next/link';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';

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
  const [panicButtonSettings, setPanicButtonSettings] = useState<any>(null);
  const [panicLoading, setPanicLoading] = useState(false);
  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();

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
    loadPanicSettings();
  }, [loadProjects]);

  const loadPanicSettings = async () => {
    try {
      const settings = await settingsAPI.get();
      setPanicButtonSettings(settings.panicButton);
    } catch (err) {
      console.error('Failed to load panic button settings:', err);
    }
  };

  const handlePanicButton = async () => {
    if (!panicButtonSettings) {
      toastError('Panic button not configured. Please configure it in Settings.');
      return;
    }

    const { flushEnvs, flushSecrets, revokeApiTokens, revokeCollaborators, downloadEnvs, askConfirmation } = panicButtonSettings;

    if (!flushEnvs && !flushSecrets && !revokeApiTokens && !revokeCollaborators && !downloadEnvs) {
      toastError('No panic actions configured. Please configure panic button settings first.');
      return;
    }

    if (askConfirmation) {
      const confirmMessage =
        `Are you sure you want to execute panic actions?\n\n` +
        `${downloadEnvs ? '• Download all environment files\n' : ''}` +
        `${flushEnvs ? '• Delete all environment files\n' : ''}` +
        `${flushSecrets ? '• Delete all secrets and associated accounts\n' : ''}` +
        `${revokeApiTokens ? '• Revoke all API tokens\n' : ''}` +
        `${revokeCollaborators ? '• Revoke all collaborator access\n' : ''}`;

      const ok = await confirm({
        title: 'Execute panic actions?',
        message: confirmMessage,
        confirmLabel: 'Continue',
        variant: 'danger',
      });
      if (!ok) return;
    }

    const password = window.prompt('Enter your password to execute panic actions:');
    if (!password) {
      toastError('Password is required to execute panic actions');
      return;
    }

    setPanicLoading(true);
    try {
      const result = await settingsAPI.panic(password);

      if (result.results?.downloadEnvs && result.results?.downloadContent) {
        const blob = new Blob([result.results.downloadContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', result.results.downloadFilename || 'hashenv-backup.txt');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }

      const actions = [];
      if (result.results?.downloadEnvs) actions.push('downloaded');
      if (result.results?.flushEnvs) actions.push('envs flushed');
      if (result.results?.flushSecrets) actions.push('secrets flushed');
      if (result.results?.revokeApiTokens) actions.push('API tokens revoked');
      if (result.results?.revokeCollaborators) actions.push('collaborators revoked');

      toastSuccess(`Panic actions executed: ${actions.join(', ')}`);
      loadProjects();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to execute panic actions');
    } finally {
      setPanicLoading(false);
    }
  };

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
            actions={<CreateProjectButton size="lg" />}
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
                  Create a project to upload and share environment files across dev,
                  staging, and production.
                </p>
                <div className="mt-6">
                  <CreateProjectButton size="lg" />
                </div>
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

          <section className="mt-12 rounded-lg border border-[var(--error)]/30 bg-[var(--error)]/5 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-[var(--foreground)]">
                  Emergency actions
                </h2>
                <p className="mt-1 max-w-xl text-sm text-[var(--text-muted)]">
                  Run configured panic actions across your projects. Configure
                  behavior in{' '}
                  <Link href="/settings" className="text-[var(--accent)] hover:underline">
                    account settings
                  </Link>
                  .
                </p>
              </div>
              <button
                type="button"
                onClick={handlePanicButton}
                disabled={panicLoading || !panicButtonSettings}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--error)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#F85149] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {panicLoading ? 'Processing...' : 'Run panic button'}
              </button>
            </div>
          </section>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
