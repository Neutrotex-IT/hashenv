import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import Component from '../models/Component';
import { authenticate, AuthRequest } from '../lib/auth';
import { requireProjectAccess, requireComponentAccess, AuthRequestWithOrg } from '../lib/authorization';
import { getProjectMemberAttributes } from '../lib/abac';
import { filterIdsByScope, removeResourceFromMemberScopes } from '../lib/resourceScope';
import { auditComponent } from '../lib/audit';
import {
  validateProjectId,
  validateComponentId,
  validateComponentName,
  isValidObjectId,
} from '../middleware/validation';
import { createComponentEncryptionKey } from '../crypto/key-store';
import {
  deleteComponentCascade,
  isValidComponentSlug,
  slugFromComponentName,
} from '../lib/components';

const router = express.Router({ mergeParams: true });

router.post(
  '/:projectId/components',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  [validateComponentName(), body('description').optional().trim().isLength({ max: 500 })],
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
      const attributes = await getProjectMemberAttributes(
        req.user!.userId,
        project,
        (req as AuthRequestWithOrg).orgRole ?? null
      );
      if (attributes.resourceScope.componentIds !== null) {
        res.status(403).json({ error: 'Access denied: cannot create components with restricted scope' });
        return;
      }

      const name = req.body.name.trim();
      const slug = slugFromComponentName(name);

      if (!isValidComponentSlug(slug)) {
        res.status(400).json({ error: 'Invalid component name' });
        return;
      }

      const existing = await Component.findOne({ projectId, slug });
      if (existing) {
        res.status(400).json({ error: 'A component with this name already exists in this project' });
        return;
      }

      const component = await Component.create({
        projectId,
        name,
        slug,
        description: req.body.description?.trim() || undefined,
        createdBy: req.user.userId,
      });

      await createComponentEncryptionKey(
        component._id.toString(),
        projectId,
        project.organizationId.toString()
      );

      await auditComponent(
        projectId,
        req.user.userId,
        'create',
        component._id.toString(),
        { componentName: component.name, componentSlug: component.slug },
        req
      );

      const populated = await Component.findById(component._id).populate('createdBy', 'name email');
      res.status(201).json(populated);
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : String(error);
      console.error('Create component error:', errMessage);
      if (errMessage.includes('duplicate key') || errMessage.includes('E11000')) {
        res.status(400).json({ error: 'A component with this name already exists in this project' });
        return;
      }
      res.status(500).json({ error: 'Failed to create component' });
    }
  }
);

router.get(
  '/:projectId/components',
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

      const project = (req as AuthRequestWithOrg).project!;
      const attributes = await getProjectMemberAttributes(
        req.user!.userId,
        project,
        (req as AuthRequestWithOrg).orgRole ?? null
      );

      const components = await Component.find({ projectId })
        .populate('createdBy', 'name email')
        .sort({ name: 1 });

      const visible = filterIdsByScope(
        components,
        attributes.resourceScope.componentIds,
        attributes.unrestricted
      );

      res.json(visible);
    } catch (error) {
      console.error('List components error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to list components' });
    }
  }
);

router.get(
  '/:projectId/components/:componentId',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const component = (req as AuthRequestWithOrg).component!;
      const populated = await Component.findById(component._id).populate('createdBy', 'name email');
      res.json(populated);
    } catch (error) {
      console.error('Get component error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to get component' });
    }
  }
);

router.patch(
  '/:projectId/components/:componentId',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('write'),
  [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }),
    body('description').optional().trim().isLength({ max: 500 }),
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

      if (req.body.name !== undefined) {
        const name = req.body.name.trim();
        const slug = slugFromComponentName(name);
        if (!isValidComponentSlug(slug)) {
          res.status(400).json({ error: 'Invalid component name' });
          return;
        }

        const duplicate = await Component.findOne({
          projectId,
          slug,
          _id: { $ne: component._id },
        });
        if (duplicate) {
          res.status(400).json({ error: 'A component with this name already exists in this project' });
          return;
        }

        component.name = name;
        component.slug = slug;
      }

      if (req.body.description !== undefined) {
        component.description = req.body.description?.trim() || undefined;
      }

      await component.save();

      await auditComponent(
        projectId,
        req.user.userId,
        'update',
        component._id.toString(),
        { componentName: component.name, componentSlug: component.slug },
        req
      );

      const populated = await Component.findById(component._id).populate('createdBy', 'name email');
      res.json(populated);
    } catch (error) {
      console.error('Update component error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to update component' });
    }
  }
);

router.delete(
  '/:projectId/components/:componentId',
  authenticate,
  validateProjectId(),
  validateComponentId(),
  requireComponentAccess('write'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
      }

      const projectId = req.params.projectId;
      const component = (req as AuthRequestWithOrg).component!;

      await auditComponent(
        projectId,
        req.user.userId,
        'delete',
        component._id.toString(),
        { componentName: component.name, componentSlug: component.slug },
        req
      );

      await deleteComponentCascade(component._id.toString());
      await removeResourceFromMemberScopes(projectId, 'componentIds', component._id.toString());

      res.json({ message: 'Component deleted successfully' });
    } catch (error) {
      console.error('Delete component error:', error instanceof Error ? error.message : 'Unknown error');
      res.status(500).json({ error: 'Failed to delete component' });
    }
  }
);

export default router;
