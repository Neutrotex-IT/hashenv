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
  'org:configure_panic': 'Configure organization panic button settings',
} as const;

export type OrgPermission = keyof typeof ORG_PERMISSIONS;

export const PROJECT_PERMISSIONS = {
  'project:invite': 'Invite members to the project',
  'project:manage_members': 'Manage project members and permissions',
  'project:manage_tokens': 'Manage project API tokens',
  'project:export': 'Export project environment data',
  'project:panic': 'Run panic button actions on this project',
} as const;

export type ProjectPermission = keyof typeof PROJECT_PERMISSIONS;

export const ALL_ORG_PERMISSIONS = Object.keys(ORG_PERMISSIONS) as OrgPermission[];
export const ALL_PROJECT_PERMISSIONS = Object.keys(PROJECT_PERMISSIONS) as ProjectPermission[];

const ROLE_ORG_PERMISSIONS: Record<'owner' | 'admin' | 'member', OrgPermission[]> = {
  owner: [...ALL_ORG_PERMISSIONS],
  admin: [...ALL_ORG_PERMISSIONS],
  member: [],
};

export function getEffectiveOrgPermissions(
  role: 'owner' | 'admin' | 'member',
  customPermissions: OrgPermission[] = []
): OrgPermission[] {
  if (role === 'owner' || role === 'admin') {
    return ROLE_ORG_PERMISSIONS[role];
  }
  return [...new Set(customPermissions)];
}

export function hasOrgPermission(
  role: 'owner' | 'admin' | 'member',
  customPermissions: OrgPermission[],
  permission: OrgPermission
): boolean {
  return getEffectiveOrgPermissions(role, customPermissions).includes(permission);
}

export function canCreateProject(
  role: 'owner' | 'admin' | 'member',
  customPermissions: OrgPermission[] = []
): boolean {
  return hasOrgPermission(role, customPermissions, 'org:create_project');
}

export function canAccessOrgMembers(
  role: 'owner' | 'admin' | 'member',
  customPermissions: OrgPermission[] = []
): boolean {
  return (
    hasOrgPermission(role, customPermissions, 'org:invite') ||
    hasOrgPermission(role, customPermissions, 'org:manage_members') ||
    hasOrgPermission(role, customPermissions, 'org:revoke_invites')
  );
}

export function hasProjectCapability(
  effectivePermissions: string[],
  capability: ProjectPermission | 'project:read' | 'project:write'
): boolean {
  return effectivePermissions.includes(capability);
}

export function canReadProject(effectivePermissions: string[]): boolean {
  return hasProjectCapability(effectivePermissions, 'project:read');
}

export function canWriteProject(effectivePermissions: string[]): boolean {
  return hasProjectCapability(effectivePermissions, 'project:write');
}

export function canManageProjectTokens(effectivePermissions: string[]): boolean {
  return hasProjectCapability(effectivePermissions, 'project:manage_tokens');
}

export function canExportProject(effectivePermissions: string[]): boolean {
  return hasProjectCapability(effectivePermissions, 'project:export');
}

export function canRunProjectPanic(effectivePermissions: string[]): boolean {
  return hasProjectCapability(effectivePermissions, 'project:panic');
}

export function canConfigureOrgPanic(
  role: 'owner' | 'admin' | 'member',
  customPermissions: OrgPermission[] = []
): boolean {
  return hasOrgPermission(role, customPermissions, 'org:configure_panic');
}

export function canAccessProjectMembers(effectivePermissions: string[]): boolean {
  return (
    hasProjectCapability(effectivePermissions, 'project:invite') ||
    hasProjectCapability(effectivePermissions, 'project:manage_members')
  );
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
