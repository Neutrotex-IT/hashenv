/**
 * ABAC permission catalog mirrored from the backend.
 */

export type Permission = 'read' | 'write';

export const ORG_PERMISSIONS = {
  'org:invite': 'Invite members to the organization',
  'org:manage_members': 'Update or remove organization members',
  'org:revoke_invites': 'Revoke pending organization invites',
  'org:update': 'Update organization settings',
  'org:audit': 'View organization audit logs',
  'org:create_project': 'Create new projects',
} as const;

export type OrgPermission = keyof typeof ORG_PERMISSIONS;

export const PROJECT_PERMISSIONS = {
  'project:invite': 'Invite members to the project',
  'project:manage_members': 'Manage project members and permissions',
  'project:manage_tokens': 'Manage project API tokens',
} as const;

export type ProjectPermission = keyof typeof PROJECT_PERMISSIONS;

export const ALL_ORG_PERMISSIONS = Object.keys(ORG_PERMISSIONS) as OrgPermission[];
export const ALL_PROJECT_PERMISSIONS = Object.keys(PROJECT_PERMISSIONS) as ProjectPermission[];

const ROLE_ORG_PERMISSIONS: Record<'owner' | 'admin' | 'member', OrgPermission[]> = {
  owner: [...ALL_ORG_PERMISSIONS],
  admin: [...ALL_ORG_PERMISSIONS],
  member: ['org:create_project'],
};

export function getEffectiveOrgPermissions(
  role: 'owner' | 'admin' | 'member',
  customPermissions: OrgPermission[] = []
): OrgPermission[] {
  if (role === 'owner' || role === 'admin') {
    return ROLE_ORG_PERMISSIONS[role];
  }
  return [...new Set([...ROLE_ORG_PERMISSIONS.member, ...customPermissions])];
}

export function hasOrgPermission(
  role: 'owner' | 'admin' | 'member',
  customPermissions: OrgPermission[],
  permission: OrgPermission
): boolean {
  return getEffectiveOrgPermissions(role, customPermissions).includes(permission);
}

export function formatPermission(permission: Permission): string {
  return permission === 'read' ? 'Read Only' : 'Read/Write';
}

export function getPermissionLabel(value: Permission): string {
  return formatPermission(value);
}

export function formatOrgPermission(permission: OrgPermission): string {
  return ORG_PERMISSIONS[permission];
}

export function formatProjectPermission(permission: ProjectPermission): string {
  return PROJECT_PERMISSIONS[permission];
}
