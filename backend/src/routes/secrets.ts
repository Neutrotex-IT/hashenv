import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Secret from '../models/Secret';
import { encryptProjectData, decryptProjectData } from '../crypto';
import { authenticate, AuthRequest } from '../lib/auth';
import { requireProjectAccess, requireProjectOwnership } from '../lib/authorization';
import { validateProjectId, isValidObjectId } from '../middleware/validation';
import { uploadRateLimiter } from '../middleware/security';

const router = express.Router();

/**
 * Create a new secret
 * POST /api/projects/:projectId/secrets
 * Requires: write permission
 * Body: { name: string, content: string }
 */
router.post(
  '/:projectId/secrets',
  authenticate,
  validateProjectId(),
  uploadRateLimiter,
  requireProjectAccess('write'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Secret name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Secret name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('Secret name can only contain letters, numbers, spaces, hyphens, and underscores'),
    body('content')
      .isString()
      .withMessage('Content must be a string')
      .custom((value) => {
        if (value && value.length > 50 * 1024) {
          throw new Error('Content size must be less than 50KB');
        }
        return true;
      }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.projectId;
      const { name, content } = req.body;

      if (!isValidObjectId(projectId)) {
        res.status(400).json({ error: 'Invalid project ID format' });
        return;
      }

      // Check if secret with same name already exists in this project
      const existingSecret = await Secret.findOne({ projectId, name: name.trim() });
      if (existingSecret) {
        res.status(400).json({ error: 'A secret with this name already exists in this project' });
        return;
      }

      // Encrypt the secret content using project-specific key
      const plaintextData = content || '';
      const { encryptedData, iv, authTag } = await encryptProjectData(projectId, plaintextData);

      // Create the secret
      const secret = await Secret.create({
        projectId,
        name: name.trim(),
        encryptedData,
        iv,
        authTag,
        createdBy: req.user.userId,
      });

      // Return secret metadata (without encrypted data)
      const populatedSecret = await Secret.findById(secret._id)
        .populate('createdBy', 'name email')
        .select('-encryptedData -iv -authTag');

      res.status(201).json(populatedSecret);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Create secret error:', errMsg);
      
      // Handle duplicate key error
      if (errMsg.includes('duplicate key') || errMsg.includes('E11000')) {
        res.status(400).json({ error: 'A secret with this name already exists in this project' });
        return;
      }
      
      res.status(500).json({ error: 'Failed to create secret' });
    }
  }
);

/**
 * Get all secrets for a project
 * GET /api/projects/:projectId/secrets
 * Requires: read permission
 */
router.get(
  '/:projectId/secrets',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;

      if (!isValidObjectId(projectId)) {
        res.status(400).json({ error: 'Invalid project ID format' });
        return;
      }

      // Get all secrets for this project (without encrypted data)
      const secrets = await Secret.find({ projectId })
        .populate('createdBy', 'name email')
        .select('-encryptedData -iv -authTag')
        .sort({ name: 1 });

      res.json(secrets);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Get secrets error:', errMsg);
      res.status(500).json({ error: 'Failed to fetch secrets' });
    }
  }
);

/**
 * Get secret content (decrypted)
 * GET /api/projects/:projectId/secrets/:secretId/content
 * Requires: read permission
 */
router.get(
  '/:projectId/secrets/:secretId/content',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const secretId = req.params.secretId;

      if (!isValidObjectId(projectId) || !isValidObjectId(secretId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      // Find the secret
      const secret = await Secret.findOne({
        _id: secretId,
        projectId,
      });

      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      // Decrypt the secret content using project-specific key
      const decryptedContent = await decryptProjectData(projectId, secret.encryptedData, secret.iv, secret.authTag);

      res.json({
        _id: secret._id,
        name: secret.name,
        content: decryptedContent,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Get secret content error:', errMsg);
      res.status(500).json({ error: 'Failed to get secret content' });
    }
  }
);

/**
 * Update a secret
 * PUT /api/projects/:projectId/secrets/:secretId
 * Requires: write permission
 * Body: { name?: string, content?: string }
 */
router.put(
  '/:projectId/secrets/:secretId',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Secret name cannot be empty')
      .isLength({ min: 1, max: 100 })
      .withMessage('Secret name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('Secret name can only contain letters, numbers, spaces, hyphens, and underscores'),
    body('content')
      .optional()
      .isString()
      .withMessage('Content must be a string')
      .custom((value) => {
        if (value && value.length > 50 * 1024) {
          throw new Error('Content size must be less than 50KB');
        }
        return true;
      }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.projectId;
      const secretId = req.params.secretId;
      const { name, content } = req.body;

      if (!isValidObjectId(projectId) || !isValidObjectId(secretId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      // Find the secret
      const secret = await Secret.findOne({
        _id: secretId,
        projectId,
      });

      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      // Update name if provided
      if (name !== undefined && name.trim() !== secret.name) {
        // Check if another secret with the new name exists
        const existingSecret = await Secret.findOne({
          projectId,
          name: name.trim(),
          _id: { $ne: secretId },
        });
        if (existingSecret) {
          res.status(400).json({ error: 'A secret with this name already exists in this project' });
          return;
        }
        secret.name = name.trim();
      }

      // Update content if provided (re-encrypt with project-specific key)
      if (content !== undefined) {
        const { encryptedData, iv, authTag } = await encryptProjectData(projectId, content);
        secret.encryptedData = encryptedData;
        secret.iv = iv;
        secret.authTag = authTag;
      }

      await secret.save();

      // Return updated secret metadata
      const populatedSecret = await Secret.findById(secret._id)
        .populate('createdBy', 'name email')
        .select('-encryptedData -iv -authTag');

      res.json(populatedSecret);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Update secret error:', errMsg);
      
      // Handle duplicate key error
      if (errMsg.includes('duplicate key') || errMsg.includes('E11000')) {
        res.status(400).json({ error: 'A secret with this name already exists in this project' });
        return;
      }
      
      res.status(500).json({ error: 'Failed to update secret' });
    }
  }
);

/**
 * Delete a secret
 * DELETE /api/projects/:projectId/secrets/:secretId
 * Requires: write permission
 */
router.delete(
  '/:projectId/secrets/:secretId',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const secretId = req.params.secretId;

      if (!isValidObjectId(projectId) || !isValidObjectId(secretId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      // Find and delete the secret
      const secret = await Secret.findOneAndDelete({
        _id: secretId,
        projectId,
      });

      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      res.json({ message: 'Secret deleted successfully' });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Delete secret error:', errMsg);
      res.status(500).json({ error: 'Failed to delete secret' });
    }
  }
);

export default router;
