import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import authRoutes from './routes/auth';
import inviteRoutes from './routes/invites';
import organizationRoutes from './routes/organizations';
import projectRoutes from './routes/projects';
import environmentRoutes from './routes/environments';
import componentRoutes from './routes/components';
import secretFilesRoutes from './routes/secretFiles';
import secretsRoutes from './routes/secrets';
import associatedAccountsRoutes from './routes/associatedAccounts';
import settingsRoutes from './routes/settings';
import apiTokenRoutes from './routes/apiTokens';
import publicApiRoutes from './routes/api';
import { securityHeaders, apiRateLimiter, sanitizeError } from './middleware/security';
import { getEncryptionStatus } from './crypto';

function getCorsOrigins(): string | string[] | boolean {
  const corsOriginsEnv = process.env.CORS_ORIGINS;

  if (corsOriginsEnv) {
    const origins = corsOriginsEnv
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (origins.length > 0) {
      if (process.env.NODE_ENV === 'production') {
        return origins;
      }
      return [...origins, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    }
  }

  const frontendUrl = process.env.FRONTEND_URL;

  if (frontendUrl) {
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      return [frontendUrl, 'http://localhost:3000', 'http://127.0.0.1:3000'];
    }
    return frontendUrl;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'CORS configuration error: FRONTEND_URL or CORS_ORIGINS must be set in production'
    );
  }

  return 'http://localhost:3000';
}

/**
 * Build the Express application (no listen, no Mongo connect).
 * Used by the server entrypoint and by integration/e2e tests.
 */
export function createApp(): express.Application {
  const app = express();

  // Trust first proxy (Coolify / reverse proxies) for correct client IPs
  app.set('trust proxy', 1);

  app.use(securityHeaders);

  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  const corsOptions: cors.CorsOptions = {
    origin: getCorsOrigins(),
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: [
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Content-Disposition',
    ],
    maxAge: 86400,
    ...(process.env.NODE_ENV === 'production' && {
      preflightContinue: false,
    }),
  };

  app.use(cors(corsOptions));
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/health', (_req, res) => {
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

  app.use('/api', apiRateLimiter);

  app.use('/api/auth', authRoutes);
  app.use('/api/invites', inviteRoutes);
  app.use('/api/organizations', organizationRoutes);
  app.use('/api/projects', projectRoutes);
  app.use('/api/projects', environmentRoutes);
  app.use('/api/projects', componentRoutes);
  app.use('/api/projects', secretFilesRoutes);
  app.use('/api/projects', secretsRoutes);
  app.use('/api/projects', associatedAccountsRoutes);
  app.use('/api/projects', apiTokenRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/v1', publicApiRoutes);

  app.use(
    (
      err: any,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const errorMessage = sanitizeError(err);

      console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
        timestamp: new Date().toISOString(),
      });

      if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 50KB limit' });
        }
        return res.status(400).json({ error: 'File upload error' });
      }

      if (err.name === 'ValidationError') {
        const fieldErrors = err.errors
          ? Object.values(err.errors as Record<string, { message?: string }>)
              .map((fieldError) => fieldError.message)
              .filter(Boolean)
          : [];
        const message = fieldErrors[0] || 'Invalid input data';
        return res.status(400).json({
          error: message,
          errors: fieldErrors.map((msg) => ({ msg })),
        });
      }

      if (err.name === 'CastError' || err.name === 'MongoError') {
        return res.status(400).json({ error: 'Invalid data format' });
      }

      res.status(err.status || 500).json({
        error: errorMessage,
      });
    }
  );

  return app;
}
