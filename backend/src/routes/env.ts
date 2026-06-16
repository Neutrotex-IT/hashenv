import express, { Response } from 'express';
import multer from 'multer';
import { query, body, validationResult } from 'express-validator';
import EnvFile from '../models/EnvFile';
import { encryptProjectData, decryptProjectData } from '../crypto';
import { authenticate, AuthRequest } from '../lib/auth';
import { requireProjectAccess } from '../lib/authorization';
import { auditEnv } from '../lib/audit';
import { validateProjectId, validateEnvFileId, validateEnvironment, validateEnvironmentQuery, validateFileContent, isValidObjectId } from '../middleware/validation';
import { uploadRateLimiter } from '../middleware/security';
import { AuthRequestWithOrg } from '../lib/authorization';
import { assertEnvAllowed, normalizeEnvSlug } from '../lib/environments';
import { diffEnvContent } from '../lib/envDiff';

const router = express.Router();

// Configure multer for file upload
// Security: Store file in memory (Buffer) - limit to 50KB as per requirements
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024, // 50KB limit
    files: 1, // Only one file at a time
    fields: 10, // Limit number of fields
    fieldNameSize: 100, // Limit field name size
    fieldSize: 100 * 1024, // Limit field value size
  },
  fileFilter: (req, file, cb) => {
    // Security: Accept only .env files
    const filename = file.originalname.toLowerCase();
    
    // Check for null bytes (path traversal attempt)
    if (filename.includes('\0')) {
      return cb(new Error('Invalid filename'));
    }
    
    // Security: Prevent path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return cb(new Error('Invalid filename'));
    }
    
    // Accept only .env files
    if (filename === '.env' || filename.endsWith('.env')) {
      cb(null, true);
    } else {
      cb(new Error('Only .env files are allowed'));
    }
  },
});

/**
 * Upload an environment file (file or text)
 * POST /api/projects/:projectId/env
 * Requires: write permission
 * Body: { file?: File, content?: string, environment: 'dev'|'staging'|'prod' }
 * Security: Rate limited, validated inputs
 */
router.post(
  '/:projectId/env',
  authenticate,
  validateProjectId(), // Security: Validate ObjectId format
  uploadRateLimiter, // Security: Rate limit uploads
  requireProjectAccess('write'),
  upload.single('file'),
  [validateEnvironment()],
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
      const project = (req as AuthRequestWithOrg).project!;
      let environment: string;
      try {
        environment = assertEnvAllowed(project, req.body.environment);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }
      const content = req.body.content; // Text content (alternative to file)
      
      // Additional ObjectId validation
      if (!isValidObjectId(projectId)) {
        res.status(400).json({ error: 'Invalid project ID format' });
        return;
      }
      
      // Get plaintext data from either file or text content
      let plaintextData: string;
      if (req.file) {
        plaintextData = req.file.buffer.toString('utf8');
        // Validate file size (50KB limit)
        if (plaintextData.length > 50 * 1024) {
          res.status(400).json({ error: 'File size must be less than 50KB' });
          return;
        }
      } else if (content) {
        plaintextData = content;
        // Validate content size (50KB limit)
        if (plaintextData.length > 50 * 1024) {
          res.status(400).json({ error: 'Content size must be less than 50KB' });
          return;
        }
      } else {
        res.status(400).json({ error: 'Either file or content must be provided' });
        return;
      }
      
      // Encrypt the data using project-specific key
      const { encryptedData, iv, authTag } = await encryptProjectData(projectId, plaintextData);
      
      // Find the latest version for this project+environment
      const latestEnvFile = await EnvFile.findOne({
        projectId,
        environment,
      })
        .sort({ version: -1 })
        .limit(1);
      
      const nextVersion = latestEnvFile ? latestEnvFile.version + 1 : 1;
      
      // Store encrypted data in database
      const envFile = await EnvFile.create({
        projectId,
        environment,
        encryptedData,
        iv,
        authTag,
        version: nextVersion,
        uploadedBy: req.user.userId,
      });
      
      // Audit the upload action
      await auditEnv(projectId, req.user.userId, 'upload', envFile._id.toString(), {
        environment,
        version: nextVersion,
      }, req);
      
      // Return metadata (never return encrypted data or plaintext)
      const populatedEnvFile = await EnvFile.findById(envFile._id)
        .populate('uploadedBy', 'name email')
        .select('-encryptedData -iv -authTag'); // Exclude sensitive fields
      
      res.status(201).json({
        ...populatedEnvFile?.toObject(),
        message: 'Environment file uploaded successfully',
      });
    } catch (error) {
      // Security: Don't log sensitive error details
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Upload env file error:', errMessage);
      res.status(500).json({ error: 'Failed to upload environment file' });
    }
  }
);

/**
 * Get environment file content (for editing)
 * GET /api/projects/:projectId/env/:envFileId/content
 * Requires: read permission (project owner can edit)
 */
router.get(
  '/:projectId/env/:envFileId/content',
  authenticate,
  validateProjectId(), // Security: Validate ObjectId format
  validateEnvFileId(), // Security: Validate ObjectId format
  requireProjectAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const envFileId = req.params.envFileId;
      
      // Additional validation
      if (!isValidObjectId(projectId) || !isValidObjectId(envFileId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }
      
      // Find the env file
      const envFile = await EnvFile.findOne({
        _id: envFileId,
        projectId,
      });
      
      if (!envFile) {
        res.status(404).json({
          error: 'Environment file not found',
        });
        return;
      }
      
      // Decrypt the data using project-specific key
      const plaintextData = await decryptProjectData(
        projectId,
        envFile.encryptedData,
        envFile.iv,
        envFile.authTag
      );
      
      res.json({ content: plaintextData });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Get env file content error:', errMessage);
      res.status(500).json({ error: 'Failed to get environment file content' });
    }
  }
);

/**
 * Download an environment file
 * GET /api/projects/:projectId/env?environment=prod&version=1
 * Requires: read permission
 * If version is not specified, returns the latest version
 */
router.get(
  '/:projectId/env',
  authenticate,
  validateProjectId(), // Security: Validate ObjectId format
  requireProjectAccess('read'),
  [
    validateEnvironmentQuery(),
    query('version').optional().isInt({ min: 1, max: 10000 }).withMessage('Version must be a positive integer'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      const projectId = req.params.projectId;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string | undefined;

      if (environmentParam) {
        try {
          assertEnvAllowed(project, environmentParam);
        } catch (err) {
          res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
          return;
        }
      }
      const environment = environmentParam ? normalizeEnvSlug(environmentParam) : undefined;
      const version = req.query.version ? parseInt(req.query.version as string) : undefined;

      if (!environment) {
        res.status(400).json({ error: 'Environment query parameter is required' });
        return;
      }
      
      // Find the env file
      let envFile;
      if (version) {
        envFile = await EnvFile.findOne({
          projectId,
          environment,
          version,
        });
      } else {
        // Get latest version
        envFile = await EnvFile.findOne({
          projectId,
          environment,
        })
          .sort({ version: -1 })
          .limit(1);
      }
      
      if (!envFile) {
        res.status(404).json({
          error: 'Environment file not found',
        });
        return;
      }
      
      // Decrypt the data using project-specific key
      const plaintextData = await decryptProjectData(
        projectId,
        envFile.encryptedData,
        envFile.iv,
        envFile.authTag
      );
      
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      
      // Audit the download action
      await auditEnv(projectId, req.user.userId, 'download', envFile._id.toString(), {
        environment,
        version: envFile.version,
      }, req);
      
      // Return as downloadable file
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename=".env"`);
      res.send(plaintextData);
      
      // Note: Response is sent, so no further code executes
    } catch (error) {
      // Security: Don't log decryption errors in detail
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Download env file error:', errMessage);
      // Do not expose decryption errors in detail for security
      res.status(500).json({ error: 'Failed to download environment file' });
    }
  }
);

/**
 * List all versions of environment files for a project
 * GET /api/projects/:projectId/env/versions?environment=prod
 * Requires: read permission
 */
router.get(
  '/:projectId/env/versions',
  authenticate,
  validateProjectId(), // Security: Validate ObjectId format
  requireProjectAccess('read'),
  [validateEnvironmentQuery()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string | undefined;

      if (environmentParam) {
        try {
          assertEnvAllowed(project, environmentParam);
        } catch (err) {
          res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
          return;
        }
      }
      const environment = environmentParam ? normalizeEnvSlug(environmentParam) : undefined;
      
      const query: any = { projectId };
      if (environment) {
        query.environment = environment;
      }
      
      // Get all versions (excluding encrypted data)
      const envFiles = await EnvFile.find(query)
        .select('-encryptedData -iv -authTag') // Never return encrypted data
        .populate('uploadedBy', 'name email')
        .sort({ environment: 1, version: -1 });
      
      res.json(envFiles);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('List env versions error:', errMessage);
      res.status(500).json({ error: 'Failed to list environment file versions' });
    }
  }
);

/**
 * Edit an environment file
 * PUT /api/projects/:projectId/env/:envFileId
 * Requires: write permission
 */
router.put(
  '/:projectId/env/:envFileId',
  authenticate,
  validateProjectId(),
  validateEnvFileId(),
  requireProjectAccess('write'),
  [validateFileContent()],
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
      
      const projectId = req.params.projectId;
      const envFileId = req.params.envFileId;
      const content = req.body.content;
      
      // Find the env file
      const envFile = await EnvFile.findOne({
        _id: envFileId,
        projectId,
      });
      
      if (!envFile) {
        res.status(404).json({ error: 'Environment file not found' });
        return;
      }
      
      const oldVersion = envFile.version;
      
      // Encrypt the new content using project-specific key
      const { encryptedData, iv, authTag } = await encryptProjectData(projectId, content);
      
      // Update the env file
      envFile.encryptedData = encryptedData;
      envFile.iv = iv;
      envFile.authTag = authTag;
      await envFile.save();
      
      // Audit the edit action
      await auditEnv(projectId, req.user.userId, 'edit', envFileId, {
        environment: envFile.environment,
        version: oldVersion,
      }, req);
      
      // Return updated metadata
      const populatedEnvFile = await EnvFile.findById(envFile._id)
        .populate('uploadedBy', 'name email')
        .select('-encryptedData -iv -authTag');
      
      res.json({
        ...populatedEnvFile?.toObject(),
        message: 'Environment file updated successfully',
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Edit env file error:', errMsg);
      res.status(500).json({ error: 'Failed to update environment file' });
    }
  }
);

/**
 * Delete an environment file
 * DELETE /api/projects/:projectId/env/:envFileId
 * Requires: write permission
 */
router.delete(
  '/:projectId/env/:envFileId',
  authenticate,
  validateProjectId(),
  validateEnvFileId(),
  requireProjectAccess('write'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }
      
      const projectId = req.params.projectId;
      const envFileId = req.params.envFileId;
      
      // Additional validation
      if (!isValidObjectId(projectId) || !isValidObjectId(envFileId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }
      
      // Find the env file
      const envFile = await EnvFile.findOne({
        _id: envFileId,
        projectId,
      });
      
      if (!envFile) {
        res.status(404).json({ error: 'Environment file not found' });
        return;
      }
      
      const environment = envFile.environment;
      const version = envFile.version;
      
      // Audit the delete action before deletion
      await auditEnv(projectId, req.user.userId, 'delete', envFileId, {
        environment,
        version,
      }, req);
      
      // Delete the env file
      await EnvFile.findByIdAndDelete(envFileId);
      
      res.json({ message: 'Environment file deleted successfully' });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Delete env file error:', errMessage);
      res.status(500).json({ error: 'Failed to delete environment file' });
    }
  }
);

/**
 * Compare two env file versions
 * GET /api/projects/:projectId/env/diff?environment=dev&from=1&to=2
 * Requires: read permission
 */
router.get(
  '/:projectId/env/diff',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  [
    validateEnvironmentQuery(),
    query('from').isInt({ min: 1, max: 10000 }).withMessage('from version is required'),
    query('to').isInt({ min: 1, max: 10000 }).withMessage('to version is required'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.projectId;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string;
      const fromVersion = parseInt(req.query.from as string, 10);
      const toVersion = parseInt(req.query.to as string, 10);

      let environment: string;
      try {
        environment = assertEnvAllowed(project, environmentParam);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }

      if (fromVersion === toVersion) {
        res.status(400).json({ error: 'from and to versions must be different' });
        return;
      }

      const [fromFile, toFile] = await Promise.all([
        EnvFile.findOne({ projectId, environment, version: fromVersion }),
        EnvFile.findOne({ projectId, environment, version: toVersion }),
      ]);

      if (!fromFile) {
        res.status(404).json({ error: `Version ${fromVersion} not found` });
        return;
      }
      if (!toFile) {
        res.status(404).json({ error: `Version ${toVersion} not found` });
        return;
      }

      const [fromContent, toContent] = await Promise.all([
        decryptProjectData(projectId, fromFile.encryptedData, fromFile.iv, fromFile.authTag),
        decryptProjectData(projectId, toFile.encryptedData, toFile.iv, toFile.authTag),
      ]);

      res.json(diffEnvContent(fromContent, toContent));
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Env diff error:', errMessage);
      res.status(500).json({ error: 'Failed to diff environment versions' });
    }
  }
);

/**
 * Get logs for a project
 * GET /api/projects/:projectId/env/logs?environment=prod
 * Requires: read permission
 */
router.get(
  '/:projectId/env/logs',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  [validateEnvironmentQuery()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.projectId;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string | undefined;

      const logQuery: Record<string, unknown> = { projectId, resourceType: 'env' };
      if (environmentParam) {
        try {
          logQuery['metadata.environment'] = assertEnvAllowed(project, environmentParam);
        } catch (err) {
          res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
          return;
        }
      }

      const AuditLog = (await import('../models/AuditLog')).default;
      const logs = await AuditLog.find(logQuery)
        .sort({ createdAt: -1 })
        .limit(1000);
      
      res.json(logs);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Get logs error:', errMessage);
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }
);

/**
 * Rollback environment to a previous version (creates new version from old content)
 * POST /api/projects/:projectId/env/rollback
 * Requires: write permission
 */
router.post(
  '/:projectId/env/rollback',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  [
    validateEnvironment(),
    body('version').isInt({ min: 1, max: 10000 }).withMessage('Version must be a positive integer'),
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

      const projectId = req.params.projectId;
      const project = (req as AuthRequestWithOrg).project!;
      let environment: string;
      try {
        environment = assertEnvAllowed(project, req.body.environment);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }
      const rollbackVersion = parseInt(req.body.version, 10);

      const sourceFile = await EnvFile.findOne({ projectId, environment, version: rollbackVersion });
      if (!sourceFile) {
        res.status(404).json({ error: 'Source version not found' });
        return;
      }

      const plaintextData = await decryptProjectData(
        projectId,
        sourceFile.encryptedData,
        sourceFile.iv,
        sourceFile.authTag
      );

      const latestEnvFile = await EnvFile.findOne({ projectId, environment })
        .sort({ version: -1 })
        .limit(1);

      const nextVersion = latestEnvFile ? latestEnvFile.version + 1 : 1;

      const { encryptedData, iv, authTag } = await encryptProjectData(projectId, plaintextData);

      const envFile = await EnvFile.create({
        projectId,
        environment,
        encryptedData,
        iv,
        authTag,
        version: nextVersion,
        uploadedBy: req.user.userId,
      });

      await auditEnv(projectId, req.user.userId, 'rollback', envFile._id.toString(), {
        environment,
        version: nextVersion,
        rolledBackFrom: rollbackVersion,
      }, req);

      const populatedEnvFile = await EnvFile.findById(envFile._id)
        .populate('uploadedBy', 'name email')
        .select('-encryptedData -iv -authTag');

      res.status(201).json({
        ...populatedEnvFile?.toObject(),
        message: `Rolled back to version ${rollbackVersion} as new version ${nextVersion}`,
      });
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Rollback env file error:', errMessage);
      res.status(500).json({ error: 'Failed to rollback environment file' });
    }
  }
);

/**
 * Download logs as text file
 * GET /api/projects/:projectId/env/logs/download
 * Requires: read permission
 */
router.get(
  '/:projectId/env/logs/download',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  [validateEnvironmentQuery()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.projectId;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string | undefined;

      const logQuery: Record<string, unknown> = { projectId, resourceType: 'env' };
      if (environmentParam) {
        try {
          logQuery['metadata.environment'] = assertEnvAllowed(project, environmentParam);
        } catch (err) {
          res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
          return;
        }
      }

      const AuditLog = (await import('../models/AuditLog')).default;
      const logs = await AuditLog.find(logQuery)
        .sort({ createdAt: -1 })
        .limit(1000);
      
      let logText = `HashEnv Activity Logs\n`;
      logText += `Project ID: ${projectId}\n`;
      logText += `Generated: ${new Date().toISOString()}\n`;
      logText += `${'='.repeat(80)}\n\n`;
      
      if (logs.length === 0) {
        logText += 'No logs found.\n';
      } else {
        logs.forEach((log) => {
          const date = new Date(log.createdAt).toLocaleString();
          logText += `[${date}] ${log.action.toUpperCase()}\n`;
          if (log.metadata?.environment) {
            logText += `  Environment: ${log.metadata.environment}\n`;
          }
          if (log.metadata?.version) {
            logText += `  Version: ${log.metadata.version}\n`;
          }
          logText += `  Actor: ${log.actorEmail || log.actorId}\n`;
          if (log.ipAddress) {
            logText += `  IP: ${log.ipAddress}\n`;
          }
          logText += '\n';
        });
      }
      
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Disposition', `attachment; filename="hashenv-logs-${Date.now()}.txt"`);
      res.send(logText);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Download logs error:', errMessage);
      res.status(500).json({ error: 'Failed to download logs' });
    }
  }
);

export default router;
