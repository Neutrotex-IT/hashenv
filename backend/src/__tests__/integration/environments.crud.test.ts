import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { getTestApp, resetDatabase, closeTestApp } from '../helpers/testApp';
import {
  authHeader,
  createProject,
  createTeamOrg,
  createVerifiedUser,
} from '../helpers/factories';

describe('Environment CRUD lifecycle', () => {
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

  it('lists defaults, adds, renames, and deletes environments (happy)', async () => {
    const list = await request(app)
      .get(`/api/projects/${projectId}/environments`)
      .set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.map((e: { slug: string }) => e.slug)).toEqual(
      expect.arrayContaining(['dev', 'staging', 'prod'])
    );

    const created = await request(app)
      .post(`/api/projects/${projectId}/environments`)
      .set(authHeader(token))
      .send({ name: 'qa' });
    expect(created.status).toBe(201);
    expect(created.body.slug).toBe('qa');

    const renamed = await request(app)
      .patch(`/api/projects/${projectId}/environments/qa`)
      .set(authHeader(token))
      .send({ name: 'preview' });
    expect(renamed.status).toBe(200);
    expect(renamed.body.slug).toBe('preview');

    const deleted = await request(app)
      .delete(`/api/projects/${projectId}/environments/preview`)
      .set(authHeader(token));
    expect(deleted.status).toBe(200);
  });

  it('rejects reserved and duplicate slugs (unhappy)', async () => {
    const reserved = await request(app)
      .post(`/api/projects/${projectId}/environments`)
      .set(authHeader(token))
      .send({ name: 'all' });
    expect(reserved.status).toBe(400);

    const dup = await request(app)
      .post(`/api/projects/${projectId}/environments`)
      .set(authHeader(token))
      .send({ name: 'dev' });
    expect(dup.status).toBe(400);
  });

  it('cannot delete the last environment (edge)', async () => {
    // Remove until one remains
    for (const slug of ['staging', 'prod']) {
      await request(app)
        .delete(`/api/projects/${projectId}/environments/${slug}`)
        .set(authHeader(token))
        .expect(200);
    }

    const last = await request(app)
      .delete(`/api/projects/${projectId}/environments/dev`)
      .set(authHeader(token));
    expect(last.status).toBe(400);
    expect(last.body.error).toMatch(/last environment/i);
  });

  it('returns 404 for unknown environment delete (unhappy)', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/environments/nope`)
      .set(authHeader(token));
    expect(res.status).toBe(404);
  });
});
