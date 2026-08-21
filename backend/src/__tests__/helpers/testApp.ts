import mongoose from 'mongoose';
import type { Application } from 'express';
import { createApp } from '../../app';
import { connectMongo, disconnectMongo } from '../../config/mongo';
import {
  bootstrapEncryption,
  resetEncryptionStatusForTests,
  clearKeyCache,
} from '../../crypto';

let appInstance: Application | null = null;
let bootstrapped = false;

/**
 * Ensure Mongo is connected, encryption is ready, and Express app exists.
 * Safe to call from multiple describe blocks (singleton per process).
 */
export async function getTestApp(): Promise<Application> {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set for integration/e2e tests');
  }

  if (mongoose.connection.readyState === 0) {
    await connectMongo();
  }

  if (!bootstrapped) {
    clearKeyCache();
    resetEncryptionStatusForTests();
    await bootstrapEncryption();
    bootstrapped = true;
  }

  if (!appInstance) {
    appInstance = createApp();
  }

  return appInstance;
}

/**
 * Wipe all collections and re-bootstrap encryption (new instance key).
 * Call in beforeEach for isolation.
 */
export async function resetDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    throw new Error('MongoDB is not connected');
  }

  const collections = await mongoose.connection.db!.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));

  clearKeyCache();
  resetEncryptionStatusForTests();
  await bootstrapEncryption();
  bootstrapped = true;
}

export async function closeTestApp(): Promise<void> {
  clearKeyCache();
  resetEncryptionStatusForTests();
  bootstrapped = false;
  appInstance = null;
  if (mongoose.connection.readyState !== 0) {
    await disconnectMongo();
  }
}
