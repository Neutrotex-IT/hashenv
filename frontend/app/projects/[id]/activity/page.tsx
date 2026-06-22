'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { projectsAPI, envAPI } from '@/lib/api';
import { canReadProject } from '@/lib/permissions';
import { formatEnvLabel } from '@/lib/environments';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ProjectPageHeader } from '@/components/ProjectPageHeader';
import { useToast } from '@/contexts/ToastContext';
import { useProject, useProjectPermissions } from '@/hooks/queries/useProject';
import { useProjectEnvironments } from '@/hooks/queries/useProjectEnvironments';

interface ActivityEntry {
  _id: string;
  resourceType: string;
  action: string;
  actorEmail?: string;
  actorId: string;
  createdAt: string;
  metadata?: {
    environment?: string;
    version?: number;
    rolledBackFrom?: number;
    secretName?: string;
    name?: string;
    email?: string;
  };
}

function formatActivityLabel(entry: ActivityEntry): string {
  const { resourceType, action, metadata } = entry;
  switch (resourceType) {
    case 'env':
      return `Env ${action}${metadata?.version != null ? ` v${metadata.version}` : ''}`;
    case 'secret':
      return `Secret ${action}${metadata?.secretName ? `: ${metadata.secretName}` : ''}`;
    case 'account':
      return `Account ${action}${metadata?.name ? `: ${metadata.name}` : ''}`;
    case 'project':
      return `Project ${action.replace('_', ' ')}`;
    case 'api_token':
      return `API token ${action}`;
    case 'member':
      return `Member ${action}${metadata?.email ? `: ${metadata.email}` : ''}`;
    default:
      return `${resourceType} ${action}`;
  }
}

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { data: project } = useProject(projectId);
  const { data: permissions } = useProjectPermissions(projectId);
  const { data: environments = [] } = useProjectEnvironments(projectId);
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const { error: toastError } = useToast();

  const projectName = project?.name ?? '';
  const canRead = permissions ? canReadProject(permissions.effective) : false;
  const envSlugs =
    environments.length > 0 ? environments.map((e) => e.slug) : ['dev', 'staging', 'prod'];

  useEffect(() => {
    loadLogs();
  }, [projectId, selectedEnv, selectedResource]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const environment = selectedEnv === 'all' ? undefined : selectedEnv;
      const resourceType = selectedResource === 'all' ? undefined : selectedResource;
      const data = await projectsAPI.getActivity(projectId, { environment, resourceType });
      setLogs(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to load activity');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    try {
      const environment = selectedEnv === 'all' ? undefined : selectedEnv;
      await envAPI.downloadLogs(projectId, environment);
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : 'Failed to download activity logs');
    }
  };

  const actionColor = (resourceType: string, action: string) => {
    if (action === 'delete' || action === 'remove_member') return 'text-[var(--error)]';
    if (action === 'upload' || action === 'create' || action === 'add_member') return 'text-[var(--success)]';
    if (action === 'rollback' || action === 'edit' || action === 'update') return 'text-[var(--warning)]';
    if (resourceType === 'api_token') return 'text-purple-400';
    return 'text-[var(--accent)]';
  };

  const resourceFilters = [
    { id: 'all', label: 'All types' },
    { id: 'env', label: 'Environment' },
    { id: 'secret', label: 'Secrets' },
    { id: 'account', label: 'Accounts' },
    { id: 'project', label: 'Project' },
    { id: 'api_token', label: 'API tokens' },
    { id: 'member', label: 'Members' },
  ];

  return (
    <>
      <ProjectPageHeader
        projectId={projectId}
        projectName={projectName || 'Project'}
        title="Activity"
        description="Timeline across environment files, secrets, accounts, tokens, and members."
        actions={
          canRead ? (
            <Button variant="outline" size="md" onClick={handleDownload}>
              Download env logs
            </Button>
          ) : undefined
        }
      />

          <div className="mb-4 flex flex-wrap gap-2">
            {resourceFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setSelectedResource(filter.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  selectedResource === filter.id
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="mb-6 border-b border-[var(--border)]">
            <nav className="-mb-px flex flex-wrap gap-4">
              <button
                onClick={() => setSelectedEnv('all')}
                className={`border-b-2 px-1 py-3 text-sm font-medium ${
                  selectedEnv === 'all'
                    ? 'border-[var(--accent)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--text-muted)]'
                }`}
              >
                All envs
              </button>
              {envSlugs.map((slug) => (
                <button
                  key={slug}
                  onClick={() => setSelectedEnv(slug)}
                  className={`border-b-2 px-1 py-3 text-sm font-medium ${
                    selectedEnv === slug
                      ? 'border-[var(--accent)] text-[var(--accent)]'
                      : 'border-transparent text-[var(--text-muted)]'
                  }`}
                >
                  {formatEnvLabel(slug)}
                </button>
              ))}
            </nav>
          </div>

          {loading ? (
            <SkeletonCard />
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <p className="text-[var(--text-secondary)]">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--surface-elevated)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Event</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${actionColor(log.resourceType, log.action)}`}>
                        {formatActivityLabel(log)}
                        {log.metadata?.rolledBackFrom != null && (
                          <span className="text-[var(--text-muted)] font-normal text-xs block">
                            from v{log.metadata.rolledBackFrom}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm capitalize text-[var(--text-secondary)]">
                        {log.resourceType.replace('_', ' ')}
                        {log.metadata?.environment && (
                          <span className="block font-mono text-xs text-[var(--text-muted)]">
                            {log.metadata.environment}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                        {log.actorEmail || log.actorId}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
    </>
  );
}
