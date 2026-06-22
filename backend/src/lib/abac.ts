import type { OrgRole } from '../models/OrgMember';
import type { IProject } from '../models/Project';
import OrgMember from '../models/OrgMember';
import {
  OrgPermission,
  ProjectPermission,
  ROLE_ORG_PERMISSIONS,
  getEffectiveOrgPermissions,
  getProjectCapabilitiesFromAccess,
  sanitizeOrgPermissions,
  sanitizeProjectPermissions,
} from './permissions';

export interface OrgMemberAttributes {
  role: OrgRole;
  permissions: OrgPermission[];
}

export interface InviteGrantContext {
  targetRole: Exclude<OrgRole, 'owner'>;
  targetPermissions: OrgPermission[];
}

export interface ProjectInviteGrantContext {
  accessLevel: 'read' | 'write';
  targetPermissions: ProjectPermission[];
}

const ROLE_RANK: Record<OrgRole, number> = {
  member: 1,
  admin: 2,
  owner: 3,
};

export async function getOrgMemberAttributes(
  userId: string,
  organizationId: string
): Promise<OrgMemberAttributes | null> {
  const member = await OrgMember.findOne({ organizationId, userId });
  if (!member) {
    return null;
  }
  return {
    role: member.role,
    permissions: sanitizeOrgPermissions(member.permissions),
  };
}

export function canGrantOrgRole(actorRole: OrgRole, targetRole: Exclude<OrgRole, 'owner'>): boolean {
  if (actorRole === 'owner') {
    return true;
  }
  if (actorRole === 'admin') {
    return targetRole === 'member' || targetRole === 'admin';
  }
  return targetRole === 'member';
}

export function canGrantOrgPermissions(
  actor: OrgMemberAttributes,
  grant: InviteGrantContext
): { allowed: boolean; reason?: string } {
  if (!canGrantOrgRole(actor.role, grant.targetRole)) {
    return { allowed: false, reason: 'You cannot assign this organization role' };
  }

  if (grant.targetRole === 'admin') {
    return { allowed: true };
  }

  const actorPermissions = getEffectiveOrgPermissions(actor.role, actor.permissions);
  for (const permission of grant.targetPermissions) {
    if (!actorPermissions.has(permission)) {
      return {
        allowed: false,
        reason: `You cannot grant permission "${permission}" because you do not have it`,
      };
    }
  }

  return { allowed: true };
}

export function canPerformOrgAction(
  actor: OrgMemberAttributes,
  action: OrgPermission
): boolean {
  const permissions = getEffectiveOrgPermissions(actor.role, actor.permissions);
  return permissions.has(action);
}

export function canInviteToOrganization(
  actor: OrgMemberAttributes,
  grant: InviteGrantContext
): { allowed: boolean; reason?: string } {
  if (!canPerformOrgAction(actor, 'org:invite')) {
    return { allowed: false, reason: 'You do not have permission to invite organization members' };
  }
  return canGrantOrgPermissions(actor, grant);
}

export function canManageOrgMember(
  actor: OrgMemberAttributes,
  targetRole: OrgRole
): boolean {
  if (!canPerformOrgAction(actor, 'org:manage_members')) {
    return false;
  }
  if (targetRole === 'owner') {
    return false;
  }
  if (actor.role === 'owner') {
    return true;
  }
  if (ROLE_RANK[actor.role] > ROLE_RANK[targetRole]) {
    return true;
  }
  // Members with explicit org:manage_members can manage peer members
  return actor.role === 'member' && targetRole === 'member';
}

export async function getProjectMemberAttributes(
  userId: string,
  project: IProject,
  orgRole: OrgRole | null
): Promise<{
  accessLevel: 'read' | 'write' | null;
  permissions: ProjectPermission[];
  isOwner: boolean;
  isOrgElevated: boolean;
}> {
  const isOwner = project.createdBy.toString() === userId;
  const isOrgElevated = orgRole === 'owner' || orgRole === 'admin';

  if (isOwner || isOrgElevated) {
    return {
      accessLevel: 'write',
      permissions: sanitizeProjectPermissions([]),
      isOwner,
      isOrgElevated,
    };
  }

  const member = project.members.find((m) => m.userId.toString() === userId);
  if (!member) {
    return { accessLevel: null, permissions: [], isOwner: false, isOrgElevated: false };
  }

  return {
    accessLevel: member.permission,
    permissions: sanitizeProjectPermissions(member.permissions),
    isOwner: false,
    isOrgElevated: false,
  };
}

export function hasProjectCapability(
  attributes: {
    accessLevel: 'read' | 'write' | null;
    permissions: ProjectPermission[];
    isOwner: boolean;
    isOrgElevated: boolean;
  },
  capability: ProjectPermission | 'project:read' | 'project:write'
): boolean {
  if (attributes.isOwner || attributes.isOrgElevated) {
    return true;
  }
  if (!attributes.accessLevel) {
    return false;
  }

  const capabilities = getProjectCapabilitiesFromAccess(attributes.accessLevel, attributes.permissions);
  return capabilities.has(capability);
}

export function canGrantProjectPermissions(
  actor: {
    accessLevel: 'read' | 'write' | null;
    permissions: ProjectPermission[];
    isOwner: boolean;
    isOrgElevated: boolean;
    orgRole: OrgRole | null;
  },
  grant: ProjectInviteGrantContext
): { allowed: boolean; reason?: string } {
  if (!hasProjectCapability(actor, 'project:invite')) {
    return { allowed: false, reason: 'You do not have permission to invite project members' };
  }

  if (grant.accessLevel === 'write' && !hasProjectCapability(actor, 'project:write')) {
    return { allowed: false, reason: 'You cannot grant write access to this project' };
  }

  const actorCapabilities = actor.isOwner || actor.isOrgElevated
    ? new Set(['project:read', 'project:write', ...grant.targetPermissions])
    : getProjectCapabilitiesFromAccess(actor.accessLevel ?? 'read', actor.permissions);

  for (const permission of grant.targetPermissions) {
    if (!actorCapabilities.has(permission)) {
      return {
        allowed: false,
        reason: `You cannot grant project permission "${permission}" because you do not have it`,
      };
    }
  }

  return { allowed: true };
}

export function canManageProjectMember(
  actor: {
    accessLevel: 'read' | 'write' | null;
    permissions: ProjectPermission[];
    isOwner: boolean;
    isOrgElevated: boolean;
  }
): boolean {
  return hasProjectCapability(actor, 'project:manage_members');
}
