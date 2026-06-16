import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import AssociatedAccount, { ACCOUNT_PROVIDERS } from '../models/AssociatedAccount';
import { encryptProjectData, decryptProjectData } from '../crypto';
import { authenticate, AuthRequest } from '../lib/auth';
import { requireProjectAccess } from '../lib/authorization';
import { validateProjectId, isValidObjectId } from '../middleware/validation';
import { uploadRateLimiter } from '../middleware/security';

const router = express.Router();

const CREDENTIALS_SELECT = '-encryptedData -iv -authTag';

async function encryptCredentials(projectId: string, password?: string, notes?: string) {
  const payload = JSON.stringify({
    password: password || '',
    notes: notes || '',
  });
  return encryptProjectData(projectId, payload);
}

async function decryptCredentials(projectId: string, encryptedData: Buffer, iv: Buffer, authTag: Buffer) {
  const decrypted = await decryptProjectData(projectId, encryptedData, iv, authTag);
  try {
    return JSON.parse(decrypted) as { password?: string; notes?: string };
  } catch {
    return { password: decrypted, notes: '' };
  }
}

/**
 * Create an associated account
 * POST /api/projects/:projectId/accounts
 */
router.post(
  '/:projectId/accounts',
  authenticate,
  validateProjectId(),
  uploadRateLimiter,
  requireProjectAccess('write'),
  [
    body('label')
      .trim()
      .notEmpty()
      .withMessage('Account label is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Label must be between 1 and 100 characters'),
    body('provider')
      .isIn([...ACCOUNT_PROVIDERS])
      .withMessage('Invalid provider'),
    body('providerOther')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Provider name must be less than 50 characters'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email or username is required')
      .isLength({ max: 200 })
      .withMessage('Email must be less than 200 characters'),
    body('loginUrl')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Login URL must be less than 500 characters'),
    body('usesSSO')
      .optional()
      .isBoolean()
      .withMessage('usesSSO must be a boolean'),
    body('ssoProvider')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('SSO provider must be less than 100 characters'),
    body('password')
      .optional()
      .isString()
      .withMessage('Password must be a string'),
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string'),
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
      const {
        label,
        provider,
        providerOther,
        email,
        loginUrl,
        usesSSO = false,
        ssoProvider,
        password,
        notes,
      } = req.body;

      if (!isValidObjectId(projectId)) {
        res.status(400).json({ error: 'Invalid project ID format' });
        return;
      }

      if (provider === 'other' && !providerOther?.trim()) {
        res.status(400).json({ error: 'Provider name is required when provider is "other"' });
        return;
      }

      if (usesSSO && !ssoProvider?.trim()) {
        res.status(400).json({ error: 'SSO provider is required when SSO is enabled' });
        return;
      }

      if (!usesSSO && !password?.trim()) {
        res.status(400).json({ error: 'Password is required when SSO is not used' });
        return;
      }

      const existing = await AssociatedAccount.findOne({ projectId, label: label.trim() });
      if (existing) {
        res.status(400).json({ error: 'An account with this label already exists in this project' });
        return;
      }

      const { encryptedData, iv, authTag } = await encryptCredentials(projectId, password, notes);

      const account = await AssociatedAccount.create({
        projectId,
        label: label.trim(),
        provider,
        providerOther: provider === 'other' ? providerOther?.trim() : undefined,
        email: email.trim(),
        loginUrl: loginUrl?.trim() || undefined,
        usesSSO: Boolean(usesSSO),
        ssoProvider: usesSSO ? ssoProvider?.trim() : undefined,
        encryptedData,
        iv,
        authTag,
        createdBy: req.user.userId,
      });

      const populated = await AssociatedAccount.findById(account._id)
        .populate('createdBy', 'name email')
        .select(CREDENTIALS_SELECT);

      res.status(201).json(populated);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Create associated account error:', errMsg);

      if (errMsg.includes('duplicate key') || errMsg.includes('E11000')) {
        res.status(400).json({ error: 'An account with this label already exists in this project' });
        return;
      }

      res.status(500).json({ error: 'Failed to create associated account' });
    }
  }
);

/**
 * List associated accounts for a project
 * GET /api/projects/:projectId/accounts
 */
router.get(
  '/:projectId/accounts',
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

      const accounts = await AssociatedAccount.find({ projectId })
        .populate('createdBy', 'name email')
        .select(CREDENTIALS_SELECT)
        .sort({ label: 1 });

      res.json(accounts);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Get associated accounts error:', errMsg);
      res.status(500).json({ error: 'Failed to fetch associated accounts' });
    }
  }
);

/**
 * Get associated account credentials (decrypted)
 * GET /api/projects/:projectId/accounts/:accountId/credentials
 */
router.get(
  '/:projectId/accounts/:accountId/credentials',
  authenticate,
  validateProjectId(),
  requireProjectAccess('read'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const accountId = req.params.accountId;

      if (!isValidObjectId(projectId) || !isValidObjectId(accountId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const account = await AssociatedAccount.findOne({ _id: accountId, projectId });

      if (!account) {
        res.status(404).json({ error: 'Associated account not found' });
        return;
      }

      const credentials = await decryptCredentials(projectId, account.encryptedData, account.iv, account.authTag);

      res.json({
        _id: account._id,
        label: account.label,
        provider: account.provider,
        providerOther: account.providerOther,
        email: account.email,
        loginUrl: account.loginUrl,
        usesSSO: account.usesSSO,
        ssoProvider: account.ssoProvider,
        password: credentials.password || '',
        notes: credentials.notes || '',
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Get associated account credentials error:', errMsg);
      res.status(500).json({ error: 'Failed to get account credentials' });
    }
  }
);

/**
 * Update an associated account
 * PUT /api/projects/:projectId/accounts/:accountId
 */
router.put(
  '/:projectId/accounts/:accountId',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  [
    body('label')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Account label cannot be empty')
      .isLength({ min: 1, max: 100 })
      .withMessage('Label must be between 1 and 100 characters'),
    body('provider')
      .optional()
      .isIn([...ACCOUNT_PROVIDERS])
      .withMessage('Invalid provider'),
    body('providerOther')
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage('Provider name must be less than 50 characters'),
    body('email')
      .optional()
      .trim()
      .notEmpty()
      .withMessage('Email or username cannot be empty')
      .isLength({ max: 200 })
      .withMessage('Email must be less than 200 characters'),
    body('loginUrl')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Login URL must be less than 500 characters'),
    body('usesSSO')
      .optional()
      .isBoolean()
      .withMessage('usesSSO must be a boolean'),
    body('ssoProvider')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('SSO provider must be less than 100 characters'),
    body('password')
      .optional()
      .isString()
      .withMessage('Password must be a string'),
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string'),
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
      const accountId = req.params.accountId;
      const {
        label,
        provider,
        providerOther,
        email,
        loginUrl,
        usesSSO,
        ssoProvider,
        password,
        notes,
      } = req.body;

      if (!isValidObjectId(projectId) || !isValidObjectId(accountId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const account = await AssociatedAccount.findOne({ _id: accountId, projectId });

      if (!account) {
        res.status(404).json({ error: 'Associated account not found' });
        return;
      }

      const nextProvider = provider ?? account.provider;
      const nextUsesSSO = usesSSO !== undefined ? Boolean(usesSSO) : account.usesSSO;

      if (nextProvider === 'other') {
        const otherName = providerOther !== undefined ? providerOther : account.providerOther;
        if (!otherName?.trim()) {
          res.status(400).json({ error: 'Provider name is required when provider is "other"' });
          return;
        }
      }

      if (nextUsesSSO) {
        const nextSsoProvider = ssoProvider !== undefined ? ssoProvider : account.ssoProvider;
        if (!nextSsoProvider?.trim()) {
          res.status(400).json({ error: 'SSO provider is required when SSO is enabled' });
          return;
        }
      }

      if (label !== undefined && label.trim() !== account.label) {
        const existing = await AssociatedAccount.findOne({
          projectId,
          label: label.trim(),
          _id: { $ne: accountId },
        });
        if (existing) {
          res.status(400).json({ error: 'An account with this label already exists in this project' });
          return;
        }
        account.label = label.trim();
      }

      if (provider !== undefined) account.provider = provider;
      if (providerOther !== undefined || provider !== undefined) {
        account.providerOther = nextProvider === 'other' ? (providerOther ?? account.providerOther)?.trim() : undefined;
      }
      if (email !== undefined) account.email = email.trim();
      if (loginUrl !== undefined) account.loginUrl = loginUrl?.trim() || undefined;
      if (usesSSO !== undefined) account.usesSSO = Boolean(usesSSO);
      if (ssoProvider !== undefined || usesSSO !== undefined) {
        account.ssoProvider = nextUsesSSO ? (ssoProvider ?? account.ssoProvider)?.trim() : undefined;
      }

      if (password !== undefined || notes !== undefined || usesSSO !== undefined) {
        const current = await decryptCredentials(projectId, account.encryptedData, account.iv, account.authTag);
        const nextPassword = nextUsesSSO
          ? ''
          : password !== undefined
            ? password
            : current.password;
        const nextNotes = notes !== undefined ? notes : current.notes;
        const encrypted = await encryptCredentials(projectId, nextPassword, nextNotes);
        account.encryptedData = encrypted.encryptedData;
        account.iv = encrypted.iv;
        account.authTag = encrypted.authTag;
      }

      await account.save();

      const populated = await AssociatedAccount.findById(account._id)
        .populate('createdBy', 'name email')
        .select(CREDENTIALS_SELECT);

      res.json(populated);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Update associated account error:', errMsg);

      if (errMsg.includes('duplicate key') || errMsg.includes('E11000')) {
        res.status(400).json({ error: 'An account with this label already exists in this project' });
        return;
      }

      res.status(500).json({ error: 'Failed to update associated account' });
    }
  }
);

/**
 * Delete an associated account
 * DELETE /api/projects/:projectId/accounts/:accountId
 */
router.delete(
  '/:projectId/accounts/:accountId',
  authenticate,
  validateProjectId(),
  requireProjectAccess('write'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const projectId = req.params.projectId;
      const accountId = req.params.accountId;

      if (!isValidObjectId(projectId) || !isValidObjectId(accountId)) {
        res.status(400).json({ error: 'Invalid ID format' });
        return;
      }

      const account = await AssociatedAccount.findOneAndDelete({ _id: accountId, projectId });

      if (!account) {
        res.status(404).json({ error: 'Associated account not found' });
        return;
      }

      res.json({ message: 'Associated account deleted successfully' });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error('Delete associated account error:', errMsg);
      res.status(500).json({ error: 'Failed to delete associated account' });
    }
  }
);

export default router;
