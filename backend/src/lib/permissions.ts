import type { OrgRole } from '../models/OrgMember';

/** Organization-level ABAC permissions (grantable to members beyond their base role). */
export const ORG_PERMISSIONS = {
  'org:invite': 'Invite members to the organization',
  'org:manage_members': 'Update or remove organization members',
  'org:revoke_invites': 'Revoke pending organization invites',
  'org:update': 'Update organization settings',
  'org:audit': 'View organization audit logs',
  'org:create_project': 'Create new projects',
} as const;

export type OrgPermission = keyof typeof ORG_PERMISSIONS;

/** Project-level ABAC permissions (grantable per project member). */
export const PROJECT_PERMISSIONS = {
  'project:invite': 'Invite members to the project',
  'project:manage_members': 'Manage project members and permissions',
  'project:manage_tokens': 'Manage project API tokens',
} as const;

export type ProjectPermission = keyof typeof PROJECT_PERMISSIONS;

export const ALL_ORG_PERMISSIONS = Object.keys(ORG_PERMISSIONS) as OrgPermission[];
export const ALL_PROJECT_PERMISSIONS = Object.keys(PROJECT_PERMISSIONS) as ProjectPermission[];

const MEMBER_DEFAULT_PERMISSIONS: OrgPermission[] = ['org:create_project'];

const ADMIN_PERMISSIONS: OrgPermission[] = [...ALL_ORG_PERMISSIONS];

const OWNER_PERMISSIONS: OrgPermission[] = [...ALL_ORG_PERMISSIONS];

/** Permissions implicitly granted by org role (before custom grants). */
export const ROLE_ORG_PERMISSIONS: Record<OrgRole, OrgPermission[]> = {
  owner: OWNER_PERMISSIONS,
  admin: ADMIN_PERMISSIONS,
  member: MEMBER_DEFAULT_PERMISSIONS,
};

/** Project owners and org admins always receive these project capabilities. */
export const IMPLICIT_FULL_PROJECT_PERMISSIONS: ProjectPermission[] = [...ALL_PROJECT_PERMISSIONS];

export function isOrgPermission(value: string): value is OrgPermission {
  return value in ORG_PERMISSIONS;
}

export function isProjectPermission(value: string): value is ProjectPermission {
  return value in PROJECT_PERMISSIONS;
}

export function sanitizeOrgPermissions(permissions: unknown): OrgPermission[] {
  if (!Array.isArray(permissions)) {
    return [];
  }
  return [...new Set(permissions.filter((p): p is OrgPermission => typeof p === 'string' && isOrgPermission(p)))];
}

export function sanitizeProjectPermissions(permissions: unknown): ProjectPermission[] {
  if (!Array.isArray(permissions)) {
    return [];
  }
  return [
    ...new Set(permissions.filter((p): p is ProjectPermission => typeof p === 'string' && isProjectPermission(p))),
  ];
}

export function getEffectiveOrgPermissions(
  role: OrgRole,
  customPermissions: OrgPermission[] = []
): Set<OrgPermission> {
  const fromRole = ROLE_ORG_PERMISSIONS[role];
  if (role === 'owner' || role === 'admin') {
    return new Set(fromRole);
  }
  return new Set([...fromRole, ...customPermissions]);
}

export function getProjectCapabilitiesFromAccess(
  accessLevel: 'read' | 'write',
  customPermissions: ProjectPermission[] = []
): Set<ProjectPermission | 'project:read' | 'project:write'> {
  const base = new Set<ProjectPermission | 'project:read' | 'project:write'>(['project:read']);
  if (accessLevel === 'write') {
    base.add('project:write');
  }
  for (const permission of customPermissions) {
    base.add(permission);
  }
  return base;
}

export function formatOrgPermissionLabel(permission: OrgPermission): string {
  return ORG_PERMISSIONS[permission];
}

export function formatProjectPermissionLabel(permission: ProjectPermission): string {
  return PROJECT_PERMISSIONS[permission];
}
