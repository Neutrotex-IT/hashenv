import express, { Response } from 'express';
import mongoose from 'mongoose';
import { body, query, validationResult } from 'express-validator';
import EnvFile from '../models/EnvFile';
import { authenticate, AuthRequest } from '../lib/auth';
import {
  requireProjectAccess,
  AuthRequestWithOrg,
} from '../lib/authorization';
import {
  validateProjectId,
  validateEnvironmentSlugParam,
  validateEnvironmentName,
} from '../middleware/validation';
import {
  getProjectEnvironments,
  MAX_ENVIRONMENTS_PER_PROJECT,
  normalizeEnvSlug,
} from '../lib/environments';
import { auditProject } from '../lib/audit';

const router = express.Router();

/**
 * List project environments with metadata
 * GET /api/projects/:id/environments
 */
router.get(
  '/:id/environments',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const project = (req as AuthRequestWithOrg).project!;
      const slugs = getProjectEnvironments(project);

      const envMeta = await EnvFile.aggregate([
        { $match: { projectId: project._id } },
        { $sort: { version: -1 } },
        {
          $group: {
            _id: '$environment',
            latestVersion: { $first: '$version' },
            updatedAt: { $first: '$createdAt' },
            versionCount: { $sum: 1 },
          },
        },
      ]);

      const metaBySlug = new Map(
        envMeta.map((item) => [
          item._id as string,
          {
            hasFiles: true,
            latestVersion: item.latestVersion as number,
            updatedAt: item.updatedAt as Date,
            versionCount: item.versionCount as number,
          },
        ])
      );

      const environments = slugs.map((slug) => ({
        slug,
        hasFiles: metaBySlug.get(slug)?.hasFiles ?? false,
        latestVersion: metaBySlug.get(slug)?.latestVersion ?? null,
        updatedAt: metaBySlug.get(slug)?.updatedAt ?? null,
        versionCount: metaBySlug.get(slug)?.versionCount ?? 0,
      }));

      res.json(environments);
    } catch (error) {
      console.error('List environments error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Failed to list environments' });
    }
  }
);

/**
 * Add a project environment slug
 * POST /api/projects/:id/environments
 */
router.post(
  '/:id/environments',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  [validateEnvironmentName()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const project = (req as AuthRequestWithOrg).project!;
      const slug = normalizeEnvSlug(req.body.name);
      const environments = getProjectEnvironments(project);

      if (environments.includes(slug)) {
        res.status(400).json({ error: 'Environment already exists' });
        return;
      }

      if (environments.length >= MAX_ENVIRONMENTS_PER_PROJECT) {
        res.status(400).json({ error: `Maximum of ${MAX_ENVIRONMENTS_PER_PROJECT} environments per project` });
        return;
      }

      project.environments = [...environments, slug];
      await project.save();

      await auditProject(
        project._id.toString(),
        project.organizationId.toString(),
        req.user!.userId,
        'update',
        { action: 'add_environment', environment: slug },
        req
      );

      res.status(201).json({
        slug,
        hasFiles: false,
        latestVersion: null,
        updatedAt: null,
        versionCount: 0,
      });
    } catch (error) {
      console.error('Add environment error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Failed to add environment' });
    }
  }
);

/**
 * Rename a project environment (updates all env file rows)
 * PATCH /api/projects/:id/environments/:slug
 */
router.patch(
  '/:id/environments/:slug',
  authenticate,
  validateProjectId(),
  validateEnvironmentSlugParam(),
  requireProjectAccess('write'),
  [validateEnvironmentName()],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        await session.abortTransaction();
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const project = (req as AuthRequestWithOrg).project!;
      const oldSlug = req.params.slug;
      const newSlug = normalizeEnvSlug(req.body.name);
      const environments = getProjectEnvironments(project);

      if (!environments.includes(oldSlug)) {
        await session.abortTransaction();
        res.status(404).json({ error: 'Environment not found' });
        return;
      }

      if (oldSlug !== newSlug && environments.includes(newSlug)) {
        await session.abortTransaction();
        res.status(400).json({ error: 'Environment with that name already exists' });
        return;
      }

      if (oldSlug !== newSlug) {
        project.environments = environments.map((s) => (s === oldSlug ? newSlug : s));
        await project.save({ session });

        await EnvFile.updateMany(
          { projectId: project._id, environment: oldSlug },
          { $set: { environment: newSlug } },
          { session }
        );
      }

      await session.commitTransaction();

      await auditProject(
        project._id.toString(),
        project.organizationId.toString(),
        req.user!.userId,
        'update',
        { action: 'rename_environment', from: oldSlug, to: newSlug },
        req
      );

      const latest = await EnvFile.findOne({ projectId: project._id, environment: newSlug })
        .sort({ version: -1 })
        .select('version createdAt');

      res.json({
        slug: newSlug,
        hasFiles: Boolean(latest),
        latestVersion: latest?.version ?? null,
        updatedAt: latest?.createdAt ?? null,
      });
    } catch (error) {
      await session.abortTransaction();
      console.error('Rename environment error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Failed to rename environment' });
    } finally {
      session.endSession();
    }
  }
);

/**
 * Remove a project environment slug
 * DELETE /api/projects/:id/environments/:slug?force=true
 */
router.delete(
  '/:id/environments/:slug',
  authenticate,
  validateProjectId(),
  validateEnvironmentSlugParam(),
  requireProjectAccess('write'),
  [query('force').optional().isBoolean().withMessage('force must be a boolean')],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const project = (req as AuthRequestWithOrg).project!;
      const slug = req.params.slug;
      const environments = getProjectEnvironments(project);
      const force = req.query.force === 'true';

      if (!environments.includes(slug)) {
        await session.abortTransaction();
        res.status(404).json({ error: 'Environment not found' });
        return;
      }

      if (environments.length <= 1) {
        await session.abortTransaction();
        res.status(400).json({ error: 'Cannot delete the last environment' });
        return;
      }

      const fileCount = await EnvFile.countDocuments({ projectId: project._id, environment: slug });

      if (fileCount > 0 && !force) {
        await session.abortTransaction();
        res.status(400).json({
          error: 'Environment has uploaded versions. Use ?force=true to delete all versions.',
          versionCount: fileCount,
        });
        return;
      }

      if (fileCount > 0) {
        await EnvFile.deleteMany({ projectId: project._id, environment: slug }, { session });
      }

      project.environments = environments.filter((s) => s !== slug);
      await project.save({ session });

      await session.commitTransaction();

      await auditProject(
        project._id.toString(),
        project.organizationId.toString(),
        req.user!.userId,
        'update',
        { action: 'delete_environment', environment: slug, force, deletedVersions: fileCount },
        req
      );

      res.json({ message: 'Environment removed', deletedVersions: fileCount });
    } catch (error) {
      await session.abortTransaction();
      console.error('Delete environment error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Failed to delete environment' });
    } finally {
      session.endSession();
    }
  }
);

export default router;
