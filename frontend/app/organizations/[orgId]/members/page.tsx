'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { organizationsAPI, OrgMember, OrgInvite, OrgPermissionsResponse } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { OrgPageHeader } from '@/components/OrgPageHeader';
import { CreateOrganizationModal } from '@/components/CreateOrganizationModal';
import { OrgPermissionPicker } from '@/components/ui/PermissionPicker';
import { EditOrgMemberModal } from '@/components/ui/EditOrgMemberModal';
import { EffectivePermissionsPanel } from '@/components/ui/EffectivePermissionsPanel';
import { formatOrgPermission, hasOrgPermission, OrgPermission } from '@/lib/permissions';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';

export default function OrganizationMembersPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  const { organizations, refreshOrganizations } = useOrganization();

  const org = organizations.find((item) => item._id === orgId);
  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();

  const customPermissions = (org?.permissions ?? []) as OrgPermission[];

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [permissionInfo, setPermissionInfo] = useState<OrgPermissionsResponse | null>(null);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [invitePermissions, setInvitePermissions] = useState<OrgPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState<OrgMember | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);

  const isPersonalOrg = org?.type === 'personal';

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
      toastError(err.response?.data?.error || 'Failed to load organization members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPersonalOrg) {
      setLoading(false);
      return;
    }
    loadData();
  }, [orgId, org?.role, isPersonalOrg]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await organizationsAPI.inviteMember(orgId, {
        email,
        role,
        permissions: role === 'member' ? invitePermissions : undefined,
      });
      setEmail('');
      setRole('member');
      setInvitePermissions([]);
      toastSuccess('Invitation sent successfully');
      await Promise.all([loadData(), refreshOrganizations()]);
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const ok = await confirm({
      title: 'Revoke invitation?',
      message: 'The invitee will no longer be able to accept this invitation.',
      confirmLabel: 'Revoke',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await organizationsAPI.revokeInvite(orgId, inviteId);
      await loadData();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to revoke invitation');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const ok = await confirm({
      title: 'Remove member?',
      message: 'This person will lose access to all projects in this organization.',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await organizationsAPI.removeMember(orgId, memberId);
      await Promise.all([loadData(), refreshOrganizations()]);
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    setResendingInviteId(inviteId);
    try {
      await organizationsAPI.resendInvite(orgId, inviteId);
      toastSuccess('Invitation resent');
      await loadData();
    } catch (err: any) {
      toastError(err.response?.data?.error || 'Failed to resend invitation');
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleUpdateMember = async (
    memberId: string,
    data: { role: 'member' | 'admin'; permissions?: OrgPermission[] }
  ) => {
    await organizationsAPI.updateMember(orgId, memberId, data);
    toastSuccess('Member updated successfully');
    await Promise.all([loadData(), refreshOrganizations()]);
  };

  if (loading) {
    return (
      <div className="w-full">
        <SkeletonCard className="mb-6" />
        <SkeletonCard />
      </div>
    );
  }

  if (isPersonalOrg) {
    return (
      <>
        <div className="w-full">
          {org && (
            <OrgPageHeader
              orgId={orgId}
              orgName={org.name}
              title="Members"
              description="Personal workspaces are for solo use only."
            />
          )}
          <div className="content-section">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Collaboration unavailable</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Personal workspaces cannot have additional members or invitations. Create a team organization to
              collaborate with others.
            </p>
            <Button variant="primary" size="md" onClick={() => setCreateOrgModalOpen(true)}>
              Create team organization
            </Button>
          </div>
        </div>
        <CreateOrganizationModal
          isOpen={createOrgModalOpen}
          onClose={() => setCreateOrgModalOpen(false)}
        />
      </>
    );
  }

  const showInviteColumn = (canInvite && org?.type === 'team') || (canViewInvites && invites.length > 0);

  return (
    <>
      <div className="w-full">
        {org && (
          <OrgPageHeader
            orgId={orgId}
            orgName={org.name}
            title="Members"
            description="Invite people by email with granular organization permissions. They must accept the invite before they can be added to projects."
          />
        )}

        {permissionInfo && (
          <EffectivePermissionsPanel
            scope="org"
            catalog={permissionInfo.catalog.org}
            effective={permissionInfo.effective}
            className="mb-6"
          />
        )}

        {org?.type === 'team' && !canInvite && (
          <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
            <p className="text-sm text-[var(--text-muted)]">
              Only organization owners and admins can send invitations. Ask an admin to invite new members by email.
              Once they accept, you can add them to projects from the project members page.
            </p>
          </div>
        )}

        <div className={`grid gap-8 ${showInviteColumn ? 'lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]' : ''}`}>
          {showInviteColumn && (
            <div className="space-y-8">
              {canInvite && org?.type === 'team' && (
                <div className="content-section">
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
                          Permissions
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
                <div className="content-section">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Pending Invitations</h2>
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex flex-col gap-3 border-b border-[var(--border-subtle)] py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--foreground)] break-all">{invite.email}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Role: {invite.role}
                            {invite.permissions && invite.permissions.length > 0 && (
                              <> · Permissions: {invite.permissions.map((p) => formatOrgPermission(p as OrgPermission)).join(', ')}</>
                            )}
                            {' · '}Expires {new Date(invite.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          {canInvite && (
                            <button
                              onClick={() => handleResendInvite(invite.id)}
                              disabled={resendingInviteId === invite.id}
                              className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50"
                            >
                              {resendingInviteId === invite.id ? 'Sending...' : 'Resend'}
                            </button>
                          )}
                          {canRevokeInvites && (
                            <button
                              onClick={() => handleRevokeInvite(invite.id)}
                              className="text-sm text-[var(--error)] hover:text-[#F85149]"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className={`content-section min-w-0 ${showInviteColumn ? 'lg:pt-0 lg:border-t-0' : ''}`}>
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Current Members</h2>
            <div className="data-table-wrap">
                <table className="min-w-full divide-y divide-[var(--border)]">
                  <thead className="bg-[var(--surface-elevated)]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Role</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Permissions</th>
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
                        <td className="hidden md:table-cell px-6 py-4 text-sm text-[var(--text-secondary)]">
                          {member.role === 'owner' || member.role === 'admin' ? (
                            <span className="text-xs text-[var(--text-muted)]">All organization permissions</span>
                          ) : member.permissions && member.permissions.length > 0 ? (
                            <span className="text-xs">{member.permissions.map((p) => formatOrgPermission(p as OrgPermission)).join(', ')}</span>
                          ) : (
                            <span className="text-xs text-[var(--text-muted)]">No permissions granted</span>
                          )}
                        </td>
                        {canManageMembers && (
                          <td className="px-6 py-4 text-right text-sm">
                            {member.role !== 'owner' && (
                              <div className="flex items-center justify-end gap-3">
                                <button
                                  onClick={() => setEditingMember(member)}
                                  className="text-[var(--accent)] hover:text-[var(--accent-hover)]"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  className="text-[var(--error)] hover:text-[#F85149]"
                                >
                                  Remove
                                </button>
                              </div>
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

      {editingMember && (
        <EditOrgMemberModal
          member={editingMember}
          grantablePermissions={grantablePermissions}
          canAssignAdmin={org?.role === 'owner' || org?.role === 'admin'}
          onSave={(data) => handleUpdateMember(editingMember.id, data)}
          onClose={() => setEditingMember(null)}
        />
      )}
    </>
  );
}
