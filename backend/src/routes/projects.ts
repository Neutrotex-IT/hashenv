import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Project, { IProject } from '../models/Project';
import Organization from '../models/Organization';
import ProjectInvite from '../models/ProjectInvite';
import User from '../models/User';
import OrgMember from '../models/OrgMember';
import type { OrgRole } from '../models/OrgMember';
import { authenticate, AuthRequest } from '../lib/auth';
import {
  requireProjectAccess,
  requireProjectCapability,
  requireProjectInvitePermission,
  requireProjectMembershipManagement,
  requireTeamProject,
  Permission,
  AuthRequestWithOrg,
  getUserOrgRole,
  isProjectOwner,
} from '../lib/authorization';
import { validateProjectId, validateUserId, validateProjectName, validatePermission, isValidObjectId } from '../middleware/validation';
import { uploadRateLimiter } from '../middleware/security';
import { createProjectEncryptionKey, deleteProjectEncryptionKey } from '../crypto';
import { revokeApiTokensForUser } from '../lib/apiTokenLifecycle';
import {
  canGrantProjectPermissions,
  getProjectMemberAttributes,
  canPerformOrgAction,
  getOrgMemberAttributes,
  hasProjectCapability,
} from '../lib/abac';
import {
  ALL_PROJECT_PERMISSIONS,
  PROJECT_PERMISSIONS,
  ProjectPermission,
  getProjectCapabilitiesFromAccess,
  sanitizeProjectPermissions,
} from '../lib/permissions';

const TEAM_PROJECT_COLLABORATION_PERMISSIONS = new Set<ProjectPermission>([
  'project:invite',
  'project:manage_members',
]);

function withoutProjectCollaborationPermissions<T extends string>(
  orgType: string,
  permissions: T[]
): T[] {
  if (orgType !== 'personal') {
    return permissions;
  }
  return permissions.filter(
    (permission) => !TEAM_PROJECT_COLLABORATION_PERMISSIONS.has(permission as ProjectPermission)
  );
}

function computeEffectiveProjectPermissions(
  project: IProject,
  userId: string,
  orgRole: OrgRole | null,
  orgType: string
): string[] {
  const isOwner = project.createdBy.toString() === userId;
  const isOrgElevated = orgRole === 'owner' || orgRole === 'admin';

  if (isOwner || isOrgElevated) {
    return withoutProjectCollaborationPermissions(orgType, [
      'project:read',
      'project:write',
      ...ALL_PROJECT_PERMISSIONS,
    ]);
  }

  const member = project.members.find((m) => m.userId.toString() === userId);
  if (!member) {
    return [];
  }

  return withoutProjectCollaborationPermissions(
    orgType,
    [...getProjectCapabilitiesFromAccess(member.permission, sanitizeProjectPermissions(member.permissions))]
  );
}
import { createAndSendProjectInvite } from '../lib/projectInvite';
import { auditProject, auditMember, audit } from '../lib/audit';
import { assertEnvAllowed, getProjectEnvironments } from '../lib/environments';
import multer from 'multer';
import {
  buildProjectExport,
  countExportableItems,
  parseImportPayload,
  importProjectPayload,
} from '../lib/dataTransfer';
import EnvFile from '../models/EnvFile';
import Secret from '../models/Secret';
import AssociatedAccount from '../models/AssociatedAccount';
import { ProjectApiToken } from '../models/ProjectApiToken';
import AuditLog from '../models/AuditLog';

const router = express.Router();

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

/**
 * Get all projects for user's organizations
 * GET /api/projects?orgId=xxx (optional filter by org)
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const { orgId } = req.query;
    
    // Get all organizations the user is a member of
    const memberships = await OrgMember.find({ userId: req.user.userId });
    const userOrgIds = memberships.map(m => m.organizationId.toString());
    
    // When filtering by org, require current org membership
    if (orgId) {
      if (!isValidObjectId(orgId as string)) {
        res.status(400).json({ error: 'Invalid organization ID format' });
        return;
      }
      if (!userOrgIds.includes(orgId as string)) {
        res.status(403).json({ error: 'Access denied: Not a member of this organization' });
        return;
      }
    }
    
    // Build query - filter by specific org or all user's orgs
    const orgQuery = orgId && isValidObjectId(orgId as string)
      ? { organizationId: orgId }
      : { organizationId: { $in: userOrgIds } };
    const orgRoleByOrgId = new Map(
      memberships.map((m) => [m.organizationId.toString(), m.role as OrgRole])
    );
    
    // Within accessible orgs, show projects user owns or is a member of
    const projects = await Project.find({
      ...orgQuery,
      $or: [
        { createdBy: req.user.userId },
        { 'members.userId': req.user.userId },
      ],
    })
      .populate('createdBy', 'name email')
      .populate('members.userId', 'name email')
      .populate('organizationId', 'name slug type')
      .sort({ createdAt: -1 });
    
    const enriched = projects.map((project) => {
      const plain = project.toObject();
      const orgRef = plain.organizationId as { _id?: { toString(): string }; type?: string } | string;
      const orgIdStr =
        typeof orgRef === 'object' && orgRef !== null && '_id' in orgRef
          ? orgRef._id!.toString()
          : String(orgRef);
      const orgType =
        typeof orgRef === 'object' && orgRef !== null && 'type' in orgRef
          ? (orgRef.type ?? 'team')
          : 'team';
      const orgRole = orgRoleByOrgId.get(orgIdStr) ?? null;

      return {
        ...plain,
        environmentSlugs: getProjectEnvironments(project),
        effectivePermissions: computeEffectiveProjectPermissions(
          project,
          req.user!.userId,
          orgRole,
          orgType
        ),
      };
    });
    
    res.json(enriched);
  } catch (error) {
    console.error('Get projects error:', error instanceof Error ? error.message : 'Failed to fetch projects');
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * Get a single project by ID
 * GET /api/projects/:id
 */
router.get(
  '/:id',
  authenticate,
  validateProjectId(), // Security: Validate ObjectId format
  requireProjectAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.id;
      
      // Additional validation
      if (!isValidObjectId(projectId)) {
        res.status(400).json({ error: 'Invalid project ID format' });
        return;
      }
      
      const project = await Project.findById(projectId)
        .populate('createdBy', 'name email')
        .populate('members.userId', 'name email');
      
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }
      
      res.json(project);
    } catch (error) {
      console.error('Get project error:', error instanceof Error ? error.message : 'Failed to fetch project');
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  }
);

/**
 * Unified project activity feed across resource types
 * GET /api/projects/:id/activity?environment=dev&resourceType=env
 */
router.get(
  '/:id/activity',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  [
    query('environment').optional().isString().trim(),
    query('resourceType')
      .optional()
      .isIn(['env', 'secret', 'account', 'project', 'api_token', 'member'])
      .withMessage('Invalid resource type'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.id;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string | undefined;
      const resourceTypeParam = req.query.resourceType as string | undefined;

      const activityTypes = ['env', 'secret', 'account', 'project', 'api_token', 'member'] as const;
      const allowedTypes = resourceTypeParam ? [resourceTypeParam] : [...activityTypes];

      let logQuery: Record<string, unknown>;

      if (environmentParam) {
        let envSlug: string;
        try {
          envSlug = assertEnvAllowed(project, environmentParam);
        } catch (err) {
          res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
          return;
        }

        const nonEnvTypes = allowedTypes.filter((t) => t !== 'env');
        logQuery = {
          projectId,
          $or: [
            ...(nonEnvTypes.length > 0 ? [{ resourceType: { $in: nonEnvTypes } }] : []),
            ...(allowedTypes.includes('env')
              ? [{ resourceType: 'env', 'metadata.environment': envSlug }]
              : []),
          ],
        };
        if ((logQuery.$or as unknown[]).length === 0) {
          res.json([]);
          return;
        }
      } else {
        logQuery = {
          projectId,
          resourceType: { $in: allowedTypes },
        };
      }

      const logs = await AuditLog.find(logQuery)
        .sort({ createdAt: -1 })
        .limit(1000);

      res.json(logs);
    } catch (error) {
      console.error('Get project activity error:', error instanceof Error ? error.message : 'Failed to fetch activity');
      res.status(500).json({ error: 'Failed to fetch project activity' });
    }
  }
);

/**
 * Create a new project (must be org member)
 * POST /api/projects
 */
router.post(
  '/',
  authenticate,
  [
    validateProjectName(),
    body('organizationId')
      .notEmpty()
      .withMessage('Organization ID is required')
      .custom((value) => {
        if (!isValidObjectId(value)) {
          throw new Error('Invalid organization ID format');
        }
        return true;
      }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      
      const { name, organizationId } = req.body;

      const memberAttributes = await getOrgMemberAttributes(req.user.userId, organizationId);
      if (!memberAttributes) {
        res.status(403).json({ error: 'Access denied: Not a member of this organization' });
        return;
      }

      if (!canPerformOrgAction(memberAttributes, 'org:create_project')) {
        res.status(403).json({ error: 'Access denied: missing permission org:create_project' });
        return;
      }
      
      const project = await Project.create({
        name,
        organizationId,
        createdBy: req.user.userId,
        members: [],
      });
      
      // Create encryption key for the project
      await createProjectEncryptionKey(project._id.toString(), organizationId);
      
      const populatedProject = await Project.findById(project._id)
        .populate('createdBy', 'name email')
        .populate('organizationId', 'name slug type');
      
      res.status(201).json(populatedProject);
    } catch (error) {
      console.error('Create project error:', error instanceof Error ? error.message : 'Failed to create project');
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

/**
 * Get project ABAC permissions for the current user
 * GET /api/projects/:id/permissions
 */
router.get(
  '/:id/permissions',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const project = req.project!;
      const org = await Organization.findById(project.organizationId);
      const orgType = org?.type ?? 'team';
      const attributes = await getProjectMemberAttributes(
        req.user!.userId,
        project,
        req.orgRole ?? null
      );

      const effective = withoutProjectCollaborationPermissions(
        orgType,
        attributes.isOwner || attributes.isOrgElevated
          ? ['project:read', 'project:write', ...ALL_PROJECT_PERMISSIONS]
          : [...getProjectCapabilitiesFromAccess(attributes.accessLevel ?? 'read', attributes.permissions)]
      );

      res.json({
        catalog: {
          project: PROJECT_PERMISSIONS,
        },
        effective,
        grantable: withoutProjectCollaborationPermissions(
          orgType,
          attributes.isOwner || attributes.isOrgElevated
            ? ALL_PROJECT_PERMISSIONS
            : ALL_PROJECT_PERMISSIONS.filter((permission) =>
                getProjectCapabilitiesFromAccess(attributes.accessLevel ?? 'read', attributes.permissions).has(permission)
              )
        ),
      });
    } catch (error) {
      console.error('Get project permissions error:', error instanceof Error ? error.message : 'Failed to fetch permissions');
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }
);

/**
 * Add a user to a project (requires project:invite)
 * POST /api/projects/:id/members
 */
router.post(
  '/:id/members',
  authenticate,
  validateProjectId(),
  requireTeamProject(),
  requireProjectInvitePermission(),
  [
    body('userId')
      .notEmpty()
      .withMessage('User ID is required')
      .custom((value) => {
        if (!isValidObjectId(value)) {
          throw new Error('Invalid user ID format');
        }
        return true;
      }),
    validatePermission(),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.id;
      const { userId, permission } = req.body;
      const memberPermissions = sanitizeProjectPermissions(req.body.permissions);

      const project = (req as AuthRequestWithOrg).project as IProject;
      const inviterContext = await getProjectMemberAttributes(
        req.user!.userId,
        project,
        (req as AuthRequestWithOrg).orgRole ?? null
      );

      const grantCheck = canGrantProjectPermissions(
        { ...inviterContext, orgRole: (req as AuthRequestWithOrg).orgRole ?? null },
        { accessLevel: permission, targetPermissions: memberPermissions }
      );
      if (!grantCheck.allowed) {
        res.status(403).json({ error: grantCheck.reason || 'Invalid permission grant' });
        return;
      }

      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const orgMember = await OrgMember.findOne({
        organizationId: project.organizationId,
        userId,
      });
      if (!orgMember) {
        res.status(400).json({ error: 'User must be a member of the organization before being added to the project' });
        return;
      }

      const existingMemberIndex = project.members.findIndex(
        (m) => m.userId.toString() === userId
      );

      if (existingMemberIndex >= 0) {
        project.members[existingMemberIndex].permission = permission as Permission;
        project.members[existingMemberIndex].permissions = memberPermissions;
      } else {
        project.members.push({
          userId: user._id as mongoose.Types.ObjectId,
          permission: permission as Permission,
          permissions: memberPermissions,
        });
      }

      await project.save();

      await auditMember(
        projectId,
        req.user!.userId,
        existingMemberIndex >= 0 ? 'update' : 'add',
        userId,
        {
          email: user.email,
          permission: permission as Permission,
          permissions: memberPermissions,
        },
        req
      );

      const populatedProject = await Project.findById(projectId)
        .populate('createdBy', 'name email')
        .populate('members.userId', 'name email');

      res.json(populatedProject);
    } catch (error) {
      console.error('Add member error:', error instanceof Error ? error.message : 'Failed to add member');
      res.status(500).json({ error: 'Failed to add member' });
    }
  }
);

/**
 * Update a project member's permission and ABAC capabilities (requires project:manage_members)
 * PATCH /api/projects/:id/members/:userId
 */
router.patch(
  '/:id/members/:userId',
  authenticate,
  validateProjectId(),
  validateUserId(),
  requireTeamProject(),
  requireProjectMembershipManagement(),
  [
    body('permission')
      .optional()
      .isIn(['read', 'write'])
      .withMessage('Permission must be "read" or "write"'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.id;
      const userId = req.params.userId;
      const nextPermission = req.body.permission as Permission | undefined;
      const nextPermissions = req.body.permissions
        ? sanitizeProjectPermissions(req.body.permissions)
        : undefined;

      if (!nextPermission && !nextPermissions) {
        res.status(400).json({ error: 'Provide permission and/or permissions to update' });
        return;
      }

      if (!isValidObjectId(userId)) {
        res.status(400).json({ error: 'Invalid user ID format' });
        return;
      }

      const project = (req as AuthRequestWithOrg).project as IProject;

      if (project.createdBy.toString() === userId) {
        res.status(403).json({ error: 'Cannot change project owner access' });
        return;
      }

      const memberIndex = project.members.findIndex((m) => m.userId.toString() === userId);
      if (memberIndex < 0) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      const actorContext = await getProjectMemberAttributes(
        req.user!.userId,
        project,
        (req as AuthRequestWithOrg).orgRole ?? null
      );

      const targetPermission = nextPermission ?? project.members[memberIndex].permission;
      const targetPermissions = nextPermissions ?? project.members[memberIndex].permissions;

      const grantCheck = canGrantProjectPermissions(
        { ...actorContext, orgRole: (req as AuthRequestWithOrg).orgRole ?? null },
        { accessLevel: targetPermission, targetPermissions }
      );
      if (!grantCheck.allowed) {
        res.status(403).json({ error: grantCheck.reason || 'Invalid permission grant' });
        return;
      }

      if (nextPermission) {
        project.members[memberIndex].permission = nextPermission;
      }
      if (nextPermissions) {
        project.members[memberIndex].permissions = nextPermissions;
      }

      await project.save();

      const targetUser = await User.findById(userId).select('email');
      await auditMember(
        projectId,
        req.user!.userId,
        'update',
        userId,
        {
          email: targetUser?.email,
          permission: project.members[memberIndex].permission,
          permissions: project.members[memberIndex].permissions,
        },
        req
      );

      const populatedProject = await Project.findById(projectId)
        .populate('createdBy', 'name email')
        .populate('members.userId', 'name email');

      res.json(populatedProject);
    } catch (error) {
      console.error('Update member error:', error instanceof Error ? error.message : 'Failed to update member');
      res.status(500).json({ error: 'Failed to update member' });
    }
  }
);

/**
 * Remove a user from a project (requires project:manage_members)
 * DELETE /api/projects/:id/members/:userId
 */
router.delete(
  '/:id/members/:userId',
  authenticate,
  validateProjectId(),
  validateUserId(),
  requireTeamProject(),
  requireProjectMembershipManagement(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userId = req.params.userId;
      
      // Additional validation
      if (!isValidObjectId(userId)) {
        res.status(400).json({ error: 'Invalid user ID format' });
        return;
      }
      
      const project = (req as AuthRequestWithOrg).project as IProject;
      const projectId = project._id.toString();

      const removedMember = project.members.find((m) => m.userId.toString() === userId);
      const removedUser = removedMember
        ? await User.findById(userId).select('email')
        : null;

      // Remove member
      project.members = project.members.filter(
        (m) => m.userId.toString() !== userId
      );

      await project.save();

      await revokeApiTokensForUser(userId, [project._id]);

      if (removedMember) {
        await auditMember(
          projectId,
          req.user!.userId,
          'remove',
          userId,
          {
            email: removedUser?.email,
            permission: removedMember.permission,
            permissions: removedMember.permissions,
          },
          req
        );
      }

      const populatedProject = await Project.findById(req.params.id)
        .populate('createdBy', 'name email')
        .populate('members.userId', 'name email');
      
      res.json(populatedProject);
    } catch (error) {
      console.error('Remove member error:', error instanceof Error ? error.message : 'Failed to remove member');
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
);

/**
 * Search users within an organization (for project owners to add as collaborators)
 * GET /api/projects/users/search?q=searchterm&orgId=xxx
 */
router.get(
  '/users/search',
  authenticate,
  [
    query('q')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('orgId')
      .notEmpty()
      .withMessage('Organization ID is required')
      .custom((value) => {
        if (!isValidObjectId(value)) {
          throw new Error('Invalid organization ID format');
        }
        return true;
      }),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      
      const searchQuery = (req.query.q as string || '').trim();
      const orgId = req.query.orgId as string;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

      const org = await Organization.findById(orgId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }
      if (org.type === 'personal') {
        res.status(400).json({ error: 'Collaboration is not available for personal workspaces.' });
        return;
      }
      
      // Verify user is a member of the organization
      const orgRole = await getUserOrgRole(req.user.userId, orgId);
      if (!orgRole) {
        res.status(403).json({ error: 'Access denied: Not a member of this organization' });
        return;
      }
      
      // Get all members of the organization
      const orgMembers = await OrgMember.find({ organizationId: orgId }).select('userId');
      const memberUserIds = orgMembers.map(m => m.userId);
      
      // Build search filter
      const filter: any = { _id: { $in: memberUserIds } };
      
      if (searchQuery.length > 0) {
        const searchRegex = new RegExp(searchQuery, 'i');
        filter.$or = [
          { name: searchRegex },
          { username: searchRegex },
          { email: searchRegex },
        ];
      }
      
      const users = await User.find(filter)
        .select('-password')
        .limit(limit)
        .sort({ name: 1 });

      res.json(users);
    } catch (error) {
      console.error('Search users error:', error instanceof Error ? error.message : 'Failed to search users');
      res.status(500).json({ error: 'Failed to search users' });
    }
  }
);

/**
 * Send a project invite by email (requires project:invite)
 * POST /api/projects/:id/invites
 */
router.post(
  '/:id/invites',
  authenticate,
  validateProjectId(),
  requireTeamProject(),
  requireProjectInvitePermission(),
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format'),
    validatePermission(),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    res.status(400).json({
      error:
        'Project email invites are not available yet. Invite people to the organization first, then add them to the project from the members page.',
    });
  }
);

/**
 * List pending project invites (requires project:invite)
 * GET /api/projects/:id/invites
 */
router.get(
  '/:id/invites',
  authenticate,
  validateProjectId(),
  requireTeamProject(),
  requireProjectInvitePermission(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const invites = await ProjectInvite.find({
        projectId: req.params.id,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 });

      res.json(
        invites.map((invite) => ({
          id: invite._id,
          email: invite.email,
          permission: invite.permission,
          permissions: invite.permissions,
          status: invite.status,
          expiresAt: invite.expiresAt,
          invitedBy: invite.invitedBy,
          createdAt: invite.createdAt,
        }))
      );
    } catch (error) {
      console.error('Get project invites error:', error instanceof Error ? error.message : 'Failed to fetch invites');
      res.status(500).json({ error: 'Failed to fetch invites' });
    }
  }
);

/**
 * Revoke a pending project invite (requires project:manage_members)
 * DELETE /api/projects/:id/invites/:inviteId
 */
router.delete(
  '/:id/invites/:inviteId',
  authenticate,
  validateProjectId(),
  requireTeamProject(),
  requireProjectMembershipManagement(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { inviteId } = req.params;

      if (!isValidObjectId(inviteId)) {
        res.status(400).json({ error: 'Invalid invite ID format' });
        return;
      }

      const invite = await ProjectInvite.findById(inviteId);
      if (!invite || invite.projectId.toString() !== req.params.id) {
        res.status(404).json({ error: 'Invite not found' });
        return;
      }

      if (invite.status !== 'pending') {
        res.status(400).json({ error: 'Only pending invites can be revoked' });
        return;
      }

      invite.status = 'revoked';
      await invite.save();

      res.json({ message: 'Invite revoked successfully' });
    } catch (error) {
      console.error('Revoke project invite error:', error instanceof Error ? error.message : 'Failed to revoke invite');
      res.status(500).json({ error: 'Failed to revoke invite' });
    }
  }
);

/**
 * Resend a pending project invite (requires project:invite)
 * POST /api/projects/:id/invites/:inviteId/resend
 */
router.post(
  '/:id/invites/:inviteId/resend',
  authenticate,
  validateProjectId(),
  requireTeamProject(),
  requireProjectInvitePermission(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    res.status(400).json({
      error:
        'Project email invites are not available yet. Invite people to the organization first, then add them to the project from the members page.',
    });
  }
);

/**
 * Update project name
 * PATCH /api/projects/:id
 */
router.patch(
  '/:id',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  [validateProjectName()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const project = (req as AuthRequestWithOrg).project!;
      const { name } = req.body;

      project.name = name;
      await project.save();

      await auditProject(
        project._id.toString(),
        project.organizationId.toString(),
        req.user!.userId,
        'update',
        { name },
        req
      );

      const populatedProject = await Project.findById(project._id)
        .populate('createdBy', 'name email')
        .populate('members.userId', 'name email');

      res.json(populatedProject);
    } catch (error) {
      console.error('Update project error:', error instanceof Error ? error.message : 'Failed to update project');
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

/**
 * Delete project with cascade
 * DELETE /api/projects/:id
 */
router.delete(
  '/:id',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const project = (req as AuthRequestWithOrg).project!;
      const projectId = project._id.toString();

      const owner = await isProjectOwner(req.user!.userId, project);
      if (!owner) {
        res.status(403).json({ error: 'Only the project owner can delete this project' });
        return;
      }

      await Promise.all([
        EnvFile.deleteMany({ projectId: project._id }),
        Secret.deleteMany({ projectId: project._id }),
        AssociatedAccount.deleteMany({ projectId: project._id }),
        ProjectApiToken.deleteMany({ projectId: project._id }),
        ProjectInvite.deleteMany({ projectId: project._id }),
        AuditLog.deleteMany({ projectId: project._id }),
      ]);

      await deleteProjectEncryptionKey(projectId);
      await Project.findByIdAndDelete(project._id);

      await auditProject(
        projectId,
        project.organizationId.toString(),
        req.user!.userId,
        'delete',
        { name: project.name },
        req
      );

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Delete project error:', error instanceof Error ? error.message : 'Failed to delete project');
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
);

/**
 * Export project data (env files, secrets, accounts) as JSON
 * GET /api/projects/:id/export
 */
router.get(
  '/:id/export',
  authenticate,
  validateProjectId(),
  requireProjectCapability('project:export'),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const project = req.project!;
      const user = await User.findById(req.user!.userId).select('name email');
      const payload = await buildProjectExport(project, user ? { email: user.email, name: user.name } : undefined);

      if (countExportableItems(payload) === 0) {
        res.status(404).json({
          error: 'Nothing to export: this project has no environment files, secrets, or associated accounts',
        });
        return;
      }

      await audit({
        organizationId: project.organizationId.toString(),
        projectId: project._id.toString(),
        resourceType: 'project',
        resourceId: project._id.toString(),
        action: 'export',
        actorId: req.user!.userId,
        metadata: {
          envFileCount: payload.project?.envFiles.length ?? 0,
          secretCount: payload.project?.secrets.length ?? 0,
          accountCount: payload.project?.associatedAccounts.length ?? 0,
        },
        req,
      });

      res.json(payload);
    } catch (error) {
      console.error('Project export error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Failed to export project data' });
    }
  }
);

/**
 * Import project data from JSON export file
 * POST /api/projects/:id/import
 * Body: multipart file field "file", optional overwrite=true
 */
router.post(
  '/:id/import',
  authenticate,
  validateProjectId(),
  uploadRateLimiter,
  requireProjectAccess('write'),
  importUpload.single('file'),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'Import file is required' });
        return;
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(req.file.buffer.toString('utf8'));
      } catch {
        res.status(400).json({ error: 'Invalid JSON file' });
        return;
      }

      const payload = parseImportPayload(parsed);
      const exportedProject =
        payload.project ?? (payload.projects?.length === 1 ? payload.projects[0] : undefined);

      if (!exportedProject) {
        res.status(400).json({
          error: 'Import file must contain a single project. Use organization import for multi-project files.',
        });
        return;
      }

      const overwrite =
        req.body?.overwrite === true ||
        req.body?.overwrite === 'true' ||
        String(req.query.overwrite) === 'true';

      const project = req.project!;
      const result = await importProjectPayload(project, req.user!.userId, exportedProject, {
        overwrite,
        req,
      });

      await audit({
        organizationId: project.organizationId.toString(),
        projectId: project._id.toString(),
        resourceType: 'project',
        resourceId: project._id.toString(),
        action: 'import',
        actorId: req.user!.userId,
        metadata: { ...result.summary, overwrite },
        req,
      });

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import project data';
      if (message.startsWith('Invalid') || message.startsWith('Unsupported')) {
        res.status(400).json({ error: message });
        return;
      }
      console.error('Project import error:', message);
      res.status(500).json({ error: 'Failed to import project data' });
    }
  }
);

export default router;
