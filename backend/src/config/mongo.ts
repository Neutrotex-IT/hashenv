import mongoose from 'mongoose';

/**
 * Explicit DB name (URI path or this env). Atlas URIs without a path otherwise land on "test".
 */
export function getMongoDbName(): string {
  return (process.env.MONGODB_DB_NAME || 'hashenv').trim() || 'hashenv';
}

export function shouldUseMongoTls(uri: string): boolean {
  if (process.env.MONGODB_TLS === 'true') return true;
  if (process.env.MONGODB_TLS === 'false') return false;
  if (uri.includes('mongodb+srv://')) return true;
  if (/[?&]tls=true/i.test(uri)) return true;
  return false;
}

/**
 * Assumptions (Atlas M0 free + single long-running Express process, OLTP):
 * keep the pool modest so idle sockets do not burn shared-tier connection budget.
 * Test/local Docker Mongo uses a smaller pool and shorter timeouts.
 */
export function getMongoConnectOptions(): mongoose.ConnectOptions {
  const isTest = process.env.NODE_ENV === 'test';

  return {
    dbName: getMongoDbName(),
    ...(shouldUseMongoTls(process.env.MONGODB_URI || '') && {
      tls: true,
      tlsAllowInvalidCertificates: false,
    }),
    maxPoolSize: isTest ? 5 : 20,
    minPoolSize: 0,
    maxIdleTimeMS: 60_000,
    connectTimeoutMS: isTest ? 5_000 : 10_000,
    serverSelectionTimeoutMS: isTest ? 5_000 : 10_000,
    socketTimeoutMS: isTest ? 30_000 : 45_000,
    retryWrites: true,
    w: 'majority',
  };
}

export async function connectMongo(uri?: string): Promise<typeof mongoose> {
  const mongoUri = uri || process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set.');
  }
  return mongoose.connect(mongoUri, getMongoConnectOptions());
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.connection.close();
}
