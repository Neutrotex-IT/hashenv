import express, { Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import { authenticate, AuthRequest } from '../lib/auth';
import { acceptOrgInvite, getInvitePreview } from '../lib/orgInvite';
import { acceptProjectInvite, getProjectInvitePreview } from '../lib/projectInvite';
import { invitePreviewRateLimiter } from '../middleware/security';

const router = express.Router();

/**
 * Preview an invite (organization or project, no auth required)
 * GET /api/invites/preview?token=xxx
 */
router.get(
  '/preview',
  invitePreviewRateLimiter,
  [query('token').notEmpty().withMessage('Invite token is required')],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const token = req.query.token as string;
      const orgPreview = await getInvitePreview(token);
      if (orgPreview) {
        res.json(orgPreview);
        return;
      }

      const projectPreview = await getProjectInvitePreview(token);
      if (!projectPreview) {
        res.status(404).json({ error: 'Invite not found' });
        return;
      }

      res.json(projectPreview);
    } catch (error) {
      console.error('Invite preview error:', error instanceof Error ? error.message : 'Failed to load invite');
      res.status(500).json({ error: 'Failed to load invite' });
    }
  }
);

/**
 * Accept an invite (organization or project, authenticated)
 * POST /api/invites/accept
 */
router.post(
  '/accept',
  authenticate,
  [body('token').notEmpty().withMessage('Invite token is required')],
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

      const { token } = req.body;

      const orgPreview = await getInvitePreview(token);
      if (orgPreview?.canAccept) {
        const result = await acceptOrgInvite(token, req.user.userId);
        res.json({
          type: 'organization',
          message: result.alreadyMember
            ? 'You are already a member of this organization'
            : `You have joined ${result.organizationName}`,
          ...result,
        });
        return;
      }

      const projectPreview = await getProjectInvitePreview(token);
      if (projectPreview?.canAccept) {
        const result = await acceptProjectInvite(token, req.user.userId);
        res.json({
          type: 'project',
          message: result.alreadyMember
            ? 'You are already a member of this project'
            : `You have joined ${result.projectName}`,
          ...result,
        });
        return;
      }

      res.status(400).json({ error: 'Invalid or expired invite' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to accept invite';
      const status = message.includes('expired') || message.includes('different email') || message.includes('organization') ? 400 : 500;
      console.error('Accept invite error:', message);
      res.status(status).json({ error: message });
    }
  }
);

export default router;
