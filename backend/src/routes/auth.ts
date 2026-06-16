import express, { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User';
import Organization from '../models/Organization';
import OrgMember from '../models/OrgMember';
import RefreshToken, { generateRefreshToken, hashRefreshToken } from '../models/RefreshToken';
import { hashPassword, comparePassword, generateAccessToken, authenticate, REFRESH_TOKEN_EXPIRES_DAYS } from '../lib/auth';
import { AuthRequest } from '../lib/auth';
import { authRateLimiter } from '../middleware/security';
import { validateEmail, validatePassword } from '../middleware/validation';
import { generateVerificationToken, sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';
import { createOrgEncryptionKey } from '../crypto';
import { auditSession } from '../lib/audit';
import OrgInvite from '../models/OrgInvite';
import { acceptPendingInvitesForUser } from '../lib/orgInvite';

const router = express.Router();

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
  path: '/api/auth',
};

/**
 * Register a new user
 * POST /api/auth/register
 * Security: Rate limited, password validation, input sanitization
 */
router.post(
  '/register',
  authRateLimiter, // Security: Rate limit to prevent account enumeration
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Name is required')
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be between 1 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-_.]+$/)
      .withMessage('Name contains invalid characters'),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required')
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be between 3 and 30 characters')
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Username can only contain lowercase letters, numbers, and underscores'),
    validateEmail(),
    validatePassword(),
    body('inviteToken')
      .optional()
      .isString()
      .withMessage('Invalid invite token'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      const { name, username, email, password, inviteToken } = req.body;
      
      if (inviteToken) {
        const invite = await OrgInvite.findOne({ token: inviteToken, status: 'pending' });
        if (!invite || invite.expiresAt < new Date()) {
          res.status(400).json({ error: 'Invalid or expired invite token' });
          return;
        }
        if (invite.email !== email.toLowerCase()) {
          res.status(400).json({ error: 'Registration email must match the invited email address' });
          return;
        }
      }
      
      // Check if user with email already exists
      const existingUserByEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingUserByEmail) {
        res.status(400).json({ error: 'User with this email already exists' });
        return;
      }
      
      // Check if username already exists
      const existingUserByUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUserByUsername) {
        res.status(400).json({ error: 'Username already taken' });
        return;
      }
      
      const hashedPassword = await hashPassword(password);
      
      const emailVerificationToken = generateVerificationToken();
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      
      const user = await User.create({
        name,
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        password: hashedPassword,
        emailVerified: false,
        emailVerificationToken,
        emailVerificationExpires,
      });
      
      // Create personal organization for the user
      const personalOrg = await Organization.create({
        name: `${name}'s Workspace`,
        slug: `personal-${user._id.toString()}`,
        type: 'personal',
        createdBy: user._id,
      });
      
      // Add user as owner of their personal org
      await OrgMember.create({
        organizationId: personalOrg._id,
        userId: user._id,
        role: 'owner',
      });
      
      // Create encryption key for the personal org
      await createOrgEncryptionKey(personalOrg._id.toString());
      
      try {
        await sendVerificationEmail(user.email, emailVerificationToken, user.name);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
      }
      
      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        emailSent: true,
      });
    } catch (error) {
      // Security: Don't log sensitive registration errors
      console.error('Registration error:', error instanceof Error ? error.message : 'Registration failed');
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

/**
 * Login user
 * POST /api/auth/login
 * Security: Rate limited to prevent brute force attacks
 */
router.post(
  '/login',
  authRateLimiter, // Security: Rate limit to prevent brute force
  [
    validateEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      const { email, password } = req.body;
      
      // Find user with password field
      const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
      
      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      
      // Verify password
      const isPasswordValid = await comparePassword(password, user.password);
      
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }
      
      if (!user.emailVerified) {
        res.status(403).json({ 
          error: 'Email not verified. Please check your email and verify your account before logging in.',
          emailVerified: false,
        });
        return;
      }
      
      // Generate access token (short-lived)
      const accessToken = generateAccessToken(user._id.toString(), user.email);
      
      // Generate and store refresh token
      const refreshToken = generateRefreshToken();
      const refreshTokenHash = hashRefreshToken(refreshToken);
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
      
      const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress;
      const userAgent = req.headers['user-agent']?.substring(0, 500);
      
      await RefreshToken.create({
        userId: user._id,
        tokenHash: refreshTokenHash,
        expiresAt,
        ipAddress,
        userAgent,
      });
      
      // Set refresh token as HttpOnly cookie
      res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);
      
      // Audit the login
      await auditSession(user._id.toString(), 'login', { email: user.email }, req);

      const acceptedInvites = await acceptPendingInvitesForUser(user._id.toString(), user.email);
      
      res.json({
        accessToken,
        user: {
          id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
        },
        acceptedInvites,
      });
    } catch (error) {
      // Security: Don't log authentication errors in detail
      console.error('Login error:', error instanceof Error ? error.message : 'Login failed');
      res.status(500).json({ error: 'Login failed' });
    }
  }
);

/**
 * Get current user info
 * GET /api/auth/me
 */
/**
 * Verify email address
 * GET /api/auth/verify-email?token=xxx
 */
router.get('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.query;
    
    if (!token || typeof token !== 'string') {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }
    
    // Find user with verification token
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    }).select('+emailVerificationToken +emailVerificationExpires');
    
    if (!user) {
      res.status(400).json({ error: 'Invalid or expired verification token' });
      return;
    }
    
    // Verify email and clear token
    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const acceptedInvites = await acceptPendingInvitesForUser(user._id.toString(), user.email);
    
    res.json({
      message: 'Email verified successfully. You can now log in.',
      acceptedInvites,
    });
  } catch (error) {
    console.error('Email verification error:', error instanceof Error ? error.message : 'Verification failed');
    res.status(500).json({ error: 'Email verification failed' });
  }
});

/**
 * Resend verification email
 * POST /api/auth/resend-verification
 */
router.post(
  '/resend-verification',
  authRateLimiter,
  [validateEmail()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      const { email } = req.body;
      
      const user = await User.findOne({ email: email.toLowerCase() })
        .select('+emailVerificationToken +emailVerificationExpires');
      
      if (!user) {
        // Don't reveal if user exists (security best practice)
        res.json({ message: 'If an account exists with this email, a verification email has been sent.' });
        return;
      }
      
      if (user.emailVerified) {
        res.status(400).json({ error: 'Email is already verified' });
        return;
      }
      
      // Generate new verification token
      const emailVerificationToken = generateVerificationToken();
      const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      user.emailVerificationToken = emailVerificationToken;
      user.emailVerificationExpires = emailVerificationExpires;
      await user.save();
      
      // Send verification email
      try {
        await sendVerificationEmail(user.email, emailVerificationToken, user.name);
        res.json({ message: 'Verification email sent. Please check your inbox.' });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        res.status(500).json({ error: 'Failed to send verification email' });
      }
    } catch (error) {
      console.error('Resend verification error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Failed to resend verification email' });
    }
  }
);

/**
 * Request password reset
 * POST /api/auth/forgot-password
 */
router.post(
  '/forgot-password',
  authRateLimiter,
  [validateEmail()],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      const { email } = req.body;
      
      const user = await User.findOne({ email: email.toLowerCase() })
        .select('+passwordResetToken +passwordResetExpires');
      
      if (!user) {
        // Don't reveal if user exists (security best practice)
        res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        return;
      }
      
      // Generate password reset token
      const passwordResetToken = generateVerificationToken();
      const passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      
      user.passwordResetToken = passwordResetToken;
      user.passwordResetExpires = passwordResetExpires;
      await user.save();
      
      // Send password reset email
      try {
        await sendPasswordResetEmail(user.email, passwordResetToken, user.name);
        res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        res.status(500).json({ error: 'Failed to send password reset email' });
      }
    } catch (error) {
      console.error('Forgot password error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Failed to process password reset request' });
    }
  }
);

/**
 * Reset password
 * POST /api/auth/reset-password
 */
router.post(
  '/reset-password',
  authRateLimiter,
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    validatePassword(),
  ],
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      
      const { token, password } = req.body;
      
      // Find user with valid reset token
      const user = await User.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      }).select('+password +passwordResetToken +passwordResetExpires');
      
      if (!user) {
        res.status(400).json({ error: 'Invalid or expired password reset token' });
        return;
      }
      
      // Hash new password
      const hashedPassword = await hashPassword(password);
      
      // Update password and clear reset token
      user.password = hashedPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
      
      res.json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error) {
      console.error('Reset password error:', error instanceof Error ? error.message : 'Failed');
      res.status(500).json({ error: 'Password reset failed' });
    }
  }
);

/**
 * Get current user info
 * GET /api/auth/me
 */
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
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
      emailVerified: user.emailVerified,
    });
    } catch (error) {
      console.error('Get user error:', error instanceof Error ? error.message : 'Failed to get user info');
      res.status(500).json({ error: 'Failed to get user info' });
    }
});

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (!refreshToken) {
      res.status(401).json({ error: 'No refresh token provided' });
      return;
    }
    
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await RefreshToken.findOne({ tokenHash });
    
    if (!storedToken) {
      res.status(401).json({ error: 'Invalid refresh token' });
      return;
    }
    
    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      res.clearCookie('refreshToken', { path: '/api/auth' });
      res.status(401).json({ error: 'Refresh token expired' });
      return;
    }
    
    const user = await User.findById(storedToken.userId);
    if (!user || !user.emailVerified) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      res.clearCookie('refreshToken', { path: '/api/auth' });
      res.status(401).json({ error: 'User not found or not verified' });
      return;
    }
    
    // Generate new access token
    const accessToken = generateAccessToken(user._id.toString(), user.email);
    
    // Optionally rotate refresh token for better security
    const newRefreshToken = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);
    
    storedToken.tokenHash = newRefreshTokenHash;
    storedToken.expiresAt = expiresAt;
    await storedToken.save();
    
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);
    
    res.json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error instanceof Error ? error.message : 'Failed');
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * Logout user
 * POST /api/auth/logout
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    
    if (refreshToken) {
      const tokenHash = hashRefreshToken(refreshToken);
      const storedToken = await RefreshToken.findOne({ tokenHash });
      
      if (storedToken) {
        await auditSession(storedToken.userId.toString(), 'logout', {}, req);
        await RefreshToken.deleteOne({ _id: storedToken._id });
      }
    }
    
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error instanceof Error ? error.message : 'Failed');
    res.status(500).json({ error: 'Failed to logout' });
  }
});

export default router;
