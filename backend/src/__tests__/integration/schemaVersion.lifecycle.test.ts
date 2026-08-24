import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import mongoose from 'mongoose';
import { getTestApp, resetDatabase, closeTestApp } from '../helpers/testApp';
import {
  authHeader,
  createComponent,
  createProject,
  createTeamOrg,
  createVerifiedUser,
  uniqueSuffix,
} from '../helpers/factories';
import User from '../../models/User';
import Project from '../../models/Project';
import Secret from '../../models/Secret';
import SecretFile from '../../models/SecretFile';
import AuditLog from '../../models/AuditLog';
import {
  backfillSchemaVersions,
  ensureCollectionValidators,
} from '../../config/collectionValidators';

describe('Schema version + $jsonSchema lifecycle (F4/F5)', () => {
  let app: Application;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await closeTestApp();
  });

  it('stamps schemaVersion on create for high-risk models (happy)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id);
    const component = await createComponent(app, user.accessToken, project.id);

    const dbUser = await User.findById(user.userId);
    expect(dbUser?.schemaVersion).toBe(1);

    const dbProject = await Project.findById(project.id);
    expect(dbProject?.schemaVersion).toBe(1);

    const upload = await request(app)
      .post(`/api/projects/${project.id}/components/${component.id}/secret-files`)
      .set(authHeader(user.accessToken))
      .field('environment', 'dev')
      .field('fileName', '.env')
      .field('content', 'SV=1\n');
    expect(upload.status).toBe(201);

    const secretFile = await SecretFile.findById(upload.body._id);
    expect(secretFile?.schemaVersion).toBe(1);

    const createSecret = await request(app)
      .post(`/api/projects/${project.id}/components/${component.id}/secrets`)
      .set(authHeader(user.accessToken))
      .send({ name: `s_${uniqueSuffix()}`, content: 'plain' });
    expect(createSecret.status).toBe(201);

    const secret = await Secret.findById(createSecret.body._id);
    expect(secret?.schemaVersion).toBe(1);

    const audit = await AuditLog.findOne({ projectId: project.id, resourceType: 'secret_file' });
    expect(audit?.schemaVersion).toBe(1);
  });

  it('backfills missing schemaVersion and applies validators without failing boot (happy)', async () => {
    const user = await createVerifiedUser();
    await User.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(user.userId) },
      { $unset: { schemaVersion: '' } }
    );
    const stripped = await User.collection.findOne({ _id: new mongoose.Types.ObjectId(user.userId) });
    expect(stripped?.schemaVersion).toBeUndefined();

    await backfillSchemaVersions();
    const restored = await User.findById(user.userId);
    expect(restored?.schemaVersion).toBe(1);

    await ensureCollectionValidators();
    const db = mongoose.connection.db!;
    const info = await db.command({ listCollections: 1, filter: { name: 'users' } });
    const usersInfo = info.cursor.firstBatch[0];
    expect(usersInfo?.options?.validator).toBeTruthy();
    expect(usersInfo?.options?.validationLevel).toBe('moderate');
    expect(usersInfo?.options?.validationAction).toBe('warn');
  });

  it('rejects invalid secret payloads at the API layer (unhappy)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id);
    const component = await createComponent(app, user.accessToken, project.id);

    const noName = await request(app)
      .post(`/api/projects/${project.id}/components/${component.id}/secrets`)
      .set(authHeader(user.accessToken))
      .send({ content: 'x' });
    expect(noName.status).toBe(400);

    const noContent = await request(app)
      .post(`/api/projects/${project.id}/components/${component.id}/secrets`)
      .set(authHeader(user.accessToken))
      .send({ name: 'ok' });
    expect(noContent.status).toBe(400);
  });

  it('backfill is idempotent when schemaVersion already present (edge)', async () => {
    const user = await createVerifiedUser();
    await backfillSchemaVersions();
    await backfillSchemaVersions();
    const dbUser = await User.findById(user.userId);
    expect(dbUser?.schemaVersion).toBe(1);
  });
});
