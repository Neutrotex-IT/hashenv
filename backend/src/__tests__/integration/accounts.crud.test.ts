import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { getTestApp, resetDatabase, closeTestApp } from '../helpers/testApp';
import {
  authHeader,
  createProject,
  createTeamOrg,
  createVerifiedUser,
  uniqueSuffix,
} from '../helpers/factories';

describe('Associated account CRUD lifecycle', () => {
  let app: Application;
  let token: string;
  let projectId: string;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id);
    token = user.accessToken;
    projectId = project.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  const base = () => `/api/projects/${projectId}/accounts`;

  it('creates, lists, reads, updates, and deletes an account (happy)', async () => {
    const label = `AWS Prod ${uniqueSuffix()}`;
    const created = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({
        label,
        provider: 'aws',
        email: 'ops@example.com',
        password: 's3cret-pass',
        notes: 'root account',
      });
    expect(created.status).toBe(201);
    expect(created.body.label).toBe(label);
    expect(created.body.encryptedData).toBeUndefined();

    const list = await request(app).get(base()).set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.some((a: { _id: string }) => a._id === created.body._id)).toBe(true);

    const one = await request(app)
      .get(`${base()}/${created.body._id}/credentials`)
      .set(authHeader(token));
    expect(one.status).toBe(200);
    expect(one.body.password).toBe('s3cret-pass');
    expect(one.body.notes).toBe('root account');

    const updated = await request(app)
      .put(`${base()}/${created.body._id}`)
      .set(authHeader(token))
      .send({
        label: `${label} rotated`,
        provider: 'aws',
        email: 'ops@example.com',
        password: 'new-pass',
      });
    expect(updated.status).toBe(200);

    const after = await request(app)
      .get(`${base()}/${created.body._id}/credentials`)
      .set(authHeader(token));
    expect(after.body.password).toBe('new-pass');

    const deleted = await request(app)
      .delete(`${base()}/${created.body._id}`)
      .set(authHeader(token));
    expect(deleted.status).toBe(200);
  });

  it('rejects invalid provider and duplicate labels (unhappy)', async () => {
    const bad = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({
        label: 'X',
        provider: 'not-a-provider',
        email: 'a@b.com',
      });
    expect(bad.status).toBe(400);

    await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ label: 'Same', provider: 'github', email: 'a@b.com', password: 'pass-one' })
      .expect(201);

    const dup = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ label: 'Same', provider: 'github', email: 'c@d.com', password: 'pass-two' });
    expect(dup.status).toBe(400);
  });

  it('returns 404 for unknown account credentials (edge)', async () => {
    const res = await request(app)
      .get(`${base()}/507f1f77bcf86cd799439011/credentials`)
      .set(authHeader(token));
    expect(res.status).toBe(404);
  });
});
