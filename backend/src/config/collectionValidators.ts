import mongoose from 'mongoose';
import { SECRET_FILE_TYPES } from '../lib/secretFiles';

type JsonSchema = Record<string, unknown>;

const schemaVersionProp = {
  bsonType: ['int', 'long', 'double'],
  minimum: 1,
  maximum: 1,
  description: 'Document schema version (Schema Versioning Pattern)',
};

const objectIdProp = { bsonType: 'objectId' };
const binDataProp = { bsonType: 'binData' };
const dateProp = { bsonType: 'date' };
const stringProp = { bsonType: 'string' };

const validators: Array<{ collection: string; schema: JsonSchema }> = [
  {
    collection: 'users',
    schema: {
      bsonType: 'object',
      required: ['name', 'username', 'email', 'password', 'emailVerified', 'schemaVersion'],
      properties: {
        _id: objectIdProp,
        name: stringProp,
        username: stringProp,
        email: stringProp,
        password: stringProp,
        emailVerified: { bsonType: 'bool' },
        emailVerificationToken: stringProp,
        emailVerificationExpires: dateProp,
        passwordResetToken: stringProp,
        passwordResetExpires: dateProp,
        schemaVersion: schemaVersionProp,
        createdAt: dateProp,
        __v: { bsonType: 'int' },
      },
      additionalProperties: true,
    },
  },
  {
    collection: 'secrets',
    schema: {
      bsonType: 'object',
      required: [
        'projectId',
        'componentId',
        'name',
        'encryptedData',
        'iv',
        'authTag',
        'createdBy',
        'schemaVersion',
      ],
      properties: {
        _id: objectIdProp,
        projectId: objectIdProp,
        componentId: objectIdProp,
        name: stringProp,
        encryptedData: binDataProp,
        iv: binDataProp,
        authTag: binDataProp,
        createdBy: objectIdProp,
        schemaVersion: schemaVersionProp,
        createdAt: dateProp,
        updatedAt: dateProp,
        __v: { bsonType: 'int' },
      },
      additionalProperties: true,
    },
  },
  {
    collection: 'secretfiles',
    schema: {
      bsonType: 'object',
      required: [
        'projectId',
        'componentId',
        'environment',
        'fileName',
        'fileType',
        'encryptedData',
        'iv',
        'authTag',
        'version',
        'uploadedBy',
        'schemaVersion',
      ],
      properties: {
        _id: objectIdProp,
        projectId: objectIdProp,
        componentId: objectIdProp,
        environment: stringProp,
        fileName: stringProp,
        fileType: { enum: [...SECRET_FILE_TYPES] },
        label: stringProp,
        description: stringProp,
        encryptedData: binDataProp,
        iv: binDataProp,
        authTag: binDataProp,
        contentType: stringProp,
        version: { bsonType: ['int', 'double'] },
        uploadedBy: objectIdProp,
        schemaVersion: schemaVersionProp,
        createdAt: dateProp,
        __v: { bsonType: 'int' },
      },
      additionalProperties: true,
    },
  },
  {
    collection: 'projects',
    schema: {
      bsonType: 'object',
      required: ['name', 'organizationId', 'createdBy', 'schemaVersion'],
      properties: {
        _id: objectIdProp,
        name: stringProp,
        organizationId: objectIdProp,
        createdBy: objectIdProp,
        members: { bsonType: 'array' },
        environments: { bsonType: 'array', items: stringProp },
        schemaVersion: schemaVersionProp,
        createdAt: dateProp,
        __v: { bsonType: 'int' },
      },
      additionalProperties: true,
    },
  },
  {
    collection: 'auditlogs',
    schema: {
      bsonType: 'object',
      required: ['resourceType', 'action', 'actorType', 'actorId', 'schemaVersion'],
      properties: {
        _id: objectIdProp,
        organizationId: objectIdProp,
        projectId: objectIdProp,
        resourceType: stringProp,
        resourceId: stringProp,
        action: stringProp,
        actorType: { enum: ['user', 'api_token'] },
        actorId: objectIdProp,
        actorEmail: stringProp,
        ipAddress: stringProp,
        userAgent: stringProp,
        metadata: { bsonType: 'object' },
        schemaVersion: schemaVersionProp,
        createdAt: dateProp,
        __v: { bsonType: 'int' },
      },
      additionalProperties: true,
    },
  },
];

/**
 * Apply moderate/warn $jsonSchema validators on high-risk collections.
 * Does not fail boot if a collection does not exist yet.
 */
export async function ensureCollectionValidators(): Promise<void> {
  const db = mongoose.connection.db;
  if (!db) {
    console.warn('[Validators] Skipped — no database connection');
    return;
  }

  const existing = await db.listCollections({}, { nameOnly: true }).toArray();
  const existingNames = new Set(existing.map((c) => c.name));

  for (const { collection, schema } of validators) {
    if (!existingNames.has(collection)) {
      console.log(`[Validators] Skipped ${collection} (collection not created yet)`);
      continue;
    }

    try {
      await db.command({
        collMod: collection,
        validator: { $jsonSchema: schema },
        validationLevel: 'moderate',
        validationAction: 'warn',
      });
      console.log(`[Validators] Applied moderate/warn $jsonSchema on ${collection}`);
    } catch (error) {
      console.warn(
        `[Validators] ${collection} collMod warning:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}

/**
 * Backfill schemaVersion: 1 on high-risk collections (Schema Versioning Pattern).
 */
export async function backfillSchemaVersions(): Promise<void> {
  const models = [
    (await import('../models/User')).default,
    (await import('../models/Secret')).default,
    (await import('../models/SecretFile')).default,
    (await import('../models/Project')).default,
    (await import('../models/AuditLog')).default,
  ];

  for (const model of models) {
    try {
      const result = await model.updateMany(
        { schemaVersion: { $exists: false } },
        { $set: { schemaVersion: 1 } }
      );
      if (result.modifiedCount > 0) {
        console.log(
          `[SchemaVersion] Backfilled ${result.modifiedCount} ${model.collection.name} document(s)`
        );
      }
    } catch (error) {
      console.warn(
        `[SchemaVersion] ${model.collection.name} backfill warning:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }
}
