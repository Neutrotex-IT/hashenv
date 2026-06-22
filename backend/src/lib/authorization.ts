import { Response, NextFunction } from 'express';
import Project, { IProject } from '../models/Project';
import Organization, { IOrganization } from '../models/Organization';
import OrgMember, { OrgRole } from '../models/OrgMember';
import { AuthRequest } from './auth';
import {
  canPerformOrgAction,
  getOrgMemberAttributes,
  getProjectMemberAttributes,
  hasProjectCapability,
} from './abac';
import { OrgPermission, ProjectPermission } from './permissions';

export type Permission = 'read' | 'write';

export interface AuthRequestWithOrg extends AuthRequest {
  organization?: IOrganization;
  orgRole?: OrgRole;
  orgPermissions?: OrgPermission[];
  project?: IProject;
}

/**
 * Get user's role in an organization
 */
export async function getUserOrgRole(
  userId: string,
  organizationId: string
): Promise<OrgRole | null> {
  const member = await OrgMember.findOne({ organizationId, userId });
  return member?.role ?? null;
}

async function loadOrganizationContext(
  req: AuthRequestWithOrg,
  orgId: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!req.user) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  if (!/^[0-9a-fA-F]{24}$/.test(orgId)) {
    return { ok: false, status: 400, error: 'Invalid organization ID format' };
  }

  const org = await Organization.findById(orgId);
  if (!org) {
    return { ok: false, status: 404, error: 'Organization not found' };
  }

  const attributes = await getOrgMemberAttributes(req.user.userId, orgId);
  if (!attributes) {
    return { ok: false, status: 403, error: 'Access denied: Not a member of this organization' };
  }

  req.organization = org;
  req.orgRole = attributes.role;
  req.orgPermissions = [...attributes.permissions];
  return { ok: true };
}

/**
 * Middleware to check if user is a member of an organization
 */
export function requireOrgMember(minRole: OrgRole = 'member') {
  const roleHierarchy: Record<OrgRole, number> = { member: 1, admin: 2, owner: 3 };

  return async (
    req: AuthRequestWithOrg,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orgId = req.params.orgId || req.params.organizationId;
      if (!orgId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const loaded = await loadOrganizationContext(req, orgId);
      if (!loaded.ok) {
        res.status(loaded.status).json({ error: loaded.error });
        return;
      }

      if (roleHierarchy[req.orgRole!] < roleHierarchy[minRole]) {
        res.status(403).json({ error: `Access denied: ${minRole} role required` });
        return;
      }

      next();
    } catch (error) {
      console.error('Org authorization error:', error instanceof Error ? error.message : 'Authorization error');
      res.status(500).json({ error: 'Authorization error' });
    }
  };
}

/**
 * Middleware requiring a specific organization-level ABAC permission.
 */
export function requireOrgPermission(permission: OrgPermission) {
  return async (
    req: AuthRequestWithOrg,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const orgId = req.params.orgId || req.params.organizationId;
      if (!orgId) {
        res.status(400).json({ error: 'Organization ID required' });
        return;
      }

      const loaded = await loadOrganizationContext(req, orgId);
      if (!loaded.ok) {
        res.status(loaded.status).json({ error: loaded.error });
        return;
      }

      const attributes = {
        role: req.orgRole!,
        permissions: req.orgPermissions ?? [],
      };

      if (!canPerformOrgAction(attributes, permission)) {
        res.status(403).json({ error: `Access denied: missing permission ${permission}` });
        return;
      }

      next();
    } catch (error) {
      console.error('Org permission error:', error instanceof Error ? error.message : 'Authorization error');
      res.status(500).json({ error: 'Authorization error' });
    }
  };
}

/**
 * Middleware to require organization owner
 */
export function requireOrgOwner() {
  return requireOrgMember('owner');
}

/**
 * Middleware to require organization admin or owner
 */
export function requireOrgAdmin() {
  return requireOrgMember('admin');
}

export const PERSONAL_ORG_COLLABORATION_ERROR =
  'Collaboration is not available for personal workspaces. Create a team organization to invite members.';

/**
 * Middleware requiring a team organization (not personal workspace).
 * Organization context must already be loaded on the request.
 */
export function requireTeamOrganization() {
  return (req: AuthRequestWithOrg, res: Response, next: NextFunction): void => {
    if (req.organization?.type === 'personal') {
      res.status(400).json({ error: PERSONAL_ORG_COLLABORATION_ERROR });
      return;
    }
    next();
  };
}

/**
 * Middleware requiring the project's organization to be a team org.
 */
export function requireTeamProject() {
  return async (
    req: AuthRequestWithOrg,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const projectId = req.params.projectId || req.params.id;
      if (!projectId) {
        res.status(400).json({ error: 'Project ID required' });
        return;
      }

      const loaded = await loadProjectContext(req, projectId);
      if (!loaded.ok) {
        res.status(loaded.status).json({ error: loaded.error });
        return;
      }

      const org = await Organization.findById(loaded.project.organizationId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      req.organization = org;
      if (org.type === 'personal') {
        res.status(400).json({ error: PERSONAL_ORG_COLLABORATION_ERROR });
        return;
      }

      next();
    } catch (error) {
      console.error('Team project check error:', error instanceof Error ? error.message : 'Authorization error');
      res.status(500).json({ error: 'Authorization error' });
    }
  };
}

/**
 * Check if a user is the owner/creator of a project
 */
export async function isProjectOwner(
  userId: string,
  project: IProject
): Promise<boolean> {
  return project.createdBy.toString() === userId;
}

async function loadProjectContext(
  req: AuthRequestWithOrg,
  projectId: string
): Promise<{ ok: true; project: IProject } | { ok: false; status: number; error: string }> {
  if (!req.user) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }

  if (!/^[0-9a-fA-F]{24}$/.test(projectId)) {
    return { ok: false, status: 400, error: 'Invalid project ID format' };
  }

  const project = await Project.findById(projectId);
  if (!project) {
    return { ok: false, status: 404, error: 'Project not found' };
  }

  const orgRole = await getUserOrgRole(req.user.userId, project.organizationId.toString());
  if (!orgRole) {
    return { ok: false, status: 403, error: 'Access denied: Not a member of project organization' };
  }

  req.project = project;
  req.orgRole = orgRole;
  return { ok: true, project };
}

/**
 * Check if user has access to a project
 */
export async function getUserProjectPermission(
  userId: string,
  projectId: string
): Promise<Permission | null> {
  const project = await Project.findById(projectId);

  if (!project) {
    return null;
  }

  const orgRole = await getUserOrgRole(userId, project.organizationId.toString());
  const attributes = await getProjectMemberAttributes(userId, project, orgRole);
  return attributes.accessLevel;
}

/**
 * Middleware to check if user has access to a project
 */
export function requireProjectAccess(requiredPermission: Permission = 'read') {
  return async (
    req: AuthRequestWithOrg,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const projectId = req.params.projectId || req.params.id;

      if (!projectId) {
        res.status(400).json({ error: 'Project ID required' });
        return;
      }

      const loaded = await loadProjectContext(req, projectId);
      if (!loaded.ok) {
        res.status(loaded.status).json({ error: loaded.error });
        return;
      }

      const attributes = await getProjectMemberAttributes(
        req.user!.userId,
        loaded.project,
        req.orgRole ?? null
      );

      const capability = requiredPermission === 'write' ? 'project:write' : 'project:read';
      if (!hasProjectCapability(attributes, capability)) {
        res.status(403).json({ error: `Access denied: ${requiredPermission} permission required` });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error instanceof Error ? error.message : 'Authorization error');
      res.status(500).json({ error: 'Authorization error' });
    }
  };
}

/**
 * Middleware requiring a project-level ABAC capability.
 */
export function requireProjectCapability(capability: ProjectPermission) {
  return async (
    req: AuthRequestWithOrg,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const projectId = req.params.projectId || req.params.id;

      if (!projectId) {
        res.status(400).json({ error: 'Project ID required' });
        return;
      }

      const loaded = await loadProjectContext(req, projectId);
      if (!loaded.ok) {
        res.status(loaded.status).json({ error: loaded.error });
        return;
      }

      const attributes = await getProjectMemberAttributes(
        req.user!.userId,
        loaded.project,
        req.orgRole ?? null
      );

      if (!hasProjectCapability(attributes, capability)) {
        res.status(403).json({ error: `Access denied: missing permission ${capability}` });
        return;
      }

      next();
    } catch (error) {
      console.error('Project capability error:', error instanceof Error ? error.message : 'Authorization error');
      res.status(500).json({ error: 'Authorization error' });
    }
  };
}

/**
 * Middleware to verify project member management rights.
 */
export function requireProjectMembershipManagement() {
  return requireProjectCapability('project:manage_members');
}

/**
 * Middleware to verify project invite rights.
 */
export function requireProjectInvitePermission() {
  return requireProjectCapability('project:invite');
}

/**
 * @deprecated Use requireProjectMembershipManagement or requireProjectInvitePermission
 */
export function requireProjectOwnership() {
  return requireProjectMembershipManagement();
}
