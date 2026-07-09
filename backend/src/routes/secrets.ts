import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Secret from '../models/Secret';
import { encryptComponentData, decryptComponentData } from '../crypto';
import { authenticate, AuthRequest } from '../lib/auth';
import { requireComponentAccess, AuthRequestWithOrg } from '../lib/authorization';
import { validateProjectId, validateComponentId, isValidObjectId } from '../middleware/validation';
import { uploadRateLimiter } from '../middleware/security';
import { auditSecret } from '../lib/audit';

const router = express.Router({ mergeParams: true });

router.post(
  '/:projectId/components/:componentId/secrets',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  uploadRateLimiter,
  requireComponentAccess('write'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Secret name is required')
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9\s\-_]+$/)
      .withMessage('Secret name can only contain letters, numbers, spaces, hyphens, and underscores'),
    body('content')
      .isString()
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
      const component = (req as AuthRequestWithOrg).component!;
      const { name, content } = req.body;

      const existingSecret = await Secret.findOne({ componentId: component._id, name: name.trim() });
      if (existingSecret) {
        res.status(400).json({ error: 'A secret with this name already exists in this component' });
        return;
      }

      const plaintextData = content || '';
      const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), plaintextData);

      const secret = await Secret.create({
        projectId,
        componentId: component._id,
        name: name.trim(),
        encryptedData,
        iv,
        authTag,
        createdBy: req.user.userId,
      });

      await auditSecret(
        projectId,
        req.user.userId,
        'create',
        secret._id.toString(),
        { secretName: secret.name, componentId: component._id.toString(), componentName: component.name },
        req
      );

      const populatedSecret = await Secret.findById(secret._id)
        .populate('createdBy', 'name email')
        .select('-encryptedData -iv -authTag');

      res.status(201).json(populatedSecret);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Create secret error:', errMsg);
      if (errMsg.includes('duplicate key') || errMsg.includes('E11000')) {
        res.status(400).json({ error: 'A secret with this name already exists in this component' });
        return;
      }
      res.status(500).json({ error: 'Failed to create secret' });
    }
  }
);

router.get(
  '/:projectId/components/:componentId/secrets',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const component = (req as AuthRequestWithOrg).component!;
      const secrets = await Secret.find({ componentId: component._id })
        .populate('createdBy', 'name email')
        .select('-encryptedData -iv -authTag')
        .sort({ name: 1 });

      res.json(secrets);
    } catch (error) {
      console.error('Get secrets error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to fetch secrets' });
    }
  }
);

router.get(
  '/:projectId/components/:componentId/secrets/:secretId/content',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const component = (req as AuthRequestWithOrg).component!;
      const secretId = req.params.secretId;

      if (!isValidObjectId(secretId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const secret = await Secret.findOne({ _id: secretId, componentId: component._id });
      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      const decryptedContent = await decryptComponentData(
        component._id.toString(),
        secret.encryptedData,
        secret.iv,
        secret.authTag
      );

      if (req.user) {
        await auditSecret(
          req.params.projectId,
          req.user.userId,
          'read',
          secret._id.toString(),
          { secretName: secret.name, componentId: component._id.toString(), componentName: component.name },
          req
        );
      }

      res.json({
        _id: secret._id,
        name: secret.name,
        content: decryptedContent,
        createdAt: secret.createdAt,
        updatedAt: secret.updatedAt,
      });
    } catch (error) {
      console.error('Get secret content error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to get secret content' });
    }
  }
);

router.put(
  '/:projectId/components/:componentId/secrets/:secretId',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('write'),
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .isLength({ min: 1, max: 100 })
      .matches(/^[a-zA-Z0-9\s\-_]+$/),
    body('content')
      .optional()
      .isString()
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
      const component = (req as AuthRequestWithOrg).component!;
      const secretId = req.params.secretId;
      const { name, content } = req.body;

      const secret = await Secret.findOne({ _id: secretId, componentId: component._id });
      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      if (name !== undefined && name.trim() !== secret.name) {
        const existingSecret = await Secret.findOne({
          componentId: component._id,
          name: name.trim(),
          _id: { $ne: secretId },
        });
        if (existingSecret) {
          res.status(400).json({ error: 'A secret with this name already exists in this component' });
          return;
        }
        secret.name = name.trim();
      }

      if (content !== undefined) {
        const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), content);
        secret.encryptedData = encryptedData;
        secret.iv = iv;
        secret.authTag = authTag;
      }

      await secret.save();

      await auditSecret(
        projectId,
        req.user.userId,
        'update',
        secret._id.toString(),
        { secretName: secret.name, componentId: component._id.toString(), componentName: component.name },
        req
      );

      const populatedSecret = await Secret.findById(secret._id)
        .populate('createdBy', 'name email')
        .select('-encryptedData -iv -authTag');

      res.json(populatedSecret);
    } catch (error) {
      console.error('Update secret error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to update secret' });
    }
  }
);

router.delete(
  '/:projectId/components/:componentId/secrets/:secretId',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('write'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const component = (req as AuthRequestWithOrg).component!;
      const secretId = req.params.secretId;

      const secret = await Secret.findOneAndDelete({ _id: secretId, componentId: component._id });
      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      if (req.user) {
        await auditSecret(
          projectId,
          req.user.userId,
          'delete',
          secret._id.toString(),
          { secretName: secret.name, componentId: component._id.toString(), componentName: component.name },
          req
        );
      }

      res.json({ message: 'Secret deleted successfully' });
    } catch (error) {
      console.error('Delete secret error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to delete secret' });
    }
  }
);

export default router;
