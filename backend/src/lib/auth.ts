import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { Request, Response, NextFunction } from 'express';
import User from '../models/User';

function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET environment variable must be set and be at least 32 characters long');
  }
  return secret;
}

const ACCESS_TOKEN_EXPIRES = '1h';
export const REFRESH_TOKEN_EXPIRES_DAYS = 7;

export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }
  if (password.length > 128) {
    throw new Error('Password must be less than 128 characters');
  }
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    getJWTSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRES } as SignOptions
  );
}

export function generateToken(userId: string, email: string): string {
  return generateAccessToken(userId, email);
}

export function verifyToken(token: string): { userId: string; email: string } {
  try {
    const decoded = jwt.verify(token, getJWTSecret()) as { userId: string; email: string };
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    email: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token);
      
      const user = await User.findById(decoded.userId).select('-password');
      if (!user) {
        res.status(401).json({ error: 'User not found' });
        return;
      }
      
      if (!user.emailVerified) {
        res.status(403).json({ 
          error: 'Email not verified. Please verify your email before accessing this resource.',
          emailVerified: false,
        });
        return;
      }
      
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
      
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
    return;
  }
}
