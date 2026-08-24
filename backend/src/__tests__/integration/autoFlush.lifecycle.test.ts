import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { getTestApp, resetDatabase, closeTestApp } from '../helpers/testApp';
import {
  authHeader,
  createComponent,
  createProject,
  createTeamOrg,
  createVerifiedUser,
} from '../helpers/factories';
import UserSettings from '../../models/UserSettings';
import SecretFile from '../../models/SecretFile';
import AuditLog from '../../models/AuditLog';
import { runAutoFlush } from '../../lib/autoFlush';

describe('Auto-flush lifecycle (Q5 / settings-driven)', () => {
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

  it('deletes eligible secret files when flush interval has elapsed (happy)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id);
    const component = await createComponent(app, user.accessToken, project.id);

    const upload = await request(app)
      .post(`/api/projects/${project.id}/components/${component.id}/secret-files`)
      .set(authHeader(user.accessToken))
      .field('environment', 'dev')
      .field('fileName', '.env')
      .field('content', 'FLUSH=1\n');
    expect(upload.status).toBe(201);

    await UserSettings.create({
      userId: user.userId,
      flushDuration: 1,
      lastFlushAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    await runAutoFlush();

    expect(await SecretFile.countDocuments({ projectId: project.id })).toBe(0);

    const flushAudits = await AuditLog.find({
      projectId: project.id,
      resourceType: 'secret_file',
      action: 'delete',
      'metadata.reason': 'auto_flush',
    });
    expect(flushAudits.length).toBeGreaterThanOrEqual(1);
    expect(flushAudits[0].metadata?.flushedCount).toBeGreaterThanOrEqual(1);

    const settings = await UserSettings.findOne({ userId: user.userId });
    expect(settings?.lastFlushAt).toBeTruthy();
    expect(settings!.lastFlushAt!.getTime()).toBeGreaterThan(Date.now() - 60_000);
  });

  it('skips flush when interval has not elapsed (unhappy)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id);
    const component = await createComponent(app, user.accessToken, project.id);

    await request(app)
      .post(`/api/projects/${project.id}/components/${component.id}/secret-files`)
      .set(authHeader(user.accessToken))
      .field('environment', 'dev')
      .field('fileName', '.env')
      .field('content', 'KEEP=1\n')
      .expect(201);

    await UserSettings.create({
      userId: user.userId,
      flushDuration: 24,
      lastFlushAt: new Date(),
    });

    await runAutoFlush();

    expect(await SecretFile.countDocuments({ projectId: project.id })).toBe(1);
  });

  it('no-ops when flush is disabled or project has no files (edge)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    await createProject(app, user.accessToken, org.id);

    await UserSettings.create({
      userId: user.userId,
      flushDuration: null,
      lastFlushAt: null,
    });

    await runAutoFlush();
    expect(await SecretFile.countDocuments()).toBe(0);

    await UserSettings.updateOne(
      { userId: user.userId },
      { $set: { flushDuration: 1, lastFlushAt: new Date(0) } }
    );

    await runAutoFlush();
    const settings = await UserSettings.findOne({ userId: user.userId });
    expect(settings?.lastFlushAt).toBeTruthy();
    expect(await AuditLog.countDocuments({ 'metadata.reason': 'auto_flush' })).toBe(0);
  });
});
