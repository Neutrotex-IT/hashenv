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
import AuditLog from '../../models/AuditLog';
import AuditLogArchive from '../../models/AuditLogArchive';
import { runArchiveAuditLogs } from '../../lib/archiveAuditLogs';
import { AUDIT_RETENTION_DAYS } from '../../lib/auditRetention';

describe('Project activity / audit log lifecycle', () => {
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

  it('creates audit entries via secret-file upload and lists them (happy CRUD-R)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id);
    const component = await createComponent(app, user.accessToken, project.id);

    const upload = await request(app)
      .post(`/api/projects/${project.id}/components/${component.id}/secret-files`)
      .set(authHeader(user.accessToken))
      .field('environment', 'dev')
      .field('fileName', '.env')
      .field('content', 'A=1\n');
    expect(upload.status).toBe(201);

    const activity = await request(app)
      .get(`/api/projects/${project.id}/activity`)
      .set(authHeader(user.accessToken));
    expect(activity.status).toBe(200);
    expect(Array.isArray(activity.body)).toBe(true);
    expect(
      activity.body.some(
        (log: { resourceType: string; action: string }) =>
          log.resourceType === 'secret_file' && log.action === 'upload'
      )
    ).toBe(true);

    const filtered = await request(app)
      .get(`/api/projects/${project.id}/activity`)
      .query({ resourceType: 'secret_file', environment: 'dev' })
      .set(authHeader(user.accessToken));
    expect(filtered.status).toBe(200);
    expect(filtered.body.length).toBeGreaterThanOrEqual(1);
    expect(filtered.body.every((log: { resourceType: string }) => log.resourceType === 'secret_file')).toBe(
      true
    );

    const orgAudit = await request(app)
      .get(`/api/organizations/${org.id}/audit`)
      .set(authHeader(user.accessToken));
    expect(orgAudit.status).toBe(200);
    expect(orgAudit.body.length).toBeGreaterThanOrEqual(1);
  });

  it('rejects activity for strangers and invalid resourceType (unhappy)', async () => {
    const owner = await createVerifiedUser();
    const stranger = await createVerifiedUser();
    const org = await createTeamOrg(app, owner.accessToken);
    const project = await createProject(app, owner.accessToken, org.id);

    const denied = await request(app)
      .get(`/api/projects/${project.id}/activity`)
      .set(authHeader(stranger.accessToken));
    expect(denied.status).toBe(403);

    const badType = await request(app)
      .get(`/api/projects/${project.id}/activity`)
      .query({ resourceType: 'not_a_type' })
      .set(authHeader(owner.accessToken));
    expect(badType.status).toBe(400);

    const orgDenied = await request(app)
      .get(`/api/organizations/${org.id}/audit`)
      .set(authHeader(stranger.accessToken));
    expect(orgDenied.status).toBe(403);
  });

  it('returns empty activity and rejects unknown environment (edge)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id);

    const empty = await request(app)
      .get(`/api/projects/${project.id}/activity`)
      .set(authHeader(user.accessToken));
    expect(empty.status).toBe(200);
    expect(empty.body).toEqual([]);

    const badEnv = await request(app)
      .get(`/api/projects/${project.id}/activity`)
      .query({ environment: 'does-not-exist' })
      .set(authHeader(user.accessToken));
    expect(badEnv.status).toBe(400);
  });
});

describe('Audit log archive lifecycle (F1)', () => {
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

  async function seedAuditLog(overrides: {
    projectId?: mongoose.Types.ObjectId;
    createdAt: Date;
    action?: string;
  }) {
    const actorId = new mongoose.Types.ObjectId();
    const doc = await AuditLog.create({
      projectId: overrides.projectId,
      resourceType: 'project',
      action: overrides.action || 'update',
      actorType: 'user',
      actorId,
      schemaVersion: 1,
    });
    await AuditLog.collection.updateOne(
      { _id: doc._id },
      { $set: { createdAt: overrides.createdAt } }
    );
    return doc._id;
  }

  it('moves logs older than retention into archive and deletes from hot (happy)', async () => {
    const projectId = new mongoose.Types.ObjectId();
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - (AUDIT_RETENTION_DAYS + 5));
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);

    const oldId = await seedAuditLog({ projectId, createdAt: oldDate, action: 'old_action' });
    const recentId = await seedAuditLog({ projectId, createdAt: recentDate, action: 'recent_action' });

    const result = await runArchiveAuditLogs();
    expect(result.archived).toBeGreaterThanOrEqual(1);

    expect(await AuditLog.findById(oldId)).toBeNull();
    expect(await AuditLog.findById(recentId)).toBeTruthy();
    expect(await AuditLogArchive.findById(oldId)).toBeTruthy();
    expect(await AuditLogArchive.findById(recentId)).toBeNull();
  });

  it('archives nothing when all logs are within retention (unhappy / no-op)', async () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 1);
    await seedAuditLog({ createdAt: recentDate });

    const beforeHot = await AuditLog.countDocuments();
    const result = await runArchiveAuditLogs();
    expect(result.archived).toBe(0);
    expect(await AuditLog.countDocuments()).toBe(beforeHot);
    expect(await AuditLogArchive.countDocuments()).toBe(0);
  });

  it('is idempotent when re-run after archive and handles empty collection (edge)', async () => {
    const emptyRun = await runArchiveAuditLogs();
    expect(emptyRun.archived).toBe(0);

    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - (AUDIT_RETENTION_DAYS + 1));
    const id = await seedAuditLog({ createdAt: oldDate, action: `edge_${uniqueSuffix()}` });

    const first = await runArchiveAuditLogs();
    expect(first.archived).toBe(1);
    expect(await AuditLogArchive.findById(id)).toBeTruthy();

    const second = await runArchiveAuditLogs();
    expect(second.archived).toBe(0);
    expect(await AuditLogArchive.countDocuments({ _id: id })).toBe(1);
  });
});
