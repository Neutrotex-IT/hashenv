import express, { Response } from 'express';
import { authenticate, AuthRequest } from '../lib/auth';
import { requireProjectCapability } from '../lib/authorization';
import { ProjectApiToken, generateApiToken, ApiTokenScope } from '../models/ProjectApiToken';
import { audit } from '../lib/audit';

const router = express.Router();

/**
 * List all API tokens for a project
 * GET /api/projects/:projectId/tokens
 */
router.get(
  '/:projectId/tokens',
  authenticate,
  requireProjectCapability('project:manage_tokens'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      
      const tokens = await ProjectApiToken.find({ projectId })
        .select('-tokenHash')
        .sort({ createdAt: -1 })
        .populate('createdBy', 'name username email');
      
      res.json(tokens);
    } catch (error) {
      console.error('List API tokens error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to list API tokens' });
    }
  }
);

/**
 * Create a new API token
 * POST /api/projects/:projectId/tokens
 */
router.post(
  '/:projectId/tokens',
  authenticate,
  requireProjectCapability('project:manage_tokens'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { name, scopes, expiresIn } = req.body;
      
      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        res.status(400).json({ error: 'Token name is required' });
        return;
      }
      
      // Validate scopes
      const validScopes: ApiTokenScope[] = ['read', 'write'];
      const tokenScopes: ApiTokenScope[] = scopes || ['read'];
      
      if (!Array.isArray(tokenScopes) || !tokenScopes.every(s => validScopes.includes(s))) {
        res.status(400).json({ error: 'Invalid scopes. Must be array of "read" and/or "write"' });
        return;
      }
      
      // Calculate expiration
      let expiresAt: Date | null = null;
      if (expiresIn) {
        const expiresInDays = parseInt(expiresIn, 10);
        if (isNaN(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
          res.status(400).json({ error: 'expiresIn must be between 1 and 365 days' });
          return;
        }
        expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
      }
      
      // Generate token
      const { token, hash, prefix } = generateApiToken();
      
      // Create token record
      const apiToken = await ProjectApiToken.create({
        projectId,
        name: name.trim(),
        tokenHash: hash,
        tokenPrefix: prefix,
        scopes: tokenScopes,
        expiresAt,
        createdBy: req.user!._id,
      });
      
      // Audit log
      await audit({
        organizationId: req.project?.organizationId?.toString(),
        projectId,
        resourceType: 'api_token',
        action: 'create',
        actorType: 'user',
        actorId: req.user!._id.toString(),
        metadata: { tokenName: name, scopes: tokenScopes, expiresAt },
        req,
      });
      
      // Return the token only once - user must save it
      res.status(201).json({
        id: apiToken._id,
        name: apiToken.name,
        token, // Only returned on creation!
        tokenPrefix: apiToken.tokenPrefix,
        scopes: apiToken.scopes,
        expiresAt: apiToken.expiresAt,
        createdAt: apiToken.createdAt,
      });
    } catch (error) {
      console.error('Create API token error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to create API token' });
    }
  }
);

/**
 * Update API token (name and scopes only)
 * PATCH /api/projects/:projectId/tokens/:tokenId
 */
router.patch(
  '/:projectId/tokens/:tokenId',
  authenticate,
  requireProjectCapability('project:manage_tokens'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId, tokenId } = req.params;
      const { name, scopes } = req.body;
      
      const apiToken = await ProjectApiToken.findOne({ _id: tokenId, projectId });
      
      if (!apiToken) {
        res.status(404).json({ error: 'API token not found' });
        return;
      }
      
      const updates: { name?: string; scopes?: ApiTokenScope[] } = {};
      
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0) {
          res.status(400).json({ error: 'Token name cannot be empty' });
          return;
        }
        updates.name = name.trim();
      }
      
      if (scopes !== undefined) {
        const validScopes: ApiTokenScope[] = ['read', 'write'];
        if (!Array.isArray(scopes) || !scopes.every(s => validScopes.includes(s))) {
          res.status(400).json({ error: 'Invalid scopes' });
          return;
        }
        updates.scopes = scopes;
      }
      
      const updatedToken = await ProjectApiToken.findByIdAndUpdate(
        tokenId,
        { $set: updates },
        { new: true }
      ).select('-tokenHash');
      
      // Audit log
      await audit({
        organizationId: req.project?.organizationId?.toString(),
        projectId,
        resourceType: 'api_token',
        action: 'update',
        actorType: 'user',
        actorId: req.user!._id.toString(),
        metadata: { tokenId, updates },
        req,
      });
      
      res.json(updatedToken);
    } catch (error) {
      console.error('Update API token error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to update API token' });
    }
  }
);

/**
 * Delete/revoke API token
 * DELETE /api/projects/:projectId/tokens/:tokenId
 */
router.delete(
  '/:projectId/tokens/:tokenId',
  authenticate,
  requireProjectCapability('project:manage_tokens'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { projectId, tokenId } = req.params;
      
      const apiToken = await ProjectApiToken.findOne({ _id: tokenId, projectId });
      
      if (!apiToken) {
        res.status(404).json({ error: 'API token not found' });
        return;
      }
      
      await ProjectApiToken.deleteOne({ _id: tokenId });
      
      // Audit log
      await audit({
        organizationId: req.project?.organizationId?.toString(),
        projectId,
        resourceType: 'api_token',
        action: 'delete',
        actorType: 'user',
        actorId: req.user!._id.toString(),
        metadata: { tokenId, tokenName: apiToken.name },
        req,
      });
      
      res.json({ message: 'API token revoked successfully' });
    } catch (error) {
      console.error('Delete API token error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to delete API token' });
    }
  }
);

export default router;
