'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { envAPI, environmentsAPI } from '@/lib/api';
import { formatEnvLabel } from '@/lib/environments';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { useToast } from '@/contexts/ToastContext';

interface AuditLogEntry {
  _id: string;
  action: string;
  actorEmail?: string;
  actorId: string;
  createdAt: string;
  metadata?: {
    environment?: string;
    version?: number;
    rolledBackFrom?: number;
  };
}

export default function ProjectActivityPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [envSlugs, setEnvSlugs] = useState<string[]>([]);
  const [selectedEnv, setSelectedEnv] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { error: toastError } = useToast();

  useEffect(() => {
    environmentsAPI.list(projectId).then((envs) => {
      setEnvSlugs(envs.map((e) => e.slug));
    }).catch(() => {
      setEnvSlugs(['dev', 'staging', 'prod']);
    });
  }, [projectId]);

  useEffect(() => {
    loadLogs();
  }, [projectId, selectedEnv]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const environment = selectedEnv === 'all' ? undefined : selectedEnv;
      const data = await envAPI.getLogs(projectId, environment);
      setLogs(data);
      setError('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to load activity');
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
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to download logs');
    }
  };

  const actionColor = (action: string) => {
    switch (action) {
      case 'upload':
        return 'text-[var(--success)]';
      case 'download':
        return 'text-[var(--accent)]';
      case 'edit':
        return 'text-[var(--warning)]';
      case 'rollback':
        return 'text-purple-400';
      case 'delete':
        return 'text-[var(--error)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] mb-4 inline-block"
          >
            ← Back to project
          </Link>
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">Activity</h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">Environment file uploads, downloads, edits, and rollbacks.</p>
            </div>
            <Button variant="outline" size="md" onClick={handleDownload}>
              Download logs
            </Button>
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
                All
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
          ) : error ? (
            <div className="rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
              <p className="text-sm text-[var(--error)]">{error}</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-12 text-center">
              <p className="text-[var(--text-secondary)]">No activity recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)]">
              <table className="min-w-full divide-y divide-[var(--border)]">
                <thead className="bg-[var(--surface-elevated)]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Time</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Environment</th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-[var(--text-muted)]">Actor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td className="px-4 py-3 text-sm text-[var(--text-secondary)] whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium capitalize ${actionColor(log.action)}`}>
                        {log.action}
                        {log.metadata?.version != null && (
                          <span className="text-[var(--text-muted)] font-normal"> v{log.metadata.version}</span>
                        )}
                        {log.metadata?.rolledBackFrom != null && (
                          <span className="text-[var(--text-muted)] font-normal text-xs block">
                            from v{log.metadata.rolledBackFrom}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-[var(--foreground)]">
                        {log.metadata?.environment || '—'}
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
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
