/**
 * Public API routes accessible via API tokens
 * These routes are meant for programmatic access (CI/CD, scripts, etc.)
 */
import express, { Response } from 'express';
import { 
  authenticateApiToken, 
  requireApiScope, 
  requireApiTokenProject,
  ApiTokenRequest 
} from '../lib/apiTokenAuth';
import { EnvFile } from '../models/EnvFile';
import { Secret } from '../models/Secret';
import Project from '../models/Project';
import { encryptProjectData, decryptProjectData } from '../crypto';
import { auditEnv, auditSecret } from '../lib/audit';
import { assertEnvAllowed } from '../lib/environments';

const router = express.Router();

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
      
      // Find the latest env file for this environment
      const envFile = await EnvFile.findOne({ projectId, environment: envSlug })
        .sort({ version: -1 });
      
      if (!envFile) {
        res.status(404).json({ error: 'Environment file not found' });
        return;
      }
      
      // Decrypt content
      const decryptedContent = await decryptProjectData(
        projectId,
        envFile.encryptedContent,
        envFile.nonce,
        envFile.authTag
      );
      
      // Audit the access
      await auditEnv(projectId, 'download', req.apiToken!.tokenId, {
        environment,
        version: envFile.version,
        accessType: 'api_token',
      }, req);
      
      res.setHeader('Content-Type', 'text/plain');
      res.send(decryptedContent.toString('utf-8'));
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
      const { projectId } = req.params;
      
      // Get latest version of each environment
      const envFiles = await EnvFile.aggregate([
        { $match: { projectId: req.project!._id } },
        { $sort: { version: -1 } },
        { $group: {
          _id: '$environment',
          environment: { $first: '$environment' },
          version: { $first: '$version' },
          updatedAt: { $first: '$createdAt' },
        }},
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
      
      // Encrypt content
      const { ciphertext, nonce, authTag } = await encryptProjectData(
        projectId,
        Buffer.from(content, 'utf-8')
      );
      
      // Get current max version
      const latestEnv = await EnvFile.findOne({ projectId, environment: envSlug })
        .sort({ version: -1 });
      
      const newVersion = (latestEnv?.version || 0) + 1;
      
      // Create new version
      const envFile = await EnvFile.create({
        projectId,
        environment: envSlug,
        encryptedContent: ciphertext,
        nonce,
        authTag,
        version: newVersion,
      });
      
      // Audit the upload
      await auditEnv(projectId, 'upload', req.apiToken!.tokenId, {
        environment,
        version: newVersion,
        accessType: 'api_token',
      }, req);
      
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
        name: secretName 
      });
      
      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }
      
      // Decrypt content
      const decryptedContent = await decryptProjectData(
        projectId,
        secret.encryptedContent,
        secret.nonce,
        secret.authTag
      );
      
      // Audit the access
      await auditSecret(projectId, 'view', req.apiToken!.tokenId, {
        secretName,
        accessType: 'api_token',
      }, req);
      
      res.json({
        name: secret.name,
        content: decryptedContent.toString('utf-8'),
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

export default router;
