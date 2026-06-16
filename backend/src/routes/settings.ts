import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import UserSettings from '../models/UserSettings';
import Project from '../models/Project';
import EnvFile from '../models/EnvFile';
import Secret from '../models/Secret';
import AssociatedAccount from '../models/AssociatedAccount';
import { ProjectApiToken } from '../models/ProjectApiToken';
import { authenticate, AuthRequest, comparePassword } from '../lib/auth';
import { decryptProjectData } from '../crypto';
import { auditPanic } from '../lib/audit';
import { getPanicEligibleProjects } from '../lib/panicProjects';

const router = express.Router();

/**
 * Get user settings
 * GET /api/settings
 */
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const settings = await UserSettings.findOne({ userId: req.user.userId });
    
    // Return default settings if none exist
    if (!settings) {
      res.json({
        flushDuration: null, // Default disabled
        panicButton: {
          flushEnvs: false,
          flushSecrets: false,
          revokeApiTokens: false,
          revokeCollaborators: false,
          downloadEnvs: false,
          askConfirmation: true,
        },
      });
      return;
    }

    res.json({
      flushDuration: settings.flushDuration || null,
      panicButton: settings.panicButton,
    });
  } catch (error) {
    console.error('Get settings error:', error instanceof Error ? error.message : 'Failed to get settings');
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

/**
 * Update user settings
 * PUT /api/settings
 */
router.put(
  '/',
  authenticate,
  [
    body('flushDuration')
      .optional()
      .custom((value) => {
        // Allow null/undefined (disabled) or values between 1 and 1000
        if (value === null || value === undefined || value === '') {
          return true; // Disabled is allowed
        }
        const numValue = Number(value);
        if (isNaN(numValue) || !Number.isInteger(numValue)) {
          throw new Error('Flush duration must be an integer');
        }
        if (numValue < 1 || numValue > 1000) {
          throw new Error('Flush duration must be between 1 and 1000 hours');
        }
        return true;
      }),
    body('panicButton.flushEnvs')
      .optional()
      .isBoolean()
      .withMessage('flushEnvs must be a boolean'),
    body('panicButton.flushSecrets')
      .optional()
      .isBoolean()
      .withMessage('flushSecrets must be a boolean'),
    body('panicButton.revokeApiTokens')
      .optional()
      .isBoolean()
      .withMessage('revokeApiTokens must be a boolean'),
    body('panicButton.revokeCollaborators')
      .optional()
      .isBoolean()
      .withMessage('revokeCollaborators must be a boolean'),
    body('panicButton.downloadEnvs')
      .optional()
      .isBoolean()
      .withMessage('downloadEnvs must be a boolean'),
    body('panicButton.askConfirmation')
      .optional()
      .isBoolean()
      .withMessage('askConfirmation must be a boolean'),
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

      const { flushDuration, panicButton } = req.body;

      let settings = await UserSettings.findOne({ userId: req.user.userId });

      if (!settings) {
        settings = await UserSettings.create({
          userId: req.user.userId,
          flushDuration: flushDuration === null || flushDuration === undefined || flushDuration === '' ? null : Number(flushDuration),
          panicButton: panicButton || {
            flushEnvs: false,
            flushSecrets: false,
            revokeApiTokens: false,
            revokeCollaborators: false,
            downloadEnvs: false,
            askConfirmation: true,
          },
        });
      } else {
        if (flushDuration !== undefined) {
          settings.flushDuration = flushDuration === null || flushDuration === undefined || flushDuration === '' ? null : Number(flushDuration);
        }
        if (panicButton) {
          settings.panicButton = {
            ...settings.panicButton,
            ...panicButton,
          };
        }
        await settings.save();
      }

      res.json({
        flushDuration: settings.flushDuration,
        panicButton: settings.panicButton,
      });
    } catch (error) {
      console.error('Update settings error:', error instanceof Error ? error.message : 'Failed to update settings');
      res.status(500).json({ error: 'Failed to update settings' });
    }
  }
);

/**
 * Get user profile
 * GET /api/settings/profile
 */
router.get('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user._id,
      name: user.name,
      username: user.username,
      email: user.email, // Include but note it can't be edited
    });
  } catch (error) {
    console.error('Get profile error:', error instanceof Error ? error.message : 'Failed to get profile');
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

/**
 * Update user profile (name and username only, not email)
 * PUT /api/settings/profile
 */
router.put(
  '/profile',
  authenticate,
  [
    body('name')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Name cannot be empty')
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_.]+$/)
      .withMessage('Name contains invalid characters'),
    body('username')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Username cannot be empty')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Username can only contain lowercase letters, numbers, and underscores'),
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

      const { name, username } = req.body;
      const user = await User.findById(req.user.userId);

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Update name if provided
      if (name !== undefined) {
        user.name = name.trim();
      }

      // Update username if provided and check for duplicates
      if (username !== undefined && username.trim().toLowerCase() !== user.username) {
        const newUsername = username.trim().toLowerCase();
        const existingUser = await User.findOne({ username: newUsername });
        if (existingUser) {
          res.status(400).json({ error: 'Username already taken' });
          return;
        }
        user.username = newUsername;
      }

      await user.save();

      res.json({
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Update profile error:', errMsg);
      
      // Handle duplicate key error
      if (errMsg.includes('duplicate key') || errMsg.includes('E11000')) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }
      
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

/**
 * Execute panic button actions
 * POST /api/settings/panic
 * Body: { password: string } — server-side re-authentication required
 *
 * Affects projects the user created or projects in orgs where they are owner/admin.
 */
router.post(
  '/panic',
  authenticate,
  [body('password').notEmpty().withMessage('Password is required to execute panic actions')],
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

    const user = await User.findById(req.user.userId).select('+password');
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const passwordValid = await comparePassword(req.body.password, user.password);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid password' });
      return;
    }

    const settings = await UserSettings.findOne({ userId: req.user.userId });
    if (!settings) {
      res.status(400).json({ error: 'Panic button not configured' });
      return;
    }

    const {
      flushEnvs,
      flushSecrets,
      revokeApiTokens,
      revokeCollaborators,
      downloadEnvs,
    } = settings.panicButton;

    if (!flushEnvs && !flushSecrets && !revokeApiTokens && !revokeCollaborators && !downloadEnvs) {
      res.status(400).json({ error: 'No panic actions configured' });
      return;
    }

    const results: Record<string, unknown> = {
      downloadEnvs: false,
      flushEnvs: false,
      flushSecrets: false,
      revokeApiTokens: false,
      revokeCollaborators: false,
    };

    const projects = await getPanicEligibleProjects(req.user.userId);
    const projectIds = projects.map((p) => p._id);

    // 1. Download all envs first (if enabled)
    if (downloadEnvs) {
      try {
        const envFiles: Array<{ projectName: string; environment: string; version: number; content: string }> = [];
        
        for (const project of projects) {
          const projectEnvs = await EnvFile.find({ projectId: project._id }).sort({ createdAt: -1 });
          
          const latestByEnv: { [key: string]: any } = {};
          for (const envFile of projectEnvs) {
            const env = envFile.environment;
            if (!latestByEnv[env] || envFile.version > latestByEnv[env].version) {
              latestByEnv[env] = envFile;
            }
          }

          for (const env of Object.keys(latestByEnv)) {
            const envFile = latestByEnv[env];
            try {
              const decryptedContent = await decryptProjectData(
                project._id.toString(),
                envFile.encryptedData,
                envFile.iv,
                envFile.authTag
              );
              envFiles.push({
                projectName: project.name,
                environment: env,
                version: envFile.version,
                content: decryptedContent,
              });
            } catch (decryptError) {
              console.error(`Failed to decrypt env for ${project.name} ${env}:`, decryptError);
            }
          }
        }

        let downloadContent = `# HashEnv Backup - ${new Date().toISOString()}\n\n`;
        for (const envFile of envFiles) {
          downloadContent += `# Project: ${envFile.projectName} - Environment: ${envFile.environment} - Version: ${envFile.version}\n`;
          downloadContent += `${envFile.content}\n\n`;
        }

        results.downloadEnvs = true;
        results.downloadContent = downloadContent;
        results.downloadFilename = `hashenv-backup-${Date.now()}.txt`;
      } catch (error) {
        console.error('Download envs error:', error);
        results.downloadError = error instanceof Error ? error.message : 'Failed to download envs';
      }
    }

    // 2. Flush envs (if enabled)
    if (flushEnvs) {
      try {
        const countBefore = await EnvFile.countDocuments({ projectId: { $in: projectIds } });
        await EnvFile.deleteMany({ projectId: { $in: projectIds } });
        results.flushEnvs = true;
        results.flushedEnvCount = countBefore;
      } catch (error) {
        console.error('Flush envs error:', error);
        results.flushError = error instanceof Error ? error.message : 'Failed to flush envs';
      }
    }

    // 3. Flush secrets and associated accounts (if enabled)
    if (flushSecrets) {
      try {
        const secretCount = await Secret.countDocuments({ projectId: { $in: projectIds } });
        const accountCount = await AssociatedAccount.countDocuments({ projectId: { $in: projectIds } });
        await Secret.deleteMany({ projectId: { $in: projectIds } });
        await AssociatedAccount.deleteMany({ projectId: { $in: projectIds } });
        results.flushSecrets = true;
        results.flushedSecretCount = secretCount;
        results.flushedAccountCount = accountCount;
      } catch (error) {
        console.error('Flush secrets error:', error);
        results.flushSecretsError = error instanceof Error ? error.message : 'Failed to flush secrets';
      }
    }

    // 4. Revoke API tokens (if enabled)
    if (revokeApiTokens) {
      try {
        const tokenCount = await ProjectApiToken.countDocuments({ projectId: { $in: projectIds } });
        await ProjectApiToken.deleteMany({ projectId: { $in: projectIds } });
        results.revokeApiTokens = true;
        results.revokedTokenCount = tokenCount;
      } catch (error) {
        console.error('Revoke API tokens error:', error);
        results.revokeTokensError = error instanceof Error ? error.message : 'Failed to revoke API tokens';
      }
    }

    // 5. Revoke all collaborator access (if enabled)
    if (revokeCollaborators) {
      try {
        for (const project of projects) {
          project.members = [];
          await project.save();
        }
        results.revokeCollaborators = true;
      } catch (error) {
        console.error('Revoke collaborators error:', error);
        results.revokeError = error instanceof Error ? error.message : 'Failed to revoke collaborators';
      }
    }

    const affectedOrgIds = [...new Set(projects.map((p) => p.organizationId.toString()))];
    const panicMetadata = {
      downloadEnvs: results.downloadEnvs,
      flushEnvs: results.flushEnvs,
      flushSecrets: results.flushSecrets,
      revokeApiTokens: results.revokeApiTokens,
      revokeCollaborators: results.revokeCollaborators,
      projectCount: projects.length,
    };

    for (const organizationId of affectedOrgIds) {
      await auditPanic(req.user.userId, panicMetadata, req, organizationId);
    }
    if (affectedOrgIds.length === 0) {
      await auditPanic(req.user.userId, panicMetadata, req);
    }

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Panic button error:', error instanceof Error ? error.message : 'Failed to execute panic actions');
    res.status(500).json({ error: 'Failed to execute panic actions' });
  }
  }
);

export default router;
