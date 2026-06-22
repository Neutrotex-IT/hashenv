import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

/**
 * Security middleware configurations
 */

/**
 * Rate limiter for authentication endpoints (prevent brute force)
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30, // 30 failed auth attempts per hour
  message: {
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Rate limiter for API endpoints
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000, // 1000 requests per hour
  message: {
    error: 'Too many requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for file uploads
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // 50 uploads per hour
  message: {
    error: 'Too many file uploads, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiter for unauthenticated invite preview lookups
 */
export const invitePreviewRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: {
    error: 'Too many invite preview requests, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Helmet security headers configuration
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Tailwind
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding if needed
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
});

/**
 * Sanitize error messages to prevent information disclosure
 */
export function sanitizeError(error: any): string {
  // Don't expose internal errors in production
  if (process.env.NODE_ENV === 'production') {
    // Only show generic errors in production
    if (error.message?.includes('MongoDB') || error.message?.includes('database')) {
      return 'Database error occurred';
    }
    if (error.message?.includes('JWT') || error.message?.includes('token')) {
      return 'Authentication error';
    }
    if (error.message?.includes('decrypt') || error.message?.includes('encrypt')) {
      return 'Encryption error occurred';
    }
    return 'An error occurred';
  }
  // Development: show detailed errors
  return error.message || 'An error occurred';
}

/**
 * Validate MongoDB ObjectId format to prevent NoSQL injection
 */
export function isValidObjectId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }
  // MongoDB ObjectId is 24 hex characters
  return /^[0-9a-fA-F]{24}$/.test(id);
}
