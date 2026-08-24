import AuditLog from '../models/AuditLog';
import '../models/AuditLogArchive';
import { AUDIT_ARCHIVE_BATCH_SIZE, AUDIT_RETENTION_DAYS } from './auditRetention';

/**
 * MongoDB Archive Pattern: move audit docs older than retention into
 * auditlogarchives via $merge, then delete from the hot collection.
 * Batched for Atlas M0.
 */
export async function runArchiveAuditLogs(): Promise<{ archived: number }> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - AUDIT_RETENTION_DAYS);

  let archived = 0;

  for (;;) {
    const batch = await AuditLog.find({ createdAt: { $lt: cutoff } })
      .select('_id')
      .sort({ createdAt: 1 })
      .limit(AUDIT_ARCHIVE_BATCH_SIZE)
      .lean();

    if (batch.length === 0) {
      break;
    }

    const ids = batch.map((doc) => doc._id);

    await AuditLog.aggregate([
      { $match: { _id: { $in: ids } } },
      {
        $merge: {
          into: 'auditlogarchives',
          on: '_id',
          whenMatched: 'keepExisting',
          whenNotMatched: 'insert',
        },
      },
    ]);

    const deleteResult = await AuditLog.deleteMany({ _id: { $in: ids } });
    archived += deleteResult.deletedCount ?? 0;

    if (batch.length < AUDIT_ARCHIVE_BATCH_SIZE) {
      break;
    }
  }

  return { archived };
}
