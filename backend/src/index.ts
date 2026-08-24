import dotenv from 'dotenv';
import cron from 'node-cron';
import mongoose from 'mongoose';
import { createApp } from './app';
import { connectMongo, getMongoDbName } from './config/mongo';
import { backfillSchemaVersions, ensureCollectionValidators } from './config/collectionValidators';
import { syncTouchedModelIndexes } from './config/syncIndexes';
import { bootstrapEncryption } from './crypto';
import { runAutoFlush } from './lib/autoFlush';
import { runArchiveAuditLogs } from './lib/archiveAuditLogs';
import { pruneAllOversizedSecretFileVersionGroups } from './lib/secretFiles';
import Project from './models/Project';
import { DEFAULT_ENVIRONMENTS } from './lib/environments';

dotenv.config();

const PORT = process.env.PORT || 3001;
const app = createApp();

connectMongo()
  .then(async () => {
    const dbName = mongoose.connection.name || getMongoDbName();
    console.log(`Connected to MongoDB (database: ${dbName})`);

    try {
      await bootstrapEncryption();
    } catch (error) {
      console.error(
        'FATAL: Encryption bootstrap failed:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      process.exit(1);
    }

    try {
      await syncTouchedModelIndexes();
    } catch (error) {
      console.warn(
        '[Indexes] sync warning:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      await backfillSchemaVersions();
      await ensureCollectionValidators();
    } catch (error) {
      console.warn(
        '[Schema] validation bootstrap warning:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      const result = await Project.updateMany(
        {
          $or: [{ environments: { $exists: false } }, { environments: { $size: 0 } }],
        },
        { $set: { environments: [...DEFAULT_ENVIRONMENTS] } }
      );
      if (result.modifiedCount > 0) {
        console.log(`Backfilled environments for ${result.modifiedCount} project(s)`);
      }
    } catch (error) {
      console.warn(
        'Environment backfill warning:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    try {
      const pruned = await pruneAllOversizedSecretFileVersionGroups();
      if (pruned > 0) {
        console.log(`[SecretFile] Pruned ${pruned} old version(s) over retention cap`);
      }
    } catch (error) {
      console.warn(
        '[SecretFile] Version prune backfill warning:',
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`API: http://localhost:${PORT}/api`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
      }
      console.log('\n');
    });

    // Health ping cron — only for platforms that sleep idle backends (e.g. Render).
    if (process.env.NODE_ENV === 'production' && process.env.BACKEND_URL) {
      const backendUrl = process.env.BACKEND_URL.replace(/\/$/, '');
      const healthUrl = `${backendUrl}/api/health`;

      const pingHealth = async () => {
        try {
          const response = await fetch(healthUrl, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          if (response.ok) {
            console.log(
              `[Health Ping] Successfully pinged health endpoint at ${new Date().toISOString()}`
            );
          } else {
            console.warn(`[Health Ping] Health check returned status ${response.status}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.warn(`[Health Ping] Failed to ping health endpoint: ${errorMessage}`);
        }
      };

      pingHealth();
      cron.schedule('*/14 * * * *', () => {
        pingHealth();
      });
      console.log('[Health Ping] Cron job started - pinging health endpoint every 14 minutes');
    } else if (process.env.NODE_ENV === 'production') {
      console.log('[Health Ping] Skipped — BACKEND_URL not set (not required on Coolify)');
    } else {
      console.log('[Health Ping] Skipped in development mode');
    }

    cron.schedule('0 * * * *', () => {
      runAutoFlush().catch((error) => {
        console.error(
          '[AutoFlush] Job failed:',
          error instanceof Error ? error.message : 'Unknown error'
        );
      });
    });
    console.log('[AutoFlush] Cron job started - checking hourly');

    cron.schedule('0 3 * * *', () => {
      runArchiveAuditLogs()
        .then(({ archived }) => {
          if (archived > 0) {
            console.log(`[AuditArchive] Moved ${archived} log(s) to archive`);
          }
        })
        .catch((error) => {
          console.error(
            '[AuditArchive] Job failed:',
            error instanceof Error ? error.message : 'Unknown error'
          );
        });
    });
    console.log('[AuditArchive] Cron job started - archiving logs older than 90 days daily at 03:00');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  });

async function shutdown(signal: string): Promise<void> {
  console.log(`[Shutdown] ${signal} received - closing MongoDB connection`);
  try {
    await mongoose.connection.close();
  } catch (error) {
    console.error(
      '[Shutdown] MongoDB close error:',
      error instanceof Error ? error.message : 'Unknown'
    );
  }
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});
