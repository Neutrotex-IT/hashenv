/**
 * Database Wipe Script
 *
 * Removes all documents from every MongoDB collection in the configured database.
 * Use for local/dev resets. Requires explicit confirmation.
 *
 * Usage:
 *   npx tsx scripts/wipe-database.ts --dry-run
 *   npx tsx scripts/wipe-database.ts --yes
 *   npx tsx scripts/wipe-database.ts --yes --preserve-users
 *   npx tsx scripts/wipe-database.ts --yes --preserve-user-settings
 *   npx tsx scripts/wipe-database.ts --yes --preserve-users --preserve-user-settings
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const USER_COLLECTION = 'users';
const USER_SETTINGS_COLLECTION = 'usersettings';

interface WipeOptions {
  confirm: boolean;
  dryRun: boolean;
  preserveUsers: boolean;
  preserveUserSettings: boolean;
}

function printUsage(): void {
  console.log('Usage: npx tsx scripts/wipe-database.ts [options]\n');
  console.log('Options:');
  console.log('  --yes                      Required to perform the wipe');
  console.log('  --dry-run                  List collections and counts without deleting');
  console.log('  --preserve-users           Keep the users collection');
  console.log('  --preserve-user-settings   Keep the usersettings collection');
  console.log('  --help                     Show this help message\n');
  console.log('Examples:');
  console.log('  npx tsx scripts/wipe-database.ts --dry-run');
  console.log('  npx tsx scripts/wipe-database.ts --yes');
  console.log('  npx tsx scripts/wipe-database.ts --yes --preserve-users --preserve-user-settings');
}

function parseArgs(argv: string[]): WipeOptions | null {
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    return null;
  }

  return {
    confirm: argv.includes('--yes'),
    dryRun: argv.includes('--dry-run'),
    preserveUsers: argv.includes('--preserve-users'),
    preserveUserSettings: argv.includes('--preserve-user-settings'),
  };
}

function getPreservedCollections(options: WipeOptions): Set<string> {
  const preserved = new Set<string>();

  if (options.preserveUsers) {
    preserved.add(USER_COLLECTION);
  }

  if (options.preserveUserSettings) {
    preserved.add(USER_SETTINGS_COLLECTION);
  }

  return preserved;
}

function getDatabaseName(uri: string): string {
  try {
    const pathname = new URL(uri).pathname.replace(/^\//, '');
    const dbName = pathname.split('/')[0];
    return dbName || '(default)';
  } catch {
    return '(unknown)';
  }
}

async function wipeDatabase(options: WipeOptions): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI not set');
    process.exit(1);
  }

  if (!options.confirm && !options.dryRun) {
    console.error('ERROR: Pass --yes to wipe the database or --dry-run to preview changes.');
    printUsage();
    process.exit(1);
  }

  const preserved = getPreservedCollections(options);
  const mode = options.dryRun ? 'DRY RUN' : 'WIPE';

  console.log('========================================');
  console.log(`  HashEnv Database ${mode}`);
  console.log('========================================\n');
  console.log(`Database: ${getDatabaseName(mongoUri)}`);

  if (preserved.size > 0) {
    console.log(`Preserving: ${[...preserved].sort().join(', ')}`);
  } else {
    console.log('Preserving: (none)');
  }

  console.log('');

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected.\n');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection is not available');
    }

    const collections = await db.listCollections().toArray();
    const targets = collections
      .map((collection) => collection.name)
      .filter((name) => !name.startsWith('system.'))
      .sort();

    if (targets.length === 0) {
      console.log('No collections found.');
      return;
    }

    let wipedCount = 0;
    let preservedCount = 0;
    let totalDocuments = 0;

    for (const collectionName of targets) {
      const collection = db.collection(collectionName);
      const documentCount = await collection.countDocuments();

      if (preserved.has(collectionName)) {
        preservedCount += 1;
        console.log(`  SKIP  ${collectionName} (${documentCount} documents preserved)`);
        continue;
      }

      totalDocuments += documentCount;

      if (options.dryRun) {
        console.log(`  WIPE  ${collectionName} (${documentCount} documents)`);
        continue;
      }

      const result = await collection.deleteMany({});
      wipedCount += 1;
      console.log(`  WIPE  ${collectionName} (${result.deletedCount ?? 0} documents deleted)`);
    }

    console.log('\n========================================');
    if (options.dryRun) {
      console.log('  DRY RUN COMPLETE');
      console.log('========================================\n');
      console.log(`Collections to wipe: ${targets.length - preservedCount}`);
      console.log(`Collections preserved: ${preservedCount}`);
      console.log(`Documents that would be deleted: ${totalDocuments}`);
      console.log('\nRun with --yes to perform the wipe.');
    } else {
      console.log('  WIPE COMPLETE');
      console.log('========================================\n');
      console.log(`Collections wiped: ${wipedCount}`);
      console.log(`Collections preserved: ${preservedCount}`);
    }
  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

const options = parseArgs(process.argv.slice(2));
if (options) {
  wipeDatabase(options);
}
