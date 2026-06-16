'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { projectsAPI, OrgMember, ProjectInvite, ProjectPermissionsResponse } from '@/lib/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { Button } from '@/components/ui/Button';
import { OrgMemberSelect } from '@/components/ui/OrgMemberSelect';
import { ProjectPermissionPicker } from '@/components/ui/PermissionPicker';
import { EditProjectMemberModal } from '@/components/ui/EditProjectMemberModal';
import { EffectivePermissionsPanel } from '@/components/ui/EffectivePermissionsPanel';
import { formatPermission, formatProjectPermission, ProjectPermission } from '@/lib/permissions';
import { SkeletonCard, Skeleton } from '@/components/ui/Skeleton';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';

interface Project {
  _id: string;
  name: string;
  organizationId: string | { _id: string };
  members: Array<{
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    permission: 'read' | 'write';
    permissions?: string[];
  }>;
}

export default function ManageMembersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<Project | null>(null);
  const [permissionInfo, setPermissionInfo] = useState<ProjectPermissionsResponse | null>(null);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [selectedMember, setSelectedMember] = useState<OrgMember | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<'read' | 'write'>('read');
  const [selectedCapabilities, setSelectedCapabilities] = useState<ProjectPermission[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePermission, setInvitePermission] = useState<'read' | 'write'>('read');
  const [inviteCapabilities, setInviteCapabilities] = useState<ProjectPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editingMember, setEditingMember] = useState<{
    userId: string;
    name: string;
    email: string;
    permission: 'read' | 'write';
    permissions: ProjectPermission[];
  } | null>(null);

  const { confirm } = useConfirm();
  const { success: toastSuccess } = useToast();

  const grantablePermissions = (permissionInfo?.grantable ?? []) as ProjectPermission[];
  const canInvite = permissionInfo?.effective.includes('project:invite') ?? false;
  const canManageMembers = permissionInfo?.effective.includes('project:manage_members') ?? false;

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectData, permissionsData] = await Promise.all([
        projectsAPI.get(projectId),
        projectsAPI.getPermissions(projectId),
      ]);
      setProject(projectData);
      setPermissionInfo(permissionsData);

      if (permissionsData.effective.includes('project:invite')) {
        const invitesData = await projectsAPI.getInvites(projectId);
        setInvites(invitesData);
      } else {
        setInvites([]);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
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

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSubmitting(true);
    setError('');

    try {
      await projectsAPI.inviteMember(projectId, {
        email: inviteEmail,
        permission: invitePermission,
        permissions: inviteCapabilities,
      });
      setInviteEmail('');
      setInvitePermission('read');
      setInviteCapabilities([]);
      await loadData();
      toastSuccess('Invitation sent');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviteSubmitting(false);
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

  if (loading) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <div className="p-6 lg:p-8">
            <Skeleton variant="rectangular" height={48} width="40%" className="mb-6" />
            <SkeletonCard className="mb-6" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <AuthenticatedLayout>
          <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
              <p className="text-[var(--error)] mb-4">Project not found</p>
              <Button variant="primary" size="md" asLink href="/dashboard">
                Back to Dashboard
              </Button>
            </div>
          </div>
        </AuthenticatedLayout>
      </ProtectedRoute>
    );
  }

  const orgId =
    typeof project.organizationId === 'string' ? project.organizationId : project.organizationId._id;

  const memberUserIds = project.members.map((m) =>
    typeof m.userId === 'object' ? m.userId._id : m.userId
  );

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6">
              <Link
                href={`/projects/${projectId}`}
                className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block mb-4"
              >
                ← Back to Project
              </Link>
              <h1 className="text-3xl font-bold text-[var(--foreground)]">
                Manage Members - {project.name}
              </h1>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                Add organization members directly or invite by email with granular project permissions.
              </p>
              <Link
                href={`/organizations/${orgId}/members`}
                className="mt-2 inline-block text-sm text-[var(--accent)] hover:text-[var(--accent-hover)]"
              >
                Manage organization invites →
              </Link>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-[var(--error)]/50 bg-[var(--error)]/10 p-4">
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

            {canInvite && (
              <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Invite by Email</h2>
                <form onSubmit={handleInviteByEmail} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Email address</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                      placeholder="colleague@company.com"
                      className="block w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-[var(--foreground)] shadow-sm focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
                    />
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      The invitee must already be a member of the organization.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Access level</label>
                    <select
                      value={invitePermission}
                      onChange={(e) => setInvitePermission(e.target.value as 'read' | 'write')}
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
                      selected={inviteCapabilities}
                      onChange={setInviteCapabilities}
                    />
                  </div>
                  <div className="flex justify-end pt-4 border-t border-[var(--border)]">
                    <Button variant="primary" size="md" type="submit" disabled={inviteSubmitting}>
                      {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
                    </Button>
                  </div>
                </form>
              </div>
            )}

            {canInvite && invites.length > 0 && (
              <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
                <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Pending Invitations</h2>
                <div className="space-y-3">
                  {invites.map((invite) => (
                    <div key={invite.id} className="flex items-center justify-between rounded-md border border-[var(--border)] px-4 py-3">
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
                      {canManageMembers && (
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

            {canInvite && (
              <div className="mb-8 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
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
            )}

            <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">Current Members</h2>
              {project.members.length === 0 ? (
                <p className="text-[var(--text-muted)] text-center py-4">No members added yet.</p>
              ) : (
                <div className="overflow-hidden rounded-lg border border-[var(--border)]">
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
      </AuthenticatedLayout>

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
    </ProtectedRoute>
  );
}
