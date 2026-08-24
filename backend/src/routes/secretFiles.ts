import express, { Response } from 'express';
import multer from 'multer';
import { query, body, validationResult } from 'express-validator';
import SecretFile from '../models/SecretFile';
import { encryptComponentData, decryptComponentData } from '../crypto';
import { authenticate, AuthRequest } from '../lib/auth';
import { requireComponentAccess, AuthRequestWithOrg } from '../lib/authorization';
import { auditSecretFile } from '../lib/audit';
import {
  validateProjectId,
  validateComponentId,
  validateSecretFileId,
  validateEnvironment,
  validateEnvironmentQuery,
  validateFileContent,
  validateSecretFileName,
  validateSecretFileType,
  validateSecretFileLabel,
  validateSecretFileDescription,
  validateSecretFileNameQuery,
  isValidObjectId,
} from '../middleware/validation';
import { uploadRateLimiter } from '../middleware/security';
import { assertEnvAllowed, normalizeEnvSlug } from '../lib/environments';
import { diffEnvContent } from '../lib/envDiff';
import {
  MAX_SECRET_FILE_BYTES,
  buildContentDisposition,
  contentTypeForSecretFile,
  inferSecretFileType,
  isAllowedFileUploadName,
  isAllowedSecretFileName,
  pruneOldSecretFileVersions,
  sanitizeSecretFileName,
} from '../lib/secretFiles';

const router = express.Router({ mergeParams: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_SECRET_FILE_BYTES,
    files: 1,
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 100 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const filename = sanitizeSecretFileName(file.originalname);
    if (!filename) {
      return cb(new Error('Invalid filename'));
    }
    if (isAllowedFileUploadName(filename)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported secrets file extension'));
    }
  },
});

function resolveFileName(req: AuthRequest): string | null {
  const fromBody = req.body.fileName ? sanitizeSecretFileName(String(req.body.fileName)) : '';
  if (fromBody && isAllowedSecretFileName(fromBody)) {
    return fromBody;
  }
  if (req.file?.originalname) {
    const fromUpload = sanitizeSecretFileName(req.file.originalname);
    if (isAllowedSecretFileName(fromUpload)) {
      return fromUpload;
    }
  }
  return null;
}

/** Non-empty trimmed text, or undefined when blank. */
function normalizeOptionalText(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  const trimmed = String(value).trim();
  return trimmed || undefined;
}

/**
 * Upload: non-empty sets; omit inherits previous; empty inherits previous
 * so re-uploads keep metadata unless the client sends a new value.
 */
function resolveInheritedMeta(raw: unknown, previous?: string): string | undefined {
  if (raw === undefined || raw === null) return previous;
  const trimmed = String(raw).trim();
  return trimmed || previous;
}

/** Edit: present field sets or clears; omit keeps existing. */
function resolveEditableMeta(raw: unknown, existing?: string): string | undefined {
  if (raw === undefined) return existing;
  return normalizeOptionalText(raw);
}

router.post(
  '/:projectId/components/:componentId/secret-files',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  uploadRateLimiter,
  requireComponentAccess('write'),
  upload.single('file'),
  [validateEnvironment(), validateSecretFileName().optional(), validateSecretFileType(), validateSecretFileLabel(), validateSecretFileDescription()],
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
      const project = (req as AuthRequestWithOrg).project!;
      let environment: string;
      try {
        environment = assertEnvAllowed(project, req.body.environment);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }

      const fileName = resolveFileName(req);
      if (!fileName) {
        res.status(400).json({ error: 'A valid secrets file name is required' });
        return;
      }

      const content = req.body.content;
      let plaintextData: string;
      if (req.file) {
        plaintextData = req.file.buffer.toString('utf8');
      } else if (content) {
        plaintextData = content;
      } else {
        res.status(400).json({ error: 'Either file or content must be provided' });
        return;
      }

      if (plaintextData.length > MAX_SECRET_FILE_BYTES) {
        res.status(400).json({ error: 'Secrets file size must be less than 50KB' });
        return;
      }

      const fileType = req.body.fileType || inferSecretFileType(fileName);
      const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), plaintextData);

      const latest = await SecretFile.findOne({
        componentId: component._id,
        environment,
        fileName,
      })
        .sort({ version: -1 })
        .limit(1);

      const nextVersion = latest ? latest.version + 1 : 1;
      const label = resolveInheritedMeta(req.body.label, latest?.label);
      const description = resolveInheritedMeta(req.body.description, latest?.description);

      const secretFile = await SecretFile.create({
        projectId,
        componentId: component._id,
        environment,
        fileName,
        fileType,
        label,
        description,
        encryptedData,
        iv,
        authTag,
        contentType: contentTypeForSecretFile(fileName, fileType),
        version: nextVersion,
        uploadedBy: req.user.userId,
      });

      await pruneOldSecretFileVersions(component._id.toString(), environment, fileName);

      await auditSecretFile(
        projectId,
        req.user.userId,
        'upload',
        secretFile._id.toString(),
        {
          componentId: component._id.toString(),
          componentName: component.name,
          environment,
          fileName,
          fileType,
          version: nextVersion,
        },
        req
      );

      const populated = await SecretFile.findById(secretFile._id)
        .populate('uploadedBy', 'name email')
        .select('-encryptedData -iv -authTag');

      res.status(201).json({
        ...populated?.toObject(),
        message: 'Secrets file uploaded successfully',
      });
    } catch (error) {
      console.error('Upload secrets file error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to upload secrets file' });
    }
  }
);

router.get(
  '/:projectId/components/:componentId/secret-files/:secretFileId/content',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  validateSecretFileId(),
  requireComponentAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const component = (req as AuthRequestWithOrg).component!;
      const secretFileId = req.params.secretFileId;

      const secretFile = await SecretFile.findOne({
        _id: secretFileId,
        projectId,
        componentId: component._id,
      });

      if (!secretFile) {
        res.status(404).json({ error: 'Secrets file not found' });
        return;
      }

      const plaintextData = await decryptComponentData(
        component._id.toString(),
        secretFile.encryptedData,
        secretFile.iv,
        secretFile.authTag
      );

      if (req.user) {
        await auditSecretFile(
          projectId,
          req.user.userId,
          'view',
          secretFile._id.toString(),
          {
            componentId: component._id.toString(),
            componentName: component.name,
            environment: secretFile.environment,
            fileName: secretFile.fileName,
            version: secretFile.version,
          },
          req
        );
      }

      res.json({
        content: plaintextData,
        fileName: secretFile.fileName,
        fileType: secretFile.fileType,
        label: secretFile.label,
        description: secretFile.description,
      });
    } catch (error) {
      console.error('Get secrets file content error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to get secrets file content' });
    }
  }
);

router.get(
  '/:projectId/components/:componentId/secret-files',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('read'),
  [
    validateEnvironmentQuery(),
    validateSecretFileNameQuery(),
    query('version').optional().isInt({ min: 1, max: 10000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.projectId;
      const component = (req as AuthRequestWithOrg).component!;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string | undefined;
      const fileName = sanitizeSecretFileName(String(req.query.file || ''));
      const version = req.query.version ? parseInt(req.query.version as string, 10) : undefined;

      if (!environmentParam) {
        res.status(400).json({ error: 'Environment query parameter is required' });
        return;
      }

      let environment: string;
      try {
        environment = assertEnvAllowed(project, environmentParam);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }

      let secretFile;
      if (version) {
        secretFile = await SecretFile.findOne({ projectId, componentId: component._id, environment, fileName, version });
      } else {
        secretFile = await SecretFile.findOne({ projectId, componentId: component._id, environment, fileName })
          .sort({ version: -1 })
          .limit(1);
      }

      if (!secretFile) {
        res.status(404).json({
          error: version
            ? `No version ${version} found for "${fileName}" in "${environment}"`
            : `No secrets file "${fileName}" has been uploaded for "${environment}"`,
        });
        return;
      }

      const plaintextData = await decryptComponentData(
        component._id.toString(),
        secretFile.encryptedData,
        secretFile.iv,
        secretFile.authTag
      );

      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      await auditSecretFile(
        projectId,
        req.user.userId,
        'download',
        secretFile._id.toString(),
        {
          componentId: component._id.toString(),
          componentName: component.name,
          environment,
          fileName,
          version: secretFile.version,
        },
        req
      );

      res.setHeader('Content-Type', secretFile.contentType || contentTypeForSecretFile(fileName, secretFile.fileType));
      if (!isAllowedSecretFileName(secretFile.fileName)) {
        res.status(500).json({ error: 'Stored secrets file name is invalid' });
        return;
      }
      res.setHeader('Content-Disposition', buildContentDisposition(secretFile.fileName));
      res.send(plaintextData);
    } catch (error) {
      console.error('Download secrets file error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to download secrets file' });
    }
  }
);

router.get(
  '/:projectId/components/:componentId/secret-files/versions',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('read'),
  [validateEnvironmentQuery(), query('file').optional().trim()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const component = (req as AuthRequestWithOrg).component!;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string | undefined;
      const fileParam = req.query.file as string | undefined;

      const queryFilter: Record<string, unknown> = { projectId, componentId: component._id };

      if (environmentParam) {
        try {
          queryFilter.environment = assertEnvAllowed(project, environmentParam);
        } catch (err) {
          res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
          return;
        }
      }

      if (fileParam) {
        const fileName = sanitizeSecretFileName(fileParam);
        if (!isAllowedSecretFileName(fileName)) {
          res.status(400).json({ error: 'Invalid secrets file name or extension' });
          return;
        }
        queryFilter.fileName = fileName;
      }

      const secretFiles = await SecretFile.find(queryFilter)
        .select('-encryptedData -iv -authTag')
        .populate('uploadedBy', 'name email')
        .sort({ environment: 1, fileName: 1, version: -1 });

      res.set('Cache-Control', 'no-store');
      res.json(secretFiles);
    } catch (error) {
      console.error('List secrets file versions error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to list secrets file versions' });
    }
  }
);

router.put(
  '/:projectId/components/:componentId/secret-files/:secretFileId',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  validateSecretFileId(),
  requireComponentAccess('write'),
  [validateFileContent(), validateSecretFileLabel(), validateSecretFileDescription()],
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
      const component = (req as AuthRequestWithOrg).component!;
      const secretFileId = req.params.secretFileId;
      const content = req.body.content;
      const saveAsNewVersion =
        req.body.saveAsNewVersion === true ||
        req.body.saveAsNewVersion === 'true' ||
        req.query.saveAsNewVersion === 'true';

      const secretFile = await SecretFile.findOne({
        _id: secretFileId,
        projectId,
        componentId: component._id,
      });

      if (!secretFile) {
        res.status(404).json({ error: 'Secrets file not found' });
        return;
      }

      const oldVersion = secretFile.version;
      const { environment, fileName } = secretFile;
      const label = resolveEditableMeta(req.body.label, secretFile.label);
      const description = resolveEditableMeta(req.body.description, secretFile.description);
      const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), content);

      if (saveAsNewVersion) {
        const latest = await SecretFile.findOne({ componentId: component._id, environment, fileName })
          .sort({ version: -1 })
          .limit(1);
        const nextVersion = latest ? latest.version + 1 : 1;

        const newSecretFile = await SecretFile.create({
          projectId,
          componentId: component._id,
          environment,
          fileName,
          fileType: secretFile.fileType,
          label,
          description,
          encryptedData,
          iv,
          authTag,
          contentType: secretFile.contentType,
          version: nextVersion,
          uploadedBy: req.user.userId,
        });

        await pruneOldSecretFileVersions(component._id.toString(), environment, fileName);

        await auditSecretFile(
          projectId,
          req.user.userId,
          'upload',
          newSecretFile._id.toString(),
          {
            componentId: component._id.toString(),
            componentName: component.name,
            environment,
            fileName,
            version: nextVersion,
            basedOnVersion: oldVersion,
            createdFrom: 'edit',
          },
          req
        );

        const populated = await SecretFile.findById(newSecretFile._id)
          .populate('uploadedBy', 'name email')
          .select('-encryptedData -iv -authTag');

        res.status(201).json({
          ...populated?.toObject(),
          message: `Saved as new version ${nextVersion}`,
        });
        return;
      }

      const $set: Record<string, unknown> = { encryptedData, iv, authTag };
      const $unset: Record<string, 1> = {};
      if (label) $set.label = label;
      else $unset.label = 1;
      if (description) $set.description = description;
      else $unset.description = 1;

      await SecretFile.updateOne(
        { _id: secretFile._id },
        {
          $set,
          ...(Object.keys($unset).length > 0 ? { $unset } : {}),
        }
      );

      await auditSecretFile(
        projectId,
        req.user.userId,
        'edit',
        secretFileId,
        {
          componentId: component._id.toString(),
          componentName: component.name,
          environment,
          fileName,
          version: oldVersion,
        },
        req
      );

      const populated = await SecretFile.findById(secretFile._id)
        .populate('uploadedBy', 'name email')
        .select('-encryptedData -iv -authTag');

      res.json({
        ...populated?.toObject(),
        message: 'Secrets file updated successfully',
      });
    } catch (error) {
      console.error('Edit secrets file error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to update secrets file' });
    }
  }
);

router.delete(
  '/:projectId/components/:componentId/secret-files/:secretFileId',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  validateSecretFileId(),
  requireComponentAccess('write'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const projectId = req.params.projectId;
      const component = (req as AuthRequestWithOrg).component!;
      const secretFileId = req.params.secretFileId;

      const secretFile = await SecretFile.findOne({
        _id: secretFileId,
        projectId,
        componentId: component._id,
      });

      if (!secretFile) {
        res.status(404).json({ error: 'Secrets file not found' });
        return;
      }

      await auditSecretFile(
        projectId,
        req.user.userId,
        'delete',
        secretFileId,
        {
          componentId: component._id.toString(),
          componentName: component.name,
          environment: secretFile.environment,
          fileName: secretFile.fileName,
          version: secretFile.version,
        },
        req
      );

      await SecretFile.findByIdAndDelete(secretFileId);
      res.json({ message: 'Secrets file deleted successfully' });
    } catch (error) {
      console.error('Delete secrets file error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to delete secrets file' });
    }
  }
);

router.get(
  '/:projectId/components/:componentId/secret-files/diff',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('read'),
  [
    validateEnvironmentQuery(),
    validateSecretFileNameQuery(),
    query('from').isInt({ min: 1, max: 10000 }),
    query('to').isInt({ min: 1, max: 10000 }),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const projectId = req.params.projectId;
      const component = (req as AuthRequestWithOrg).component!;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string;
      const fileName = sanitizeSecretFileName(String(req.query.file));
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
        SecretFile.findOne({ projectId, componentId: component._id, environment, fileName, version: fromVersion }),
        SecretFile.findOne({ projectId, componentId: component._id, environment, fileName, version: toVersion }),
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
        decryptComponentData(component._id.toString(), fromFile.encryptedData, fromFile.iv, fromFile.authTag),
        decryptComponentData(component._id.toString(), toFile.encryptedData, toFile.iv, toFile.authTag),
      ]);

      res.json(diffEnvContent(fromContent, toContent));
    } catch (error) {
      console.error('Secrets file diff error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to diff secrets file versions' });
    }
  }
);

router.post(
  '/:projectId/components/:componentId/secret-files/rollback',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('write'),
  [
    validateEnvironment(),
    validateSecretFileName(),
    body('version').isInt({ min: 1, max: 10000 }),
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
      const component = (req as AuthRequestWithOrg).component!;
      const project = (req as AuthRequestWithOrg).project!;
      let environment: string;
      try {
        environment = assertEnvAllowed(project, req.body.environment);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }

      const fileName = sanitizeSecretFileName(req.body.fileName);
      const rollbackVersion = parseInt(req.body.version, 10);

      const sourceFile = await SecretFile.findOne({
        projectId,
        componentId: component._id,
        environment,
        fileName,
        version: rollbackVersion,
      });

      if (!sourceFile) {
        res.status(404).json({ error: 'Source version not found' });
        return;
      }

      const plaintextData = await decryptComponentData(
        component._id.toString(),
        sourceFile.encryptedData,
        sourceFile.iv,
        sourceFile.authTag
      );

      const latest = await SecretFile.findOne({ componentId: component._id, environment, fileName })
        .sort({ version: -1 })
        .limit(1);
      const nextVersion = latest ? latest.version + 1 : 1;

      const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), plaintextData);

      const secretFile = await SecretFile.create({
        projectId,
        componentId: component._id,
        environment,
        fileName,
        fileType: sourceFile.fileType,
        label: sourceFile.label,
        description: sourceFile.description,
        encryptedData,
        iv,
        authTag,
        contentType: sourceFile.contentType,
        version: nextVersion,
        uploadedBy: req.user.userId,
      });

      await pruneOldSecretFileVersions(component._id.toString(), environment, fileName);

      await auditSecretFile(
        projectId,
        req.user.userId,
        'rollback',
        secretFile._id.toString(),
        {
          componentId: component._id.toString(),
          componentName: component.name,
          environment,
          fileName,
          version: nextVersion,
          rolledBackFrom: rollbackVersion,
        },
        req
      );

      const populated = await SecretFile.findById(secretFile._id)
        .populate('uploadedBy', 'name email')
        .select('-encryptedData -iv -authTag');

      res.status(201).json({
        ...populated?.toObject(),
        message: `Rolled back to version ${rollbackVersion} as new version ${nextVersion}`,
      });
    } catch (error) {
      console.error('Rollback secrets file error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to rollback secrets file' });
    }
  }
);

router.get(
  '/:projectId/components/:componentId/secret-files/logs',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('read'),
  [validateEnvironmentQuery(), query('file').optional().trim()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const component = (req as AuthRequestWithOrg).component!;
      const project = (req as AuthRequestWithOrg).project!;
      const environmentParam = req.query.environment as string | undefined;
      const fileParam = req.query.file as string | undefined;

      const logQuery: Record<string, unknown> = {
        projectId,
        resourceType: 'secret_file',
        'metadata.componentId': component._id.toString(),
      };

      if (environmentParam) {
        try {
          logQuery['metadata.environment'] = assertEnvAllowed(project, environmentParam);
        } catch (err) {
          res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
          return;
        }
      }

      if (fileParam) {
        logQuery['metadata.fileName'] = sanitizeSecretFileName(fileParam);
      }

      const AuditLog = (await import('../models/AuditLog')).default;
      const logs = await AuditLog.find(logQuery).sort({ createdAt: -1 }).limit(1000);
      res.json(logs);
    } catch (error) {
      console.error('Get secrets file logs error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  }
);

export default router;
