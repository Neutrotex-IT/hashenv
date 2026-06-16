import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Organization from '../models/Organization';
import OrgMember from '../models/OrgMember';
import OrgInvite from '../models/OrgInvite';
import { authenticate, AuthRequest } from '../lib/auth';
import { requireOrgMember, requireOrgPermission, AuthRequestWithOrg } from '../lib/authorization';
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
} from '../lib/permissions';

const router = express.Router();

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
      const effective = [...getEffectiveOrgPermissions(attributes.role, attributes.permissions)];

      res.json({
        catalog: {
          org: ORG_PERMISSIONS,
          roleDefaults: ROLE_ORG_PERMISSIONS,
        },
        effective,
        grantable: ALL_ORG_PERMISSIONS.filter((permission) =>
          getEffectiveOrgPermissions(attributes.role, attributes.permissions).has(permission)
        ),
      });
    } catch (error) {
      console.error('Get permissions error:', error instanceof Error ? error.message : 'Failed to fetch permissions');
      res.status(500).json({ error: 'Failed to fetch permissions' });
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
 * Update member role and ABAC permissions (requires org:manage_members)
 * PATCH /api/organizations/:orgId/members/:memberId
 */
router.patch(
  '/:orgId/members/:memberId',
  authenticate,
  requireOrgPermission('org:manage_members'),
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

      await OrgMember.findByIdAndDelete(memberId);
      
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
      const logs = await AuditLog.find({ organizationId: req.params.orgId })
        .sort({ createdAt: -1 })
        .limit(1000);
      
      res.json(logs);
    } catch (error) {
      console.error('Get audit logs error:', error instanceof Error ? error.message : 'Failed to fetch audit logs');
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
);

export default router;
