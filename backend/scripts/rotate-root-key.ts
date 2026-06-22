/**
 * Root Encryption Key Rotation Script
 * 
 * This script rotates the ROOT_ENCRYPTION_KEY by re-wrapping the instance key.
 * All org DEKs, project DEKs, and ciphertext remain unchanged.
 * 
 * Usage:
 *   npx ts-node scripts/rotate-root-key.ts <new-root-key>
 * 
 * After running:
 *   1. Update ROOT_ENCRYPTION_KEY in your environment
 *   2. Restart all server instances
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { initializeKeyStore, reWrapInstanceKey, clearKeyCache } from '../src/crypto';
import InstanceKey from '../src/models/InstanceKey';

dotenv.config();

async function rotateRootKey(newRootKey: string): Promise<void> {
  console.log('========================================');
  console.log('  HashEnv Root Key Rotation');
  console.log('========================================\n');

  // Validate new key
  if (!newRootKey || newRootKey.length < 32) {
    console.error('ERROR: New root key must be at least 32 characters long');
    process.exit(1);
  }

  const currentKey = process.env.ROOT_ENCRYPTION_KEY;
  if (!currentKey || currentKey.length < 32) {
    console.error('ERROR: Current ROOT_ENCRYPTION_KEY not set or invalid');
    process.exit(1);
  }

  if (newRootKey === currentKey) {
    console.error('ERROR: New root key must be different from current key');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('ERROR: MONGODB_URI not set');
    process.exit(1);
  }

  try {
    // Connect to MongoDB
    console.log('1. Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('   Connected.\n');

    // Check instance key exists
    console.log('2. Checking instance key...');
    const instanceKey = await InstanceKey.findOne();
    if (!instanceKey) {
      console.error('ERROR: No instance key found. Nothing to rotate.');
      process.exit(1);
    }
    console.log(`   Found instance key (version ${instanceKey.keyVersion}).\n`);

    // Initialize key store with current key
    console.log('3. Unwrapping instance key with current root key...');
    await initializeKeyStore();
    console.log('   Success.\n');

    // Re-wrap with new key
    console.log('4. Re-wrapping instance key with new root key...');
    const newVersion = await reWrapInstanceKey(newRootKey);
    console.log(`   Success. New version: ${newVersion}\n`);

    // Verify by re-initializing with new key
    console.log('5. Verifying new key works...');
    clearKeyCache();
    process.env.ROOT_ENCRYPTION_KEY = newRootKey;
    await initializeKeyStore();
    console.log('   Verification successful.\n');

    console.log('========================================');
    console.log('  ROTATION COMPLETE');
    console.log('========================================\n');
    console.log('NEXT STEPS:');
    console.log('1. Update ROOT_ENCRYPTION_KEY in your environment/secrets:');
    console.log(`   ROOT_ENCRYPTION_KEY="${newRootKey}"`);
    console.log('2. Restart all server instances');
    console.log('3. Verify application health\n');

  } catch (error) {
    console.error('\nERROR:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length !== 1) {
  console.log('Usage: npx ts-node scripts/rotate-root-key.ts <new-root-key>');
  console.log('\nExample:');
  console.log('  npx ts-node scripts/rotate-root-key.ts "your-new-secret-key-at-least-32-chars"');
  process.exit(1);
}

rotateRootKey(args[0]);
