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

describe('Secret CRUD lifecycle', () => {
  let app: Application;
  let token: string;
  let projectId: string;
  let componentId: string;

  beforeAll(async () => {
    app = await getTestApp();
  });

  beforeEach(async () => {
    await resetDatabase();
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id);
    const component = await createComponent(app, user.accessToken, project.id, `Svc ${uniqueSuffix()}`);
    token = user.accessToken;
    projectId = project.id;
    componentId = component.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  const base = () => `/api/projects/${projectId}/components/${componentId}/secrets`;

  it('creates, lists, reads content, updates, and deletes a secret (happy)', async () => {
    const created = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: 'API_KEY', content: 'super-secret-value' });
    expect(created.status).toBe(201);
    expect(created.body.name).toBe('API_KEY');
    expect(created.body.encryptedData).toBeUndefined();

    const list = await request(app).get(base()).set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);

    const content = await request(app)
      .get(`${base()}/${created.body._id}/content`)
      .set(authHeader(token));
    expect(content.status).toBe(200);
    expect(content.body.content).toBe('super-secret-value');

    const updated = await request(app)
      .put(`${base()}/${created.body._id}`)
      .set(authHeader(token))
      .send({ content: 'rotated-value' });
    expect(updated.status).toBe(200);

    const after = await request(app)
      .get(`${base()}/${created.body._id}/content`)
      .set(authHeader(token));
    expect(after.body.content).toBe('rotated-value');

    const deleted = await request(app)
      .delete(`${base()}/${created.body._id}`)
      .set(authHeader(token));
    expect(deleted.status).toBe(200);

    const gone = await request(app)
      .get(`${base()}/${created.body._id}/content`)
      .set(authHeader(token));
    expect(gone.status).toBe(404);
  });

  it('rejects duplicate names and invalid characters (unhappy)', async () => {
    await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: 'TOKEN', content: 'a' })
      .expect(201);

    const dup = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: 'TOKEN', content: 'b' });
    expect(dup.status).toBe(400);

    const badName = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: 'bad/name!', content: 'x' });
    expect(badName.status).toBe(400);
  });

  it('rejects oversized content (edge)', async () => {
    const huge = 'x'.repeat(51 * 1024);
    const res = await request(app)
      .post(base())
      .set(authHeader(token))
      .send({ name: 'HUGE', content: huge });
    expect(res.status).toBe(400);
  });
});
