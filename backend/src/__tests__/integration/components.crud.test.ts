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
  uniqueSuffix,
} from '../helpers/factories';

describe('Component CRUD lifecycle', () => {
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

  it('creates, lists, reads, updates, and deletes a component (happy)', async () => {
    const name = `API Gateway ${uniqueSuffix()}`;
    const created = await createComponent(app, token, projectId, name);

    const list = await request(app)
      .get(`/api/projects/${projectId}/components`)
      .set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.some((c: { _id: string }) => c._id === created.id)).toBe(true);

    const one = await request(app)
      .get(`/api/projects/${projectId}/components/${created.id}`)
      .set(authHeader(token));
    expect(one.status).toBe(200);
    expect(one.body.slug).toBe(created.slug);

    const patched = await request(app)
      .patch(`/api/projects/${projectId}/components/${created.id}`)
      .set(authHeader(token))
      .send({ name: 'Renamed Component', description: 'Updated' });
    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe('Renamed Component');
    expect(patched.body.description).toBe('Updated');

    const deleted = await request(app)
      .delete(`/api/projects/${projectId}/components/${created.id}`)
      .set(authHeader(token));
    expect(deleted.status).toBe(200);

    const gone = await request(app)
      .get(`/api/projects/${projectId}/components/${created.id}`)
      .set(authHeader(token));
    expect(gone.status).toBe(404);
  });

  it('rejects duplicate names and reserved slugs (unhappy)', async () => {
    await createComponent(app, token, projectId, 'Website');

    const dup = await request(app)
      .post(`/api/projects/${projectId}/components`)
      .set(authHeader(token))
      .send({ name: 'Website' });
    expect(dup.status).toBe(400);

    const reserved = await request(app)
      .post(`/api/projects/${projectId}/components`)
      .set(authHeader(token))
      .send({ name: 'new' });
    expect(reserved.status).toBe(400);
  });

  it('rejects empty name and unknown ids (edge)', async () => {
    const empty = await request(app)
      .post(`/api/projects/${projectId}/components`)
      .set(authHeader(token))
      .send({ name: '' });
    expect(empty.status).toBe(400);

    const fakeId = '507f1f77bcf86cd799439011';
    const missing = await request(app)
      .get(`/api/projects/${projectId}/components/${fakeId}`)
      .set(authHeader(token));
    expect(missing.status).toBe(404);
  });
});
