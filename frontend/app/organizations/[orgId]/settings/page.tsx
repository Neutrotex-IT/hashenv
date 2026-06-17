'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { organizationsAPI } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { OrgPageHeader } from '@/components/OrgPageHeader';
import { hasOrgPermission, OrgPermission } from '@/lib/permissions';
import { useToast } from '@/contexts/ToastContext';

export default function OrganizationSettingsPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { organizations, refreshOrganizations, setCurrentOrg } = useOrganization();
  const { success: toastSuccess, error: toastError } = useToast();
  const org = organizations.find((item) => item._id === orgId);

  const customPermissions = (org?.permissions ?? []) as OrgPermission[];
  const canUpdate = org
    ? hasOrgPermission(org.role, customPermissions, 'org:update')
    : false;

  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (org) {
      setName(org.name);
      setLoading(false);
    }
  }, [org]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canUpdate) return;

    setSubmitting(true);
    setFieldErrors({});

    try {
      const updated = await organizationsAPI.update(orgId, { name: name.trim() });
      await refreshOrganizations();
      if (org) {
        setCurrentOrg({ ...org, name: updated.name });
      }
      toastSuccess('Organization renamed successfully');
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: {
          status?: number;
          data?: { error?: string; errors?: Array<{ path?: string; msg?: string }> };
        };
      };
      if (axiosErr.response?.status === 403) {
        toastError('You do not have permission to update this organization.');
      } else if (axiosErr.response?.data?.errors) {
        const next: Record<string, string> = {};
        for (const item of axiosErr.response.data.errors) {
          if (item.path) next[item.path] = item.msg || 'Invalid value';
        }
        setFieldErrors(next);
      } else {
        toastError(axiosErr.response?.data?.error || 'Failed to update organization');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      {org && (
        <OrgPageHeader
          orgId={orgId}
          orgName={org.name}
          title="Organization settings"
          description="Manage organization details."
        />
      )}

      {canUpdate ? (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">General</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Organization name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              {fieldErrors.name && (
                <p className="mt-1 text-sm text-[var(--error)]">{fieldErrors.name}</p>
              )}
            </div>
            {org?.type === 'team' && (
              <p className="text-xs text-[var(--text-muted)]">
                Slug: <code className="font-mono">{org.slug}</code> (cannot be changed)
              </p>
            )}
            <div className="flex justify-end pt-2">
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={submitting || !name.trim() || name.trim() === org?.name}
              >
                {submitting ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="text-sm text-[var(--text-secondary)]">
            You do not have permission to update organization settings.
          </p>
        </div>
      )}
    </div>
  );
}
