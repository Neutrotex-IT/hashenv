import UserSettings from '../models/UserSettings';
import SecretFile from '../models/SecretFile';
import { getPanicEligibleProjects } from './panicProjects';
import { auditSecretFile } from './audit';

/**
 * Delete secrets files for users whose auto-flush interval has elapsed.
 * Runs on a schedule from index.ts.
 */
export async function runAutoFlush(): Promise<void> {
  const settingsList = await UserSettings.find({
    flushDuration: { $ne: null, $gte: 1 },
  });

  const now = Date.now();

  for (const settings of settingsList) {
    const hours = settings.flushDuration!;
    const intervalMs = hours * 60 * 60 * 1000;
    const lastFlushAt = settings.lastFlushAt?.getTime() ?? 0;

    if (now - lastFlushAt < intervalMs) {
      continue;
    }

    const userId = settings.userId.toString();
    const projects = await getPanicEligibleProjects(userId);

    if (projects.length === 0) {
      settings.lastFlushAt = new Date();
      await settings.save();
      continue;
    }

    let flushedCount = 0;

    for (const project of projects) {
      const projectId = project._id.toString();
      const result = await SecretFile.deleteMany({ projectId: project._id });

      if (result.deletedCount === 0) {
        continue;
      }

      flushedCount += result.deletedCount;

      await auditSecretFile(projectId, userId, 'delete', undefined, {
        reason: 'auto_flush',
        flushedCount: result.deletedCount,
        flushDurationHours: hours,
      });
    }

    settings.lastFlushAt = new Date();
    await settings.save();

    if (flushedCount > 0) {
      console.log(`[AutoFlush] User ${userId}: deleted ${flushedCount} secrets file(s) across ${projects.length} project(s)`);
    }
  }
}
