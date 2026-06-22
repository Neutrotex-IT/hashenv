import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization';
import OrgMember from '../models/OrgMember';
import OrgInvite from '../models/OrgInvite';
import { authenticate, AuthRequest, comparePassword } from '../lib/auth';
import { requireOrgMember, requireOrgPermission, requireTeamOrganization, AuthRequestWithOrg } from '../lib/authorization';
import { isValidObjectId } from '../middleware/validation';
import { createOrgEncryptionKey } from '../crypto';
import { createAndSendOrgInvite } from '../lib/orgInvite';
import { canManageOrgMember, canGrantOrgPermissions } from '../lib/abac';
import {
  ALL_ORG_PERMISSIONS,
  ORG_PERMISSIONS,
  ROLE_ORG_PERMISSIONS,
  getEffectiveOrgPermissions,
  sanitizeOrgPermissions,
  OrgPermission,
} from '../lib/permissions';
import multer from 'multer';
import Project from '../models/Project';
import User from '../models/User';
import { uploadRateLimiter } from '../middleware/security';
import { getProjectMemberAttributes, canPerformOrgAction, getOrgMemberAttributes, hasProjectCapability } from '../lib/abac';
import { getUserOrgRole } from '../lib/authorization';
import { auditOrg } from '../lib/audit';
import {
  buildOrganizationExport,
  countExportableItems,
  parseImportPayload,
  importOrganizationPayload,
} from '../lib/dataTransfer';
import {
  getOrganizationSettingsPayload,
  getOrganizationPanicSettings,
  upsertOrganizationPanicSettings,
} from '../lib/organizationSettings';
import { executePanicActions, sendPanicResponse } from '../lib/executePanic';
import { getPanicEligibleProjectsForOrg, canExecutePanicInOrg } from '../lib/panicProjects';
import { hasConfiguredPanicActions } from '../lib/panicButton';
import { revokeApiTokensForUser } from '../lib/apiTokenLifecycle';

const TEAM_ORG_COLLABORATION_PERMISSIONS = new Set<OrgPermission>([
  'org:invite',
  'org:manage_members',
  'org:revoke_invites',
]);

function withoutTeamCollaborationPermissions(
  orgType: string,
  permissions: OrgPermission[]
): OrgPermission[] {
  if (orgType !== 'personal') {
    return permissions;
  }
  return permissions.filter((permission) => !TEAM_ORG_COLLABORATION_PERMISSIONS.has(permission));
}

const router = express.Router();

const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

/**
 * Get all organizations the user is a member of
 * GET /api/organizations
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    
    const memberships = await OrgMember.find({ userId: req.user.userId })
      .populate('organizationId');
    
    const orgs = memberships.map(m => ({
      ...((m.organizationId as any).toObject()),
      role: m.role,
      permissions: sanitizeOrgPermissions(m.permissions),
    }));
    
    res.json(orgs);
  } catch (error) {
    console.error('Get organizations error:', error instanceof Error ? error.message : 'Failed to fetch organizations');
    res.status(500).json({ error: 'Failed to fetch organizations' });
  }
});

/**
 * Get a single organization
 * GET /api/organizations/:orgId
 */
router.get(
  '/:orgId',
  authenticate,
  requireOrgMember(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const org = req.organization;
      res.json({
        ...org!.toObject(),
        role: req.orgRole,
        permissions: req.orgPermissions ?? [],
      });
    } catch (error) {
      console.error('Get organization error:', error instanceof Error ? error.message : 'Failed to fetch organization');
      res.status(500).json({ error: 'Failed to fetch organization' });
    }
  }
);

/**
 * Create a new team organization
 * POST /api/organizations
 */
router.post(
  '/',
  authenticate,
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Organization name is required')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
    body('slug')
      .trim()
      .notEmpty()
      .withMessage('Slug is required')
      .isLength({ max: 100 })
      .withMessage('Slug must be less than 100 characters')
      .matches(/^[a-z0-9-]+$/)
      .withMessage('Slug can only contain lowercase letters, numbers, and hyphens'),
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
      
      const { name, slug } = req.body;
      
      // Check if slug is already taken
      const existingOrg = await Organization.findOne({ slug: slug.toLowerCase() });
      if (existingOrg) {
        res.status(400).json({ error: 'Organization slug already taken' });
        return;
      }
      
      const org = await Organization.create({
        name,
        slug: slug.toLowerCase(),
        type: 'team',
        createdBy: req.user.userId,
      });
      
      // Add creator as owner
      await OrgMember.create({
        organizationId: org._id,
        userId: req.user.userId,
        role: 'owner',
      });
      
      // Create encryption key for the org
      await createOrgEncryptionKey(org._id.toString());
      
      res.status(201).json({
        ...org.toObject(),
        role: 'owner',
      });
    } catch (error) {
      console.error('Create organization error:', error instanceof Error ? error.message : 'Failed to create organization');
      res.status(500).json({ error: 'Failed to create organization' });
    }
  }
);

/**
 * Get ABAC permission catalog and current user's effective permissions
 * GET /api/organizations/:orgId/permissions
 */
router.get(
  '/:orgId/permissions',
  authenticate,
  requireOrgMember(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const attributes = {
        role: req.orgRole!,
        permissions: req.orgPermissions ?? [],
      };
      const effective = withoutTeamCollaborationPermissions(
        req.organization!.type,
        [...getEffectiveOrgPermissions(attributes.role, attributes.permissions)]
      );

      res.json({
        catalog: {
          org: ORG_PERMISSIONS,
          roleDefaults: ROLE_ORG_PERMISSIONS,
        },
        effective,
        grantable: withoutTeamCollaborationPermissions(
          req.organization!.type,
          ALL_ORG_PERMISSIONS.filter((permission) =>
            getEffectiveOrgPermissions(attributes.role, attributes.permissions).has(permission)
          )
        ),
      });
    } catch (error) {
      console.error('Get permissions error:', error instanceof Error ? error.message : 'Failed to fetch permissions');
      res.status(500).json({ error: 'Failed to fetch permissions' });
    }
  }
);

const panicButtonValidators = [
  body('panicButton.flushEnvs').optional().isBoolean().withMessage('flushEnvs must be a boolean'),
  body('panicButton.flushSecrets').optional().isBoolean().withMessage('flushSecrets must be a boolean'),
  body('panicButton.revokeApiTokens')
    .optional()
    .isBoolean()
    .withMessage('revokeApiTokens must be a boolean'),
  body('panicButton.revokeCollaborators')
    .optional()
    .isBoolean()
    .withMessage('revokeCollaborators must be a boolean'),
  body('panicButton.downloadEnvs').optional().isBoolean().withMessage('downloadEnvs must be a boolean'),
  body('panicButton.askConfirmation')
    .optional()
    .isBoolean()
    .withMessage('askConfirmation must be a boolean'),
];

/**
 * Get organization settings (panic button configuration and eligibility)
 * GET /api/organizations/:orgId/settings
 */
router.get(
  '/:orgId/settings',
  authenticate,
  requireOrgMember(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const payload = await getOrganizationSettingsPayload(
        req.params.orgId,
        req.user!.userId,
        {
          role: req.orgRole!,
          permissions: req.orgPermissions ?? [],
        }
      );

      res.json(payload);
    } catch (error) {
      console.error(
        'Get organization settings error:',
        error instanceof Error ? error.message : 'Failed to fetch organization settings'
      );
      res.status(500).json({ error: 'Failed to fetch organization settings' });
    }
  }
);

/**
 * Update organization panic button settings
 * PUT /api/organizations/:orgId/settings
 */
router.put(
  '/:orgId/settings',
  authenticate,
  requireOrgPermission('org:configure_panic'),
  panicButtonValidators,
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const panicButton = await upsertOrganizationPanicSettings(
        req.params.orgId,
        req.body.panicButton ?? {}
      );

      res.json({ panicButton });
    } catch (error) {
      console.error(
        'Update organization settings error:',
        error instanceof Error ? error.message : 'Failed to update organization settings'
      );
      res.status(500).json({ error: 'Failed to update organization settings' });
    }
  }
);

/**
 * Execute organization panic button actions
 * POST /api/organizations/:orgId/panic
 */
router.post(
  '/:orgId/panic',
  authenticate,
  requireOrgMember(),
  [body('password').notEmpty().withMessage('Password is required to execute panic actions')],
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const user = await User.findById(req.user!.userId).select('+password');
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const passwordValid = await comparePassword(req.body.password, user.password);
      if (!passwordValid) {
        res.status(401).json({ error: 'Invalid password' });
        return;
      }

      const organizationId = req.params.orgId;
      const canExecute = await canExecutePanicInOrg(req.user!.userId, organizationId);
      if (!canExecute) {
        res.status(403).json({
          error: 'You do not have permission to run panic actions on any project in this organization',
        });
        return;
      }

      const panicButton = await getOrganizationPanicSettings(organizationId);
      if (!hasConfiguredPanicActions(panicButton)) {
        res.status(400).json({ error: 'No panic actions configured for this organization' });
        return;
      }

      const projects = await getPanicEligibleProjectsForOrg(req.user!.userId, organizationId);
      if (projects.length === 0) {
        res.status(403).json({
          error: 'You do not have permission to run panic actions on any project in this organization',
        });
        return;
      }

      const results = await executePanicActions(
        req.user!.userId,
        organizationId,
        projects,
        panicButton,
        req
      );

      sendPanicResponse(res, results);
    } catch (error) {
      console.error(
        'Organization panic error:',
        error instanceof Error ? error.message : 'Failed to execute panic actions'
      );
      res.status(500).json({ error: 'Failed to execute panic actions' });
    }
  }
);

/**
 * Update organization (requires org:update)
 * PATCH /api/organizations/:orgId
 */
router.patch(
  '/:orgId',
  authenticate,
  requireOrgPermission('org:update'),
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ max: 100 })
      .withMessage('Name must be less than 100 characters'),
  ],
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      const org = req.organization!;
      
      if (req.body.name) {
        org.name = req.body.name;
      }
      
      await org.save();
      
      res.json({
        ...org.toObject(),
        role: req.orgRole,
      });
    } catch (error) {
      console.error('Update organization error:', error instanceof Error ? error.message : 'Failed to update organization');
      res.status(500).json({ error: 'Failed to update organization' });
    }
  }
);

/**
 * Get organization members
 * GET /api/organizations/:orgId/members
 */
router.get(
  '/:orgId/members',
  authenticate,
  requireOrgMember(),
  requireTeamOrganization(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const members = await OrgMember.find({ organizationId: req.params.orgId })
        .populate('userId', 'name username email');
      
      res.json(members.map(m => ({
        id: m._id,
        user: m.userId,
        role: m.role,
        permissions: sanitizeOrgPermissions(m.permissions),
        createdAt: m.createdAt,
      })));
    } catch (error) {
      console.error('Get members error:', error instanceof Error ? error.message : 'Failed to fetch members');
      res.status(500).json({ error: 'Failed to fetch members' });
    }
  }
);

/**
 * Send an email invite to join the organization (requires org:invite)
 * POST /api/organizations/:orgId/members
 */
router.post(
  '/:orgId/members',
  authenticate,
  requireOrgPermission('org:invite'),
  requireTeamOrganization(),
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Invalid email format'),
    body('role')
      .isIn(['member', 'admin'])
      .withMessage('Role must be member or admin'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
  ],
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
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

      const { email, role } = req.body;
      const permissions = sanitizeOrgPermissions(req.body.permissions);
      const orgId = req.params.orgId;

      const inviterAttributes = {
        role: req.orgRole!,
        permissions: req.orgPermissions ?? [],
      };

      const invite = await createAndSendOrgInvite(
        orgId,
        email,
        role,
        req.user.userId,
        role === 'admin' ? [] : permissions,
        inviterAttributes
      );

      res.status(201).json({
        id: invite._id,
        email: invite.email,
        role: invite.role,
        permissions: invite.permissions,
        status: invite.status,
        expiresAt: invite.expiresAt,
        createdAt: invite.createdAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send invite';
      const status = message.includes('already a member') || message.includes('personal workspace') ? 400 : 500;
      console.error('Send invite error:', message);
      res.status(status).json({ error: message });
    }
  }
);

/**
 * List pending organization invites (requires org:revoke_invites or org:invite)
 * GET /api/organizations/:orgId/invites
 */
router.get(
  '/:orgId/invites',
  authenticate,
  requireOrgMember(),
  requireTeamOrganization(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const attributes = {
        role: req.orgRole!,
        permissions: req.orgPermissions ?? [],
      };
      const canView =
        getEffectiveOrgPermissions(attributes.role, attributes.permissions).has('org:invite') ||
        getEffectiveOrgPermissions(attributes.role, attributes.permissions).has('org:revoke_invites');

      if (!canView) {
        res.status(403).json({ error: 'Access denied: missing permission to view invites' });
        return;
      }

      const invites = await OrgInvite.find({
        organizationId: req.params.orgId,
        status: 'pending',
        expiresAt: { $gt: new Date() },
      })
        .populate('invitedBy', 'name email')
        .sort({ createdAt: -1 });

      res.json(
        invites.map((invite) => ({
          id: invite._id,
          email: invite.email,
          role: invite.role,
          permissions: invite.permissions,
          status: invite.status,
          expiresAt: invite.expiresAt,
          invitedBy: invite.invitedBy,
          createdAt: invite.createdAt,
        }))
      );
    } catch (error) {
      console.error('Get invites error:', error instanceof Error ? error.message : 'Failed to fetch invites');
      res.status(500).json({ error: 'Failed to fetch invites' });
    }
  }
);

/**
 * Revoke a pending organization invite (requires org:revoke_invites)
 * DELETE /api/organizations/:orgId/invites/:inviteId
 */
router.delete(
  '/:orgId/invites/:inviteId',
  authenticate,
  requireOrgPermission('org:revoke_invites'),
  requireTeamOrganization(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const { inviteId } = req.params;

      if (!isValidObjectId(inviteId)) {
        res.status(400).json({ error: 'Invalid invite ID format' });
        return;
      }

      const invite = await OrgInvite.findById(inviteId);
      if (!invite || invite.organizationId.toString() !== req.params.orgId) {
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
      console.error('Revoke invite error:', error instanceof Error ? error.message : 'Failed to revoke invite');
      res.status(500).json({ error: 'Failed to revoke invite' });
    }
  }
);

/**
 * Resend a pending organization invite (requires org:invite)
 * POST /api/organizations/:orgId/invites/:inviteId/resend
 */
router.post(
  '/:orgId/invites/:inviteId/resend',
  authenticate,
  requireOrgPermission('org:invite'),
  requireTeamOrganization(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const { inviteId } = req.params;

      if (!isValidObjectId(inviteId)) {
        res.status(400).json({ error: 'Invalid invite ID format' });
        return;
      }

      const invite = await OrgInvite.findById(inviteId);
      if (!invite || invite.organizationId.toString() !== req.params.orgId) {
        res.status(404).json({ error: 'Invite not found' });
        return;
      }

      if (invite.status !== 'pending') {
        res.status(400).json({ error: 'Only pending invites can be resent' });
        return;
      }

      if (invite.expiresAt < new Date()) {
        res.status(400).json({ error: 'This invite has expired' });
        return;
      }

      const inviterAttributes = {
        role: req.orgRole!,
        permissions: req.orgPermissions ?? [],
      };

      const resent = await createAndSendOrgInvite(
        req.params.orgId,
        invite.email,
        invite.role,
        req.user.userId,
        invite.role === 'admin' ? [] : sanitizeOrgPermissions(invite.permissions),
        inviterAttributes
      );

      res.json({
        id: resent._id,
        email: resent.email,
        role: resent.role,
        permissions: resent.permissions,
        status: resent.status,
        expiresAt: resent.expiresAt,
        createdAt: resent.createdAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to resend invite';
      const status = message.includes('cannot') || message.includes('already a member') ? 400 : 500;
      console.error('Resend invite error:', message);
      res.status(status).json({ error: message });
    }
  }
);

/**
 * Update member role and ABAC permissions (requires org:manage_members)
 * PATCH /api/organizations/:orgId/members/:memberId
 */
router.patch(
  '/:orgId/members/:memberId',
  authenticate,
  requireOrgPermission('org:manage_members'),
  requireTeamOrganization(),
  [
    body('role')
      .optional()
      .isIn(['member', 'admin'])
      .withMessage('Role must be member or admin'),
    body('permissions')
      .optional()
      .isArray()
      .withMessage('Permissions must be an array'),
  ],
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { memberId } = req.params;
      const nextRole = req.body.role as 'member' | 'admin' | undefined;
      const nextPermissions = req.body.permissions
        ? sanitizeOrgPermissions(req.body.permissions)
        : undefined;

      if (!nextRole && !nextPermissions) {
        res.status(400).json({ error: 'Provide role and/or permissions to update' });
        return;
      }

      if (!isValidObjectId(memberId)) {
        res.status(400).json({ error: 'Invalid member ID format' });
        return;
      }

      const member = await OrgMember.findById(memberId);
      if (!member || member.organizationId.toString() !== req.params.orgId) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      if (member.role === 'owner') {
        res.status(403).json({ error: 'Cannot change owner role' });
        return;
      }

      const actor = {
        role: req.orgRole!,
        permissions: req.orgPermissions ?? [],
      };

      if (!canManageOrgMember(actor, member.role)) {
        res.status(403).json({ error: 'You cannot manage this member' });
        return;
      }

      const targetRole = nextRole ?? member.role;
      if (nextRole && !canManageOrgMember(actor, nextRole)) {
        res.status(403).json({ error: 'You cannot assign this role' });
        return;
      }

      if (nextPermissions) {
        const grantTargetRole: 'member' | 'admin' = targetRole === 'admin' ? 'admin' : 'member';
        const grantCheck = canGrantOrgPermissions(actor, {
          targetRole: grantTargetRole,
          targetPermissions: grantTargetRole === 'admin' ? [] : nextPermissions,
        });
        if (!grantCheck.allowed) {
          res.status(403).json({ error: grantCheck.reason || 'Invalid permission grant' });
          return;
        }
      }

      if (nextRole) {
        member.role = nextRole;
      }
      if (nextPermissions) {
        member.permissions = targetRole === 'admin' ? [] : nextPermissions;
      }

      await member.save();

      const populatedMember = await OrgMember.findById(member._id)
        .populate('userId', 'name username email');

      res.json({
        id: populatedMember!._id,
        user: populatedMember!.userId,
        role: populatedMember!.role,
        permissions: sanitizeOrgPermissions(populatedMember!.permissions),
        createdAt: populatedMember!.createdAt,
      });
    } catch (error) {
      console.error('Update member error:', error instanceof Error ? error.message : 'Failed to update member');
      res.status(500).json({ error: 'Failed to update member' });
    }
  }
);

/**
 * Remove member from organization (requires org:manage_members)
 * DELETE /api/organizations/:orgId/members/:memberId
 */
router.delete(
  '/:orgId/members/:memberId',
  authenticate,
  requireOrgPermission('org:manage_members'),
  requireTeamOrganization(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const { memberId } = req.params;

      if (!isValidObjectId(memberId)) {
        res.status(400).json({ error: 'Invalid member ID format' });
        return;
      }

      const member = await OrgMember.findById(memberId);
      if (!member || member.organizationId.toString() !== req.params.orgId) {
        res.status(404).json({ error: 'Member not found' });
        return;
      }

      if (member.role === 'owner') {
        res.status(403).json({ error: 'Cannot remove organization owner' });
        return;
      }

      const actor = {
        role: req.orgRole!,
        permissions: req.orgPermissions ?? [],
      };

      if (!canManageOrgMember(actor, member.role)) {
        res.status(403).json({ error: 'You cannot remove this member' });
        return;
      }

      const removedUserId = member.userId.toString();
      const orgId = req.params.orgId;

      await OrgMember.findByIdAndDelete(memberId);

      const orgProjects = await Project.find({ organizationId: orgId }).select('_id');
      const projectIds = orgProjects.map((p) => p._id);

      if (projectIds.length > 0) {
        await Project.updateMany(
          { organizationId: orgId },
          { $pull: { members: { userId: removedUserId } } }
        );
        await revokeApiTokensForUser(removedUserId, projectIds);
      }
      
      res.json({ message: 'Member removed successfully' });
    } catch (error) {
      console.error('Remove member error:', error instanceof Error ? error.message : 'Failed to remove member');
      res.status(500).json({ error: 'Failed to remove member' });
    }
  }
);

/**
 * Get organization audit logs (requires org:audit)
 * GET /api/organizations/:orgId/audit
 */
router.get(
  '/:orgId/audit',
  authenticate,
  requireOrgPermission('org:audit'),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const AuditLog = (await import('../models/AuditLog')).default;
      const Project = (await import('../models/Project')).default;
      const orgId = req.params.orgId;

      const projectIds = await Project.find({ organizationId: orgId }).distinct('_id');

      const logs = await AuditLog.find({
        $or: [
          { organizationId: orgId },
          ...(projectIds.length > 0 ? [{ projectId: { $in: projectIds } }] : []),
        ],
      })
        .sort({ createdAt: -1 })
        .limit(1000);
      
      res.json(logs);
    } catch (error) {
      console.error('Get audit logs error:', error instanceof Error ? error.message : 'Failed to fetch audit logs');
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

/**
 * Export organization data (all accessible projects) as JSON
 * GET /api/organizations/:orgId/export
 */
router.get(
  '/:orgId/export',
  authenticate,
  requireOrgMember(),
  async (req: AuthRequestWithOrg, res: Response): Promise<void> => {
    try {
      const orgId = req.params.orgId;
      const org = req.organization!;
      const orgRole = req.orgRole ?? (await getUserOrgRole(req.user!.userId, orgId));

      const allProjects = await Project.find({ organizationId: orgId });
      const readableProjects = [];

      for (const project of allProjects) {
        const attributes = await getProjectMemberAttributes(req.user!.userId, project, orgRole);
        if (hasProjectCapability(attributes, 'project:export')) {
          readableProjects.push(project);
        }
      }

      if (readableProjects.length === 0) {
        res.status(404).json({
          error: 'Nothing to export: you do not have export access to any projects in this organization',
        });
        return;
      }

      const user = await User.findById(req.user!.userId).select('name email');
      const payload = await buildOrganizationExport(
        orgId,
        readableProjects,
        user ? { email: user.email, name: user.name } : undefined
      );

      if (countExportableItems(payload) === 0) {
        res.status(404).json({
          error: 'Nothing to export: no environment files, secrets, or associated accounts were found',
        });
        return;
      }

      await auditOrg(orgId, req.user!.userId, 'update', {
        action: 'export',
        projectCount: readableProjects.length,
        envFileCount: payload.projects?.reduce((sum, p) => sum + p.envFiles.length, 0) ?? 0,
        secretCount: payload.projects?.reduce((sum, p) => sum + p.secrets.length, 0) ?? 0,
        accountCount: payload.projects?.reduce((sum, p) => sum + p.associatedAccounts.length, 0) ?? 0,
      }, req);

      res.json(payload);
    } catch (error) {
      console.error('Organization export error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Failed to export organization data' });
    }
  }
);

/**
 * Import organization data from JSON export file
 * POST /api/organizations/:orgId/import
 */
router.post(
  '/:orgId/import',
  authenticate,
  requireOrgMember(),
  uploadRateLimiter,
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
      const orgId = req.params.orgId;
      const orgRole = req.orgRole ?? (await getUserOrgRole(req.user!.userId, orgId));
      const memberAttributes = await getOrgMemberAttributes(req.user!.userId, orgId);
      const canCreateProject = memberAttributes
        ? canPerformOrgAction(memberAttributes, 'org:create_project')
        : false;

      const orgProjects = await Project.find({ organizationId: orgId });
      const writableProjectIds = new Set<string>();
      for (const project of orgProjects) {
        const attributes = await getProjectMemberAttributes(req.user!.userId, project, orgRole);
        if (attributes.accessLevel === 'write') {
          writableProjectIds.add(project._id.toString());
        }
      }

      const overwrite =
        req.body?.overwrite === true ||
        req.body?.overwrite === 'true' ||
        String(req.query.overwrite) === 'true';

      const result = await importOrganizationPayload(payload, {
        organizationId: orgId,
        userId: req.user!.userId,
        canCreateProject,
        writableProjectIds,
        overwrite,
        req,
      });

      await auditOrg(orgId, req.user!.userId, 'update', { action: 'import', ...result.summary, overwrite }, req);

      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to import organization data';
      if (message.startsWith('Invalid') || message.startsWith('Unsupported')) {
        res.status(400).json({ error: message });
        return;
      }
      console.error('Organization import error:', message);
      res.status(500).json({ error: 'Failed to import organization data' });
    }
  }
);

export default router;
