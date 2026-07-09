/**
 * Public API routes accessible via API tokens
 */
import express, { Response } from 'express';
import {
  authenticateApiToken,
  requireApiScope,
  requireApiTokenProject,
  ApiTokenRequest,
} from '../lib/apiTokenAuth';
import SecretFile from '../models/SecretFile';
import Secret from '../models/Secret';
import Project from '../models/Project';
import { encryptComponentData, decryptComponentData } from '../crypto';
import { audit } from '../lib/audit';
import { assertEnvAllowed } from '../lib/environments';
import { resolveComponentInProject } from '../lib/authorization';
import {
  buildContentDisposition,
  contentTypeForSecretFile,
  inferSecretFileType,
  isAllowedSecretFileName,
  sanitizeSecretFileName,
} from '../lib/secretFiles';

const router = express.Router();
const MAX_CONTENT_BYTES = 50 * 1024;
const SECRET_NAME_PATTERN = /^[a-zA-Z0-9\s\-_]+$/;

async function getComponentForApi(projectId: string, componentRef: string) {
  const component = await resolveComponentInProject(projectId, componentRef);
  if (!component) {
    return null;
  }
  return component;
}

router.get(
  '/projects/:projectId/components/:componentRef/secret-files',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('read'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, componentRef } = req.params;
      const { environment, file, version } = req.query;

      if (!environment || typeof environment !== 'string') {
        res.status(400).json({ error: 'Environment query parameter is required' });
        return;
      }
      if (!file || typeof file !== 'string') {
        res.status(400).json({ error: 'File query parameter is required' });
        return;
      }

      const fileName = sanitizeSecretFileName(file);
      if (!isAllowedSecretFileName(fileName)) {
        res.status(400).json({ error: 'Invalid secrets file name or extension' });
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const component = await getComponentForApi(projectId, componentRef);
      if (!component) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }

      let envSlug: string;
      try {
        envSlug = assertEnvAllowed(project, environment);
      } catch (err) {
        res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid environment' });
        return;
      }

      const versionNum = version ? parseInt(String(version), 10) : undefined;
      const secretFile = versionNum
        ? await SecretFile.findOne({
            projectId,
            componentId: component._id,
            environment: envSlug,
            fileName,
            version: versionNum,
          })
        : await SecretFile.findOne({ projectId, componentId: component._id, environment: envSlug, fileName })
            .sort({ version: -1 })
            .limit(1);

      if (!secretFile) {
        res.status(404).json({ error: `No secrets file "${fileName}" found for "${envSlug}"` });
        return;
      }

      const plaintextData = await decryptComponentData(
        component._id.toString(),
        secretFile.encryptedData,
        secretFile.iv,
        secretFile.authTag
      );

      await audit({
        projectId,
        resourceType: 'secret_file',
        resourceId: secretFile._id.toString(),
        action: 'download',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: {
          componentId: component._id.toString(),
          componentName: component.name,
          environment: envSlug,
          fileName,
          version: secretFile.version,
        },
        req,
      });

      res.setHeader('Content-Type', secretFile.contentType || contentTypeForSecretFile(fileName, secretFile.fileType));
      res.setHeader('Content-Disposition', buildContentDisposition(secretFile.fileName));
      res.send(plaintextData);
    } catch (error) {
      console.error('API get secret file error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to get secrets file' });
    }
  }
);

router.get(
  '/projects/:projectId/components/:componentRef/secret-files/list',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('read'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, componentRef } = req.params;
      const component = await getComponentForApi(projectId, componentRef);
      if (!component) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }

      const secretFiles = await SecretFile.aggregate([
        { $match: { projectId: req.project!._id, componentId: component._id } },
        { $sort: { version: -1 } },
        {
          $group: {
            _id: { environment: '$environment', fileName: '$fileName' },
            environment: { $first: '$environment' },
            fileName: { $first: '$fileName' },
            fileType: { $first: '$fileType' },
            version: { $first: '$version' },
            updatedAt: { $first: '$createdAt' },
          },
        },
        { $project: { _id: 0 } },
      ]);

      res.json(secretFiles);
    } catch (error) {
      console.error('API list secret files error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to list secrets files' });
    }
  }
);

router.put(
  '/projects/:projectId/components/:componentRef/secret-files',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('write'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, componentRef } = req.params;
      const { environment, fileName, fileType, content } = req.body;

      if (!environment || typeof environment !== 'string') {
        res.status(400).json({ error: 'Environment is required' });
        return;
      }
      if (!fileName || typeof fileName !== 'string') {
        res.status(400).json({ error: 'File name is required' });
        return;
      }

      const normalizedFileName = sanitizeSecretFileName(fileName);
      if (!isAllowedSecretFileName(normalizedFileName)) {
        res.status(400).json({ error: 'Invalid secrets file name or extension' });
        return;
      }

      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404).json({ error: 'Project not found' });
        return;
      }

      const component = await getComponentForApi(projectId, componentRef);
      if (!component) {
        res.status(404).json({ error: 'Component not found' });
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

      if (content.length > MAX_CONTENT_BYTES) {
        res.status(400).json({ error: 'Content size must be less than 50KB' });
        return;
      }

      const resolvedFileType = fileType || inferSecretFileType(normalizedFileName);
      const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), content);

      const latest = await SecretFile.findOne({
        projectId,
        componentId: component._id,
        environment: envSlug,
        fileName: normalizedFileName,
      }).sort({ version: -1 });

      const newVersion = (latest?.version || 0) + 1;

      const secretFile = await SecretFile.create({
        projectId,
        componentId: component._id,
        environment: envSlug,
        fileName: normalizedFileName,
        fileType: resolvedFileType,
        encryptedData,
        iv,
        authTag,
        contentType: contentTypeForSecretFile(normalizedFileName, resolvedFileType),
        version: newVersion,
        uploadedBy: req.apiToken!.createdBy,
      });

      await audit({
        projectId,
        resourceType: 'secret_file',
        resourceId: secretFile._id.toString(),
        action: 'upload',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: {
          componentId: component._id.toString(),
          componentName: component.name,
          environment: envSlug,
          fileName: normalizedFileName,
          version: newVersion,
        },
        req,
      });

      res.json({
        environment: secretFile.environment,
        fileName: secretFile.fileName,
        fileType: secretFile.fileType,
        version: secretFile.version,
        createdAt: secretFile.createdAt,
      });
    } catch (error) {
      console.error('API upload secret file error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to upload secrets file' });
    }
  }
);

router.get(
  '/projects/:projectId/components/:componentRef/secrets/:secretName',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('read'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, componentRef, secretName } = req.params;
      const component = await getComponentForApi(projectId, componentRef);
      if (!component) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }

      const secret = await Secret.findOne({ componentId: component._id, name: secretName });
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

      await audit({
        projectId,
        resourceType: 'secret',
        resourceId: secret._id.toString(),
        action: 'read',
        actorType: 'api_token',
        actorId: req.apiToken!.tokenId,
        metadata: { secretName, componentId: component._id.toString(), componentName: component.name },
        req,
      });

      res.json({ name: secret.name, content: decryptedContent });
    } catch (error) {
      console.error('API get secret error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to get secret' });
    }
  }
);

router.get(
  '/projects/:projectId/components/:componentRef/secrets',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('read'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, componentRef } = req.params;
      const component = await getComponentForApi(projectId, componentRef);
      if (!component) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }

      const secrets = await Secret.find({ componentId: component._id })
        .select('name createdAt updatedAt')
        .sort({ name: 1 });

      res.json(secrets);
    } catch (error) {
      console.error('API list secrets error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to list secrets' });
    }
  }
);

router.post(
  '/projects/:projectId/components/:componentRef/secrets',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('write'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, componentRef } = req.params;
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

      const component = await getComponentForApi(projectId, componentRef);
      if (!component) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }

      const plaintext = content ?? '';
      if (typeof plaintext !== 'string' || plaintext.length > MAX_CONTENT_BYTES) {
        res.status(400).json({ error: 'Content must be a string under 50KB' });
        return;
      }

      const existing = await Secret.findOne({ componentId: component._id, name: trimmedName });
      if (existing) {
        res.status(400).json({ error: 'A secret with this name already exists in this component' });
        return;
      }

      const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), plaintext);

      const secret = await Secret.create({
        projectId,
        componentId: component._id,
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
        metadata: { secretName: trimmedName, componentId: component._id.toString(), componentName: component.name },
        req,
      });

      res.status(201).json({ name: secret.name, createdAt: secret.createdAt });
    } catch (error) {
      console.error('API create secret error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to create secret' });
    }
  }
);

router.put(
  '/projects/:projectId/components/:componentRef/secrets/:secretName',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('write'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, componentRef, secretName } = req.params;
      const { content } = req.body;

      const component = await getComponentForApi(projectId, componentRef);
      if (!component) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }

      if (content === undefined || typeof content !== 'string') {
        res.status(400).json({ error: 'Content is required' });
        return;
      }

      if (content.length > MAX_CONTENT_BYTES) {
        res.status(400).json({ error: 'Content size must be less than 50KB' });
        return;
      }

      const secret = await Secret.findOne({ componentId: component._id, name: secretName });
      if (!secret) {
        res.status(404).json({ error: 'Secret not found' });
        return;
      }

      const { encryptedData, iv, authTag } = await encryptComponentData(component._id.toString(), content);
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
        metadata: { secretName, componentId: component._id.toString(), componentName: component.name },
        req,
      });

      res.json({ name: secret.name, updatedAt: secret.updatedAt });
    } catch (error) {
      console.error('API update secret error:', error instanceof Error ? error.message : 'Unknown');
      res.status(500).json({ error: 'Failed to update secret' });
    }
  }
);

router.delete(
  '/projects/:projectId/components/:componentRef/secrets/:secretName',
  authenticateApiToken,
  requireApiTokenProject,
  requireApiScope('write'),
  async (req: ApiTokenRequest, res: Response): Promise<void> => {
    try {
      const { projectId, componentRef, secretName } = req.params;
      const component = await getComponentForApi(projectId, componentRef);
      if (!component) {
        res.status(404).json({ error: 'Component not found' });
        return;
      }

      const secret = await Secret.findOneAndDelete({ componentId: component._id, name: secretName });
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
        metadata: { secretName, componentId: component._id.toString(), componentName: component.name },
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
