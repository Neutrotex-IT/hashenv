'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { projectsAPI, OrgMember, ProjectInvite } from '@/lib/api';
import { useOrganization } from '@/contexts/OrganizationContext';
import { Button } from '@/components/ui/Button';
import { OrgMemberSelect } from '@/components/ui/OrgMemberSelect';
import { ProjectPermissionPicker } from '@/components/ui/PermissionPicker';
import { EditProjectMemberModal } from '@/components/ui/EditProjectMemberModal';
import { EffectivePermissionsPanel } from '@/components/ui/EffectivePermissionsPanel';
import { formatPermission, formatProjectPermission, ProjectPermission } from '@/lib/permissions';
import { ProjectPageHeader } from '@/components/ProjectPageHeader';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';
import { CreateOrganizationModal } from '@/components/CreateOrganizationModal';
import { useProject, useProjectPermissions, useInvalidateProject, type ProjectDetail } from '@/hooks/queries/useProject';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';

interface Project extends ProjectDetail {}

export default function ManageMembersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { organizations } = useOrganization();
  const queryClient = useQueryClient();
  const { data: project, isLoading: projectLoading } = useProject(projectId);
  const { data: permissionInfo, isLoading: permissionsLoading } = useProjectPermissions(projectId);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'write'>('read');
  const [selectedCapabilities, setSelectedCapabilities] = useState<ProjectPermission[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingMember, setEditingMember] = useState<{
    userId: string;
    name: string;
    email: string;
    permission: 'read' | 'write';
    permissions: ProjectPermission[];
  } | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);

  const { confirm } = useConfirm();
  const { success: toastSuccess } = useToast();

  const grantablePermissions = (permissionInfo?.grantable ?? []) as ProjectPermission[];
  const canInvite = permissionInfo?.effective.includes('project:invite') ?? false;
  const canManageMembers = permissionInfo?.effective.includes('project:manage_members') ?? false;
  const loading = projectLoading || permissionsLoading || invitesLoading;

  useEffect(() => {
    if (permissionsLoading || !permissionInfo) {
      return;
    }
    void loadInvites();
  }, [projectId, permissionInfo, permissionsLoading]);

  const loadInvites = async () => {
    if (!permissionInfo) {
      return;
    }
    try {
      setInvitesLoading(true);
      if (permissionInfo.effective.includes('project:invite')) {
        const invitesData = await projectsAPI.getInvites(projectId);
        setInvites(invitesData);
      } else {
        setInvites([]);
      }
      setError('');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Failed to load data');
    } finally {
      setInvitesLoading(false);
    }
  };

  const loadData = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.projectPermissions(projectId) });
    await loadInvites();
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) {
      setError('Please select an organization member');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await projectsAPI.addMember(projectId, {
        userId: selectedMember.user._id,
        permission: selectedPermission,
        permissions: selectedCapabilities,
      });
      await loadData();
      setSelectedMember(null);
      setSelectedPermission('read');
      setSelectedCapabilities([]);
      toastSuccess('Member added');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const ok = await confirm({
      title: 'Remove member?',
      message: 'This person will lose access to this project.',
      confirmLabel: 'Remove',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      await projectsAPI.removeMember(projectId, userId);
      await loadData();
      toastSuccess('Member removed');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
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
      await projectsAPI.revokeInvite(projectId, inviteId);
      await loadData();
      toastSuccess('Invitation revoked');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to revoke invitation');
    }
  };

  const handleUpdateMember = async (
    userId: string,
    data: { permission: 'read' | 'write'; permissions: ProjectPermission[] }
  ) => {
    await projectsAPI.updateMember(projectId, userId, data);
    toastSuccess('Member updated');
    await loadData();
  };

  const handleResendInvite = async (inviteId: string) => {
    setResendingInviteId(inviteId);
    setError('');
    try {
      await projectsAPI.resendInvite(projectId, inviteId);
      toastSuccess('Invitation resent');
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend invitation');
    } finally {
      setResendingInviteId(null);
    }
  };

  if (loading) {
    return (
      <>
        <Skeleton variant="rectangular" height={48} width="40%" className="mb-6" />
        <SkeletonCard className="mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <p className="text-[var(--error)] mb-4">Project not found</p>
          <Button variant="primary" size="md" asLink href="/dashboard">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const orgId = project.organizationId
    ? typeof project.organizationId === 'string'
      ? project.organizationId
      : project.organizationId._id
    : undefined;
  if (!orgId) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[var(--error)]">Organization not found for this project.</p>
      </div>
    );
  }

  const org = organizations.find((item) => item._id === orgId);
  const isPersonalOrg = org?.type === 'personal';

  if (isPersonalOrg) {
    return (
      <>
        <div className="w-full">
          <ProjectPageHeader
            projectId={projectId}
            projectName={project.name}
            title="Members"
            description="Personal workspace projects are for solo use only."
          />
          <div className="content-section">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-2">Collaboration unavailable</h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Projects in a personal workspace cannot have collaborators. Create a team organization, move or recreate
              your project there, then invite members at the organization level.
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

  const memberUserIds = project.members.map((m: Project['members'][number]) =>
    typeof m.userId === 'object' ? m.userId._id : m.userId
  );

  const showInviteColumn = canInvite;

  return (
    <>
      <div className="w-full">
        <ProjectPageHeader
          projectId={projectId}
          projectName={project.name}
          title="Members"
          description="Add organization members to this project. Invite people to the organization first, then add them here."
        />
        {orgId && (
          <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--accent)]/30 bg-[var(--accent)]/5 p-4">
            <p className="text-sm text-[var(--foreground)] mb-2">
              New collaborators must join the organization before they can access projects.
            </p>
            <Link
              href={`/organizations/${orgId}/members`}
              className="inline-flex text-sm font-medium text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              Invite to organization →
            </Link>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-[var(--radius-sm)] border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
            <p className="text-sm text-[var(--error)]">{error}</p>
          </div>
        )}

        {permissionInfo && (
          <EffectivePermissionsPanel
            scope="project"
            catalog={permissionInfo.catalog.project}
            effective={permissionInfo.effective}
            className="mb-6"
          />
        )}

        <div className={`grid gap-8 ${showInviteColumn ? 'lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]' : ''}`}>
          {showInviteColumn && (
            <div className="space-y-8">
              {canInvite && invites.length > 0 && (
                <div className="content-section">
                  <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Pending Invitations</h2>
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between border-b border-[var(--border-subtle)] py-3 last:border-b-0">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{invite.email}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            Access: {formatPermission(invite.permission)}
                            {invite.permissions && invite.permissions.length > 0 && (
                              <> · {invite.permissions.map((p) => formatProjectPermission(p as ProjectPermission)).join(', ')}</>
                            )}
                            {' · '}Expires {new Date(invite.expiresAt).toLocaleDateString()}
                          </p>
                        </div>
                        {canInvite && (
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => handleResendInvite(invite.id)}
                              disabled={resendingInviteId === invite.id}
                              className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:opacity-50"
                            >
                              {resendingInviteId === invite.id ? 'Sending...' : 'Resend'}
                            </button>
                            {canManageMembers && (
                              <button
                                onClick={() => handleRevokeInvite(invite.id)}
                                className="text-sm text-[var(--error)] hover:text-[#F85149]"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="content-section">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Add Existing Member</h2>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Organization Member
                    </label>
                    <OrgMemberSelect
                      orgId={orgId}
                      value={selectedMember}
                      onChange={setSelectedMember}
                      excludeUserIds={memberUserIds}
                      placeholder="Search organization members..."
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Access Level
                    </label>
                    <select
                      value={selectedPermission}
                      onChange={(e) => setSelectedPermission(e.target.value as 'read' | 'write')}
                      className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    >
                      <option value="read">Read Only</option>
                      <option value="write">Read/Write</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                      Additional capabilities
                    </label>
                    <ProjectPermissionPicker
                      grantable={grantablePermissions}
                      selected={selectedCapabilities}
                      onChange={setSelectedCapabilities}
                    />
                  </div>

                  <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                    <Button variant="primary" size="md" type="submit" disabled={submitting || !selectedMember}>
                      {submitting ? 'Adding...' : 'Add Member'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <div className={`content-section min-w-0 ${showInviteColumn ? 'lg:pt-0 lg:border-t-0' : ''}`}>
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Current Members</h2>
            {project.members.length === 0 ? (
              <p className="text-[var(--text-muted)] text-center py-4">No members added yet.</p>
            ) : (
              <div className="data-table-wrap">
                  <table className="min-w-full divide-y divide-[var(--border)]">
                    <thead className="bg-[var(--surface-elevated)]">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Access</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Capabilities</th>
                        {canManageMembers && (
                          <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Actions</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                      {project.members.map((member, idx) => {
                        const userId = typeof member.userId === 'object' ? member.userId._id : member.userId;
                        const userName = typeof member.userId === 'object' ? member.userId.name : 'Unknown';
                        const userEmail = typeof member.userId === 'object' ? member.userId.email : '';
                        return (
                          <tr key={idx} className="hover:bg-[var(--surface-elevated)] transition-colors">
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--foreground)]">
                              <p className="font-medium">{userName}</p>
                            </td>
                            <td className="whitespace-nowrap px-6 py-4 text-sm text-[var(--text-secondary)]">
                              <span className="rounded-full bg-[var(--accent)]/20 px-3 py-1 text-xs font-medium text-[var(--accent)]">
                                {formatPermission(member.permission)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                              {member.permissions && member.permissions.length > 0 ? (
                                <span className="text-xs">
                                  {member.permissions.map((p) => formatProjectPermission(p as ProjectPermission)).join(', ')}
                                </span>
                              ) : (
                                <span className="text-xs text-[var(--text-muted)]">None</span>
                              )}
                            </td>
                            {canManageMembers && (
                              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-3">
                                  <button
                                    onClick={() =>
                                      setEditingMember({
                                        userId,
                                        name: userName,
                                        email: userEmail,
                                        permission: member.permission,
                                        permissions: (member.permissions ?? []) as ProjectPermission[],
                                      })
                                    }
                                    className="text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleRemoveMember(userId)}
                                    className="text-[var(--error)] hover:text-[#F85149] transition-colors"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
        </div>
      </div>

      {editingMember && (
        <EditProjectMemberModal
          memberName={editingMember.name}
          memberEmail={editingMember.email}
          permission={editingMember.permission}
          capabilities={editingMember.permissions}
          grantablePermissions={grantablePermissions}
          onSave={(data) => handleUpdateMember(editingMember.userId, data)}
          onClose={() => setEditingMember(null)}
        />
      )}
    </>
  );
}
