import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import UserSettings from '../models/UserSettings';
import { authenticate, AuthRequest } from '../lib/auth';

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

    if (!settings) {
      res.json({
        flushDuration: null,
      });
      return;
    }

    res.json({
      flushDuration: settings.flushDuration || null,
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
        if (value === null || value === undefined || value === '') {
          return true;
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

      const { flushDuration } = req.body;

      let settings = await UserSettings.findOne({ userId: req.user.userId });

      if (!settings) {
        settings = await UserSettings.create({
          userId: req.user.userId,
          flushDuration:
            flushDuration === null || flushDuration === undefined || flushDuration === ''
              ? null
              : Number(flushDuration),
        });
      } else {
        if (flushDuration !== undefined) {
          settings.flushDuration =
            flushDuration === null || flushDuration === undefined || flushDuration === ''
              ? null
              : Number(flushDuration);
        }
        await settings.save();
      }

      res.json({
        flushDuration: settings.flushDuration,
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
      email: user.email,
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

      if (name !== undefined) {
        user.name = name.trim();
      }

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

      if (errMsg.includes('duplicate key') || errMsg.includes('E11000')) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }

      res.status(500).json({ error: 'Failed to update profile' });
    }
  }
);

export default router;
