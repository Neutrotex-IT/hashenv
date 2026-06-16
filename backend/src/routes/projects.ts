import express, { Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Project, { IProject } from '../models/Project';
import ProjectInvite from '../models/ProjectInvite';
import User from '../models/User';
import OrgMember from '../models/OrgMember';
import { authenticate, AuthRequest } from '../lib/auth';
import {
  requireProjectAccess,
  requireProjectInvitePermission,
  requireProjectMembershipManagement,
  Permission,
  AuthRequestWithOrg,
  getUserOrgRole,
} from '../lib/authorization';
import { validateProjectId, validateUserId, validateProjectName, validatePermission, isValidObjectId } from '../middleware/validation';
import { uploadRateLimiter } from '../middleware/security';
import { createProjectEncryptionKey, deleteProjectEncryptionKey } from '../crypto';
import { canGrantProjectPermissions, getProjectMemberAttributes, canPerformOrgAction, getOrgMemberAttributes } from '../lib/abac';
import {
  ALL_PROJECT_PERMISSIONS,
  PROJECT_PERMISSIONS,
  getProjectCapabilitiesFromAccess,
  sanitizeProjectPermissions,
} from '../lib/permissions';
import { createAndSendProjectInvite } from '../lib/projectInvite';
import { auditProject } from '../lib/audit';

const router = express.Router();

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
    const userOrgIds = memberships.map(m => m.organizationId);
    
    // Build query - filter by specific org or all user's orgs
    const orgQuery = orgId && isValidObjectId(orgId as string)
      ? { organizationId: orgId }
      : { organizationId: { $in: userOrgIds } };
    
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
    
    res.json(projects);
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
      const attributes = await getProjectMemberAttributes(
        req.user!.userId,
        project,
        req.orgRole ?? null
      );

      const effective = attributes.isOwner || attributes.isOrgElevated
        ? ['project:read', 'project:write', ...ALL_PROJECT_PERMISSIONS]
        : [...getProjectCapabilitiesFromAccess(attributes.accessLevel ?? 'read', attributes.permissions)];

      res.json({
        catalog: {
          project: PROJECT_PERMISSIONS,
        },
        effective,
        grantable: attributes.isOwner || attributes.isOrgElevated
          ? ALL_PROJECT_PERMISSIONS
          : ALL_PROJECT_PERMISSIONS.filter((permission) =>
              getProjectCapabilitiesFromAccess(attributes.accessLevel ?? 'read', attributes.permissions).has(permission)
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

      await auditProject(
        projectId,
        project.organizationId.toString(),
        req.user!.userId,
        'update_member',
        {
          targetUserId: userId,
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
      
      // Remove member
      project.members = project.members.filter(
        (m) => m.userId.toString() !== userId
      );
      
      await project.save();
      
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

      const project = (req as AuthRequestWithOrg).project as IProject;
      const inviterContext = await getProjectMemberAttributes(
        req.user.userId,
        project,
        (req as AuthRequestWithOrg).orgRole ?? null
      );

      const invite = await createAndSendProjectInvite(
        project._id.toString(),
        req.body.email,
        req.body.permission,
        sanitizeProjectPermissions(req.body.permissions),
        req.user.userId,
        { ...inviterContext, orgRole: (req as AuthRequestWithOrg).orgRole ?? null }
      );

      res.status(201).json({
        id: invite._id,
        email: invite.email,
        permission: invite.permission,
        permissions: invite.permissions,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invite';
      const status =
        message.includes('already a member') ||
        message.includes('organization') ||
        message.includes('cannot grant') ||
        message.includes('permission')
          ? 400
          : 500;
      console.error('Send project invite error:', message);
      res.status(status).json({ error: message });
    }
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

export default router;
