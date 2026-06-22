import { Request, Response, NextFunction } from 'express';
import { ProjectApiToken, hashApiToken, ApiTokenScope } from '../models/ProjectApiToken';
import Project from '../models/Project';
import mongoose from 'mongoose';
import { isApiTokenCreatorAuthorized } from './apiTokenLifecycle';

// Rate limiting for API token usage
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requests per minute per token

export interface ApiTokenRequest extends Request {
  apiToken?: {
    tokenId: string;
    projectId: string;
    scopes: ApiTokenScope[];
    createdBy: string;
  };
  project?: {
    _id: mongoose.Types.ObjectId;
    name: string;
    organizationId: mongoose.Types.ObjectId;
  };
}

/**
 * Check rate limit for API token
 */
function checkRateLimit(tokenHash: string): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get(tokenHash);
  
  if (!limit || now > limit.resetAt) {
    rateLimitMap.set(tokenHash, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (limit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }
  
  limit.count++;
  return true;
}

/**
 * Get rate limit info for response headers
 */
function getRateLimitInfo(tokenHash: string): { remaining: number; resetAt: number } {
  const now = Date.now();
  const limit = rateLimitMap.get(tokenHash);
  
  if (!limit || now > limit.resetAt) {
    return { remaining: RATE_LIMIT_MAX_REQUESTS, resetAt: now + RATE_LIMIT_WINDOW_MS };
  }
  
  return {
    remaining: Math.max(0, RATE_LIMIT_MAX_REQUESTS - limit.count),
    resetAt: limit.resetAt,
  };
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetAt) {
      rateLimitMap.delete(key);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * Middleware to authenticate API token requests
 * Expects: Authorization: Bearer henv_<token>
 */
export async function authenticateApiToken(
  req: ApiTokenRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }
    
    const token = authHeader.substring(7);
    
    // Validate token format
    if (!token.startsWith('henv_')) {
      res.status(401).json({ error: 'Invalid API token format' });
      return;
    }
    
    const tokenHash = hashApiToken(token);
    
    // Check rate limit
    if (!checkRateLimit(tokenHash)) {
      const rateLimitInfo = getRateLimitInfo(tokenHash);
      res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetAt / 1000).toString());
      res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
      return;
    }
    
    // Find token in database
    const apiToken = await ProjectApiToken.findOne({ tokenHash });
    
    if (!apiToken) {
      res.status(401).json({ error: 'Invalid API token' });
      return;
    }
    
    // Check expiration
    if (apiToken.expiresAt && apiToken.expiresAt < new Date()) {
      res.status(401).json({ error: 'API token has expired' });
      return;
    }
    
    // Load the project
    const project = await Project.findById(apiToken.projectId);
    
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const creatorAuthorized = await isApiTokenCreatorAuthorized(
      apiToken.createdBy.toString(),
      project
    );
    if (!creatorAuthorized) {
      res.status(401).json({ error: 'API token has been revoked' });
      return;
    }
    
    // Update last used timestamp (fire and forget)
    ProjectApiToken.updateOne(
      { _id: apiToken._id },
      { $set: { lastUsedAt: new Date() } }
    ).exec();
    
    // Add rate limit headers
    const rateLimitInfo = getRateLimitInfo(tokenHash);
    res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX_REQUESTS.toString());
    res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining.toString());
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetAt / 1000).toString());
    
    // Attach token info to request
    req.apiToken = {
      tokenId: apiToken._id.toString(),
      projectId: apiToken.projectId.toString(),
      scopes: apiToken.scopes,
      createdBy: apiToken.createdBy.toString(),
    };
    req.project = {
      _id: project._id,
      name: project.name,
      organizationId: project.organizationId,
    };
    
    next();
  } catch (error) {
    console.error('API token auth error:', error instanceof Error ? error.message : 'Unknown error');
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Middleware to require specific scope(s)
 */
export function requireApiScope(...requiredScopes: ApiTokenScope[]) {
  return (req: ApiTokenRequest, res: Response, next: NextFunction): void => {
    if (!req.apiToken) {
      res.status(401).json({ error: 'API token required' });
      return;
    }
    
    const hasAllScopes = requiredScopes.every(scope => 
      req.apiToken!.scopes.includes(scope)
    );
    
    if (!hasAllScopes) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredScopes,
        granted: req.apiToken.scopes,
      });
      return;
    }
    
    next();
  };
}

/**
 * Middleware to ensure API token belongs to the requested project
 */
export function requireApiTokenProject(
  req: ApiTokenRequest,
  res: Response,
  next: NextFunction
): void {
  const projectId = req.params.projectId;
  
  if (!req.apiToken) {
    res.status(401).json({ error: 'API token required' });
    return;
  }
  
  if (req.apiToken.projectId !== projectId) {
    res.status(403).json({ error: 'Token not authorized for this project' });
    return;
  }
  
  next();
}
