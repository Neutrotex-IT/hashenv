import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import morgan from 'morgan';
import cron from 'node-cron';
import authRoutes from './routes/auth';
import inviteRoutes from './routes/invites';
import organizationRoutes from './routes/organizations';
import projectRoutes from './routes/projects';
import environmentRoutes from './routes/environments';
import envRoutes from './routes/env';
import secretsRoutes from './routes/secrets';
import associatedAccountsRoutes from './routes/associatedAccounts';
import settingsRoutes from './routes/settings';
import apiTokenRoutes from './routes/apiTokens';
import publicApiRoutes from './routes/api';
import { securityHeaders, apiRateLimiter } from './middleware/security';
import { sanitizeError } from './middleware/security';
import { bootstrapEncryption, getEncryptionStatus } from './crypto';
import { runAutoFlush } from './lib/autoFlush';
import Project from './models/Project';
import { DEFAULT_ENVIRONMENTS } from './lib/environments';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const MONGODB_URI = process.env.MONGODB_URI;

// Trust proxy - Required for Render and other reverse proxy setups
// Set to 1 to trust only the first proxy (Render's proxy), which is more secure
// This allows Express to correctly identify client IPs from X-Forwarded-* headers
app.set('trust proxy', 1);

// Security: Helmet for security headers
app.use(securityHeaders);

// HTTP request logging (development only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev')); // Colored, concise logging format
}

// Security: CORS configuration
// Supports single origin (FRONTEND_URL) or multiple origins (CORS_ORIGINS - comma-separated)
function getCorsOrigins(): string | string[] | boolean {
  // Check if CORS_ORIGINS is set (comma-separated list for multiple origins)
  const corsOriginsEnv = process.env.CORS_ORIGINS;
  
  if (corsOriginsEnv) {
    // Split by comma and trim each origin
    const origins = corsOriginsEnv.split(',').map(origin => origin.trim()).filter(Boolean);
    
    if (origins.length > 0) {
      // In production, only allow specified origins
      if (process.env.NODE_ENV === 'production') {
        return origins;
      }
      // In development, also allow localhost
      return [...origins, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    }
  }
  
  // Fallback to FRONTEND_URL (single origin)
  const frontendUrl = process.env.FRONTEND_URL;
  
  if (frontendUrl) {
    // In development, also allow localhost even if FRONTEND_URL is set
    if (process.env.NODE_ENV === 'development') {
      return [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    }
    return frontendUrl;
  }
  
  // Default: allow localhost in development, deny all in production
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CORS configuration error: FRONTEND_URL or CORS_ORIGINS must be set in production');
  }
  
  return 'http://localhost:3000';
}

const corsOptions: cors.CorsOptions = {
  origin: getCorsOrigins(),
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Expose rate limit headers for API clients
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  // Security: Max age for preflight requests (24 hours)
  maxAge: 86400,
  // Security: Validate origin in production
  ...(process.env.NODE_ENV === 'production' && {
    preflightContinue: false,
  }),
};

app.use(cors(corsOptions));

// Cookie parser for refresh tokens
app.use(cookieParser());

// Security: Request size limits (prevent DoS)
app.use(express.json({ limit: '100kb' })); // Limit JSON payloads
app.use(express.urlencoded({ extended: true, limit: '100kb' })); // Limit URL-encoded payloads

// Health check endpoints
// /health - for Render deployment health checks (required by Render)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// /api/health - for application health checks and cron job pings
app.get('/api/health', (req, res) => {
  const encryptionStatus = getEncryptionStatus();
  res.json({
    status: encryptionStatus.initialized ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    encryption: {
      initialized: encryptionStatus.initialized,
      hasInstanceKey: encryptionStatus.hasInstanceKey,
      error: encryptionStatus.error,
    },
  });
});

// Security: Apply rate limiting to API routes
app.use('/api', apiRateLimiter);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', environmentRoutes);
app.use('/api/projects', envRoutes);
app.use('/api/projects', secretsRoutes);
app.use('/api/projects', associatedAccountsRoutes);
app.use('/api/projects', apiTokenRoutes);
app.use('/api/settings', settingsRoutes);

// Public API (API token authenticated)
app.use('/api/v1', publicApiRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Security: Sanitize error messages in production
  const errorMessage = sanitizeError(err);
  
  // Log full error details (server-side only)
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  
  // Handle multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 50KB limit' });
    }
    return res.status(400).json({ error: 'File upload error' });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid input data' });
  }
  
  // Handle MongoDB errors
  if (err.name === 'CastError' || err.name === 'MongoError') {
    return res.status(400).json({ error: 'Invalid data format' });
  }
  
  // Generic error response
  res.status(err.status || 500).json({
    error: errorMessage,
  });
});

// Connect to MongoDB
if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not set.');
  process.exit(1);
}

// Security: MongoDB connection options
function shouldUseMongoTls(uri: string): boolean {
  if (process.env.MONGODB_TLS === 'true') return true;
  if (process.env.MONGODB_TLS === 'false') return false;
  // Atlas / SRV and explicit tls=true URIs require TLS
  if (uri.includes('mongodb+srv://')) return true;
  if (/[?&]tls=true/i.test(uri)) return true;
  return false;
}

const mongoOptions: mongoose.ConnectOptions = {
  ...(shouldUseMongoTls(MONGODB_URI) && {
    tls: true,
    tlsAllowInvalidCertificates: false,
  }),
  // Security: Connection timeout
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  // Security: Retry configuration
  retryWrites: true,
  w: 'majority',
};

mongoose
  .connect(MONGODB_URI, mongoOptions)
  .then(async () => {
    console.log('Connected to MongoDB');
    
    // Bootstrap encryption system
    try {
      await bootstrapEncryption();
    } catch (error) {
      console.error('FATAL: Encryption bootstrap failed:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }

    // Backfill default environments for existing projects
    try {
      const result = await Project.updateMany(
        { $or: [{ environments: { $exists: false } }, { environments: { $size: 0 } }] },
        { $set: { environments: [...DEFAULT_ENVIRONMENTS] } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Backfilled environments for ${result.modifiedCount} project(s)`);
      }
    } catch (error) {
      console.warn('Environment backfill warning:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    // Start server
    app.listen(PORT, () => {
     
      console.log(`Server running on port ${PORT}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`API: http://localhost:${PORT}/api`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
      }
      console.log('\n');
    });

    // Health ping cron — only for platforms that sleep idle backends (e.g. Render).
    // Set BACKEND_URL to your public API origin (no trailing slash), e.g. https://api.example.com
    // Not needed on Coolify; skipped when BACKEND_URL is unset.
    if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
      const backendUrl = process.env.BACKEND_URL.replace(/\/$/, '');
      const healthUrl = `${backendUrl}/api/health`;

      // Ping immediately on startup
      const pingHealth = async () => {
        try {
          const response = await fetch(healthUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            console.log(`[Health Ping] Successfully pinged health endpoint at ${new Date().toISOString()}`);
          } else {
            console.warn(`[Health Ping] Health check returned status ${response.status}`);
          }
        } catch (error) {
          // Silently fail - don't spam logs, but log occasionally
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`[Health Ping] Failed to ping health endpoint: ${errorMessage}`);
        }
      };

      // Ping immediately
      pingHealth();

      // Schedule cron job to run every 14 minutes
      // Cron format: minute hour day month day-of-week
      // */14 * * * * means every 14 minutes
      cron.schedule('*/14 * * * *', () => {
        pingHealth();
      });

      console.log('[Health Ping] Cron job started - pinging health endpoint every 14 minutes');
    } else if (process.env.NODE_ENV === 'production') {
      console.log('[Health Ping] Skipped — BACKEND_URL not set (not required on Coolify)');
    } else {
      console.log('[Health Ping] Skipped in development mode');
    }

    // Auto-flush cron: check every hour for users with flushDuration configured
    cron.schedule('0 * * * *', () => {
      runAutoFlush().catch((error) => {
        console.error('[AutoFlush] Job failed:', error instanceof Error ? error.message : 'Unknown error');
      });
    });
    console.log('[AutoFlush] Cron job started - checking hourly');
  })
  .catch((error) => {
    // Security: Don't log full connection string
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
