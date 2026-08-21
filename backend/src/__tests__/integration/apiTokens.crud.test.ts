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

describe('API token CRUD lifecycle', () => {
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

  const base = () => `/api/projects/${projectId}/tokens`;

  it('creates, lists, updates, and revokes an API token (happy)', async () => {
    const created = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: `CI ${uniqueSuffix()}`, scopes: ['read', 'write'], expiresIn: 30 });
    expect(created.status).toBe(201);
    expect(created.body.token).toBeTruthy();
    expect(created.body.tokenHash).toBeUndefined();

    const list = await request(app).get(base()).set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.some((t: { _id: string }) => t._id === created.body._id)).toBe(true);
    expect(list.body[0].token).toBeUndefined();

    const patched = await request(app)
      .patch(`${base()}/${created.body._id}`)
      .set(authHeader(token))
      .send({ name: 'CI Renamed' });
    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe('CI Renamed');

    const deleted = await request(app)
      .delete(`${base()}/${created.body._id}`)
      .set(authHeader(token));
    expect(deleted.status).toBe(200);
  });

  it('rejects empty name and invalid scopes (unhappy)', async () => {
    const empty = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: '  ', scopes: ['read'] });
    expect(empty.status).toBe(400);

    const scopes = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: 'Bad', scopes: ['admin'] });
    expect(scopes.status).toBe(400);
  });

  it('rejects invalid expiresIn (edge)', async () => {
    const res = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: 'Long', scopes: ['read'], expiresIn: 9999 });
    expect(res.status).toBe(400);
  });

  it('allows public API access with the issued token (happy)', async () => {
    const created = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: 'Pull', scopes: ['read'] })
      .expect(201);

    // Create a component + file so the public pull endpoint can succeed
    const component = await request(app)
      .post(`/api/projects/${projectId}/components`)
      .set(authHeader(token))
      .send({ name: 'Public Comp' })
      .expect(201);

    await request(app)
      .post(`/api/projects/${projectId}/components/${component.body._id}/secret-files`)
      .set(authHeader(token))
      .field('environment', 'dev')
      .field('fileName', '.env')
      .field('content', 'PUBLIC=1\n')
      .expect(201);

    const pulled = await request(app)
      .get(`/api/v1/projects/${projectId}/components/${component.body._id}/secret-files`)
      .query({ environment: 'dev', file: '.env' })
      .set({ Authorization: `Bearer ${created.body.token}` });
    expect(pulled.status).toBe(200);
    expect(pulled.text).toContain('PUBLIC=1');
  });
});
