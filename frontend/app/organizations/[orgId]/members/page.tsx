'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { organizationsAPI, OrgMember, OrgInvite, OrgPermissionsResponse } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { OrgPermissionPicker } from '@/components/ui/PermissionPicker';
import { formatOrgPermission, hasOrgPermission, OrgPermission } from '@/lib/permissions';

export default function OrganizationMembersPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { organizations } = useOrganization();

  const org = organizations.find((item) => item._id === orgId);

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [permissionInfo, setPermissionInfo] = useState<OrgPermissionsResponse | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [invitePermissions, setInvitePermissions] = useState<OrgPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const customPermissions = (org?.permissions ?? []) as OrgPermission[];
  const canInvite = org
    ? hasOrgPermission(org.role, customPermissions, 'org:invite')
    : false;
  const canManageMembers = org
    ? hasOrgPermission(org.role, customPermissions, 'org:manage_members')
    : false;
  const canViewInvites = org
    ? hasOrgPermission(org.role, customPermissions, 'org:invite') ||
      hasOrgPermission(org.role, customPermissions, 'org:revoke_invites')
    : false;
  const canRevokeInvites = org
    ? hasOrgPermission(org.role, customPermissions, 'org:revoke_invites')
    : false;
  const grantablePermissions = (permissionInfo?.grantable ?? []) as OrgPermission[];

  const loadData = async () => {
    try {
      setLoading(true);
      const [membersData, permissionsData] = await Promise.all([
        organizationsAPI.getMembers(orgId),
        organizationsAPI.getPermissions(orgId),
      ]);
      setMembers(membersData);
      setPermissionInfo(permissionsData);

      if (
        hasOrgPermission(org?.role ?? 'member', customPermissions, 'org:invite') ||
        hasOrgPermission(org?.role ?? 'member', customPermissions, 'org:revoke_invites')
      ) {
        const invitesData = await organizationsAPI.getInvites(orgId);
        setInvites(invitesData);
      } else {
        setInvites([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load organization members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [orgId, org?.role]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await organizationsAPI.inviteMember(orgId, {
        email,
        role,
        permissions: role === 'member' ? invitePermissions : undefined,
      });
      setEmail('');
      setRole('member');
      setInvitePermissions([]);
      setSuccess('Invitation sent successfully');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Revoke this invitation?')) return;

    try {
      await organizationsAPI.revokeInvite(orgId, inviteId);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke invitation');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the organization?')) return;

    try {
      await organizationsAPI.removeMember(orgId, memberId);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <div className="p-6 lg:p-8">
            <SkeletonCard className="mb-6" />
            <SkeletonCard />
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <Link href="/dashboard" className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block mb-4">
                ← Back to Dashboard
              </Link>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                {org?.name || 'Organization'} Members
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Invite people by email with granular organization permissions. They must accept the invite before they can be added to projects.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
                <p className="text-sm text-[var(--error)]">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                <p className="text-sm text-green-400">{success}</p>
              </div>
            )}

            {canInvite && org?.type === 'team' && (
              <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Invite by Email</h2>
                <form onSubmit={handleInvite} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="colleague@company.com"
                      className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Organization role</label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
                      className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    >
                      <option value="member">Member</option>
                      {(org.role === 'owner' || org.role === 'admin') && <option value="admin">Admin</option>}
                    </select>
                  </div>
                  {role === 'member' && (
                    <div>
                      <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                        Additional permissions
                      </label>
                      <OrgPermissionPicker
                        grantable={grantablePermissions}
                        selected={invitePermissions}
                        onChange={setInvitePermissions}
                      />
                      <p className="mt-2 text-xs text-[var(--text-muted)]">
                        You can only grant permissions you already have. Admins receive all organization permissions automatically.
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <Button variant="primary" size="md" type="submit" disabled={submitting}>
                      {submitting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {canViewInvites && invites.length > 0 && (
              <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Pending Invitations</h2>
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-md border border-[var(--border)] px-4 py-3">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{invite.email}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Role: {invite.role}
                          {invite.permissions && invite.permissions.length > 0 && (
                            <> · Permissions: {invite.permissions.map((p) => formatOrgPermission(p as OrgPermission)).join(', ')}</>
                          )}
                          {' · '}Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </p>
                      </div>
                      {canRevokeInvites && (
                        <button
                          onClick={() => handleRevokeInvite(invite.id)}
                          className="text-sm text-[var(--error)] hover:text-[#F85149]"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Current Members</h2>
              <div className="overflow-hidden rounded-lg border border-[var(--border)]">
                <table className="min-w-full divide-y divide-[var(--border)]">
                  <thead className="bg-[var(--surface-elevated)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Permissions</th>
                      {canManageMembers && (
                        <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Actions</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                    {members.map((member) => (
                      <tr key={member.id}>
                        <td className="px-6 py-4 text-sm">
                          <p className="font-medium text-[var(--foreground)]">{member.user.name}</p>
                          <p className="text-[var(--text-muted)]">{member.user.email}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] capitalize">{member.role}</td>
                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {member.role === 'owner' || member.role === 'admin' ? (
                            <span className="text-xs text-[var(--text-muted)]">All organization permissions</span>
                          ) : member.permissions && member.permissions.length > 0 ? (
                            <span className="text-xs">{member.permissions.map((p) => formatOrgPermission(p as OrgPermission)).join(', ')}</span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">Default member access</span>
                          )}
                        </td>
                        {canManageMembers && (
                          <td className="px-6 py-4 text-right text-sm">
                            {member.role !== 'owner' && (
                              <button
                                onClick={() => handleRemoveMember(member.id)}
                                className="text-[var(--error)] hover:text-[#F85149]"
                              >
                                Remove
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
