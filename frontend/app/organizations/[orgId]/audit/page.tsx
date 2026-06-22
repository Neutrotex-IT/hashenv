'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { organizationsAPI, AuditLogEntry } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { OrgPageHeader } from '@/components/OrgPageHeader';
import { hasOrgPermission, OrgPermission } from '@/lib/permissions';

const MAX_LOGS = 1000;

function formatResource(log: AuditLogEntry): string {
  const type = log.resourceType;
  if (log.resourceId) {
    const id = log.resourceId.length > 12 ? `${log.resourceId.slice(0, 8)}…` : log.resourceId;
    return `${type} · ${id}`;
  }
  return type;
}

function formatMetadata(metadata: Record<string, unknown> | undefined): string {
  if (!metadata || Object.keys(metadata).length === 0) return '-';
  try {
    return JSON.stringify(metadata);
  } catch {
    return '-';
  }
}

function formatActor(log: AuditLogEntry): string {
  if (log.actorEmail) return log.actorEmail;
  if (log.actorType === 'api_token') return 'API token';
  return log.actorId.slice(0, 8) + '…';
}

export default function OrganizationAuditPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { organizations } = useOrganization();
  const org = organizations.find((item) => item._id === orgId);

  const customPermissions = (org?.permissions ?? []) as OrgPermission[];
  const canAudit = org
    ? hasOrgPermission(org.role, customPermissions, 'org:audit')
    : false;

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!org) return;

    const loadAudit = async () => {
      try {
        setLoading(true);
        setError('');
        setForbidden(false);
        const data = await organizationsAPI.getAudit(orgId);
        setLogs(data);
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: { error?: string } } };
        if (axiosErr.response?.status === 403) {
          setForbidden(true);
          setError('You do not have permission to view organization audit logs.');
        } else {
          setError(axiosErr.response?.data?.error || 'Failed to load audit logs');
        }
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    loadAudit();
  }, [orgId, org]);

  if (loading) {
    return (
      <>
        <SkeletonCard className="mb-6" />
        <SkeletonCard />
      </>
    );
  }

  return (
    <>
      {org && (
        <OrgPageHeader
          orgId={orgId}
          orgName={org.name}
          title="Audit log"
          description="Organization-wide activity including member changes, project events, and security actions."
        />
      )}

      {error && (
        <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
          <p className="text-sm text-[var(--error)]">{error}</p>
          {forbidden && !canAudit && (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Contact an organization admin if you need audit access.
            </p>
          )}
        </div>
      )}

      {!forbidden && logs.length >= MAX_LOGS && (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3">
          <p className="text-sm text-[var(--warning)]">
            Showing the most recent {MAX_LOGS} entries. Older events are not displayed.
          </p>
        </div>
      )}

      {!forbidden && logs.length > 0 ? (
        <div className="data-table-wrap data-table-wrap--wide">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--surface-elevated)]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Resource</th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
              {logs.map((log) => (
                <tr key={log._id} className="hover:bg-[var(--surface-elevated)] transition-colors">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--text-secondary)]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">
                    <span className="block text-[var(--foreground)]">{formatActor(log)}</span>
                    <span className="text-xs text-[var(--text-muted)] capitalize">{log.actorType}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-[var(--foreground)] capitalize">{log.action}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-secondary)]">{formatResource(log)}</td>
                  <td className="hidden lg:table-cell max-w-xs truncate px-4 py-3 text-xs font-mono text-[var(--text-muted)]" title={formatMetadata(log.metadata)}>
                    {formatMetadata(log.metadata)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !forbidden && !error ? (
        <div className="empty-state">
          <svg className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-[var(--text-secondary)]">No audit events recorded yet.</p>
        </div>
      ) : null}
    </>
  );
}
