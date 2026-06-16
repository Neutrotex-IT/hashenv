/**
 * Public API routes accessible via API tokens
 * These routes are meant for programmatic access (CI/CD, scripts, etc.)
 */
import express, { Response } from 'express';
import {
  authenticateApiToken,
  requireApiScope,
  requireApiTokenProject,
  ApiTokenRequest,
} from '../lib/apiTokenAuth';
import EnvFile from '../models/EnvFile';
import Secret from '../models/Secret';
import Project from '../models/Project';
import { encryptProjectData, decryptProjectData } from '../crypto';
import { audit } from '../lib/audit';
import { assertEnvAllowed } from '../lib/environments';

const router = express.Router();

const MAX_ENV_CONTENT_BYTES = 50 * 1024;

/**
 * Get environment file content
 * GET /api/v1/projects/:projectId/env
 * Query: environment (required)
 */
router.get(
  '/projects/:projectId/env',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('read'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { environment } = req.query;

      if (!environment || typeof environment !== 'string') {
        res.status(400).json({ error: 'Environment query parameter is required' });
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      let envSlug: string;
      try {
        envSlug = assertEnvAllowed(project, environment);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }

      const envFile = await EnvFile.findOne({ projectId, environment: envSlug }).sort({ version: -1 });

      if (!envFile) {
        res.status(404).json({ error: 'Environment file not found' });
        return;
      }

      const plaintextData = await decryptProjectData(
        projectId,
        envFile.encryptedData,
        envFile.iv,
        envFile.authTag
      );

      await audit({
        projectId,
        resourceType: 'env',
        resourceId: envFile._id.toString(),
        action: 'download',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: { environment: envSlug, version: envFile.version },
        req,
      });

      res.setHeader('Content-Type', 'text/plain');
      res.send(plaintextData);
    } catch (error) {
      console.error('API get env error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to get environment file' });
    }
  }
);

/**
 * List environment files
 * GET /api/v1/projects/:projectId/env/list
 */
router.get(
  '/projects/:projectId/env/list',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('read'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const envFiles = await EnvFile.aggregate([
        { $match: { projectId: req.project!._id } },
        { $sort: { version: -1 } },
        {
          $group: {
            _id: '$environment',
            environment: { $first: '$environment' },
            version: { $first: '$version' },
            updatedAt: { $first: '$createdAt' },
          },
        },
        { $project: { _id: 0 } },
      ]);

      res.json(envFiles);
    } catch (error) {
      console.error('API list env error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to list environment files' });
    }
  }
);

/**
 * Upload/update environment file
 * PUT /api/v1/projects/:projectId/env
 * Body: { environment: string, content: string }
 */
router.put(
  '/projects/:projectId/env',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('write'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { environment, content } = req.body;

      if (!environment || typeof environment !== 'string') {
        res.status(400).json({ error: 'Environment is required' });
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      let envSlug: string;
      try {
        envSlug = assertEnvAllowed(project, environment);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }

      if (content === undefined || typeof content !== 'string') {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      if (content.length > MAX_ENV_CONTENT_BYTES) {
        res.status(400).json({ error: 'Content size must be less than 50KB' });
        return;
      }

      const { encryptedData, iv, authTag } = await encryptProjectData(projectId, content);

      const latestEnv = await EnvFile.findOne({ projectId, environment: envSlug }).sort({ version: -1 });

      const newVersion = (latestEnv?.version || 0) + 1;

      const envFile = await EnvFile.create({
        projectId,
        environment: envSlug,
        encryptedData,
        iv,
        authTag,
        version: newVersion,
        uploadedBy: req.apiToken!.createdBy,
      });

      await audit({
        projectId,
        resourceType: 'env',
        resourceId: envFile._id.toString(),
        action: 'upload',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: { environment: envSlug, version: newVersion },
        req,
      });

      res.json({
        environment: envFile.environment,
        version: envFile.version,
        createdAt: envFile.createdAt,
      });
    } catch (error) {
      console.error('API upload env error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to upload environment file' });
    }
  }
);

/**
 * Get secret content
 * GET /api/v1/projects/:projectId/secrets/:secretName
 */
router.get(
  '/projects/:projectId/secrets/:secretName',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('read'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, secretName } = req.params;

      const secret = await Secret.findOne({
        projectId,
        name: secretName,
      });

      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      const decryptedContent = await decryptProjectData(
        projectId,
        secret.encryptedData,
        secret.iv,
        secret.authTag
      );

      await audit({
        projectId,
        resourceType: 'secret',
        resourceId: secret._id.toString(),
        action: 'read',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: { secretName },
        req,
      });

      res.json({
        name: secret.name,
        content: decryptedContent,
      });
    } catch (error) {
      console.error('API get secret error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to get secret' });
    }
  }
);

/**
 * List secrets (names only, not content)
 * GET /api/v1/projects/:projectId/secrets
 */
router.get(
  '/projects/:projectId/secrets',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('read'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;

      const secrets = await Secret.find({ projectId })
        .select('name createdAt updatedAt')
        .sort({ name: 1 });

      res.json(secrets);
    } catch (error) {
      console.error('API list secrets error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to list secrets' });
    }
  }
);

const SECRET_NAME_PATTERN = /^[a-zA-Z0-9\s\-_]+$/;
const MAX_SECRET_BYTES = 50 * 1024;

/**
 * Create a secret
 * POST /api/v1/projects/:projectId/secrets
 * Body: { name: string, content: string }
 */
router.post(
  '/projects/:projectId/secrets',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('write'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId } = req.params;
      const { name, content } = req.body;

      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Secret name is required' });
        return;
      }

      const trimmedName = name.trim();
      if (trimmedName.length > 100 || !SECRET_NAME_PATTERN.test(trimmedName)) {
        res.status(400).json({ error: 'Invalid secret name' });
        return;
      }

      if (content !== undefined && typeof content !== 'string') {
        res.status(400).json({ error: 'Content must be a string' });
        return;
      }

      const plaintext = content ?? '';
      if (plaintext.length > MAX_SECRET_BYTES) {
        res.status(400).json({ error: 'Content size must be less than 50KB' });
        return;
      }

      const existing = await Secret.findOne({ projectId, name: trimmedName });
      if (existing) {
        res.status(400).json({ error: 'A secret with this name already exists in this project' });
        return;
      }

      const { encryptedData, iv, authTag } = await encryptProjectData(projectId, plaintext);

      const secret = await Secret.create({
        projectId,
        name: trimmedName,
        encryptedData,
        iv,
        authTag,
        createdBy: req.apiToken!.createdBy,
      });

      await audit({
        projectId,
        resourceType: 'secret',
        resourceId: secret._id.toString(),
        action: 'create',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: { secretName: trimmedName },
        req,
      });

      res.status(201).json({
        name: secret.name,
        createdAt: secret.createdAt,
      });
    } catch (error) {
      console.error('API create secret error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to create secret' });
    }
  }
);

/**
 * Update a secret
 * PUT /api/v1/projects/:projectId/secrets/:secretName
 * Body: { content: string }
 */
router.put(
  '/projects/:projectId/secrets/:secretName',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('write'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, secretName } = req.params;
      const { content } = req.body;

      if (content === undefined || typeof content !== 'string') {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      if (content.length > MAX_SECRET_BYTES) {
        res.status(400).json({ error: 'Content size must be less than 50KB' });
        return;
      }

      const secret = await Secret.findOne({ projectId, name: secretName });
      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      const { encryptedData, iv, authTag } = await encryptProjectData(projectId, content);
      secret.encryptedData = encryptedData;
      secret.iv = iv;
      secret.authTag = authTag;
      await secret.save();

      await audit({
        projectId,
        resourceType: 'secret',
        resourceId: secret._id.toString(),
        action: 'update',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: { secretName },
        req,
      });

      res.json({
        name: secret.name,
        updatedAt: secret.updatedAt,
      });
    } catch (error) {
      console.error('API update secret error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to update secret' });
    }
  }
);

/**
 * Delete a secret
 * DELETE /api/v1/projects/:projectId/secrets/:secretName
 */
router.delete(
  '/projects/:projectId/secrets/:secretName',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('write'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, secretName } = req.params;

      const secret = await Secret.findOneAndDelete({ projectId, name: secretName });
      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      await audit({
        projectId,
        resourceType: 'secret',
        resourceId: secret._id.toString(),
        action: 'delete',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: { secretName },
        req,
      });

      res.json({ message: 'Secret deleted successfully' });
    } catch (error) {
      console.error('API delete secret error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to delete secret' });
    }
  }
);

export default router;
