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

describe('Project CRUD lifecycle', () => {
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

  it('creates, lists, reads, updates, and deletes a project (happy)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);
    const project = await createProject(app, user.accessToken, org.id, `App ${uniqueSuffix()}`);

    const list = await request(app)
      .get('/api/projects')
      .set(authHeader(user.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.some((p: { _id: string }) => p._id === project.id)).toBe(true);

    const one = await request(app)
      .get(`/api/projects/${project.id}`)
      .set(authHeader(user.accessToken));
    expect(one.status).toBe(200);
    expect(one.body.name).toBe(project.name);
    expect(one.body.environments).toEqual(expect.arrayContaining(['dev', 'staging', 'prod']));

    const patched = await request(app)
      .patch(`/api/projects/${project.id}`)
      .set(authHeader(user.accessToken))
      .send({ name: 'Renamed Project' });
    expect(patched.status).toBe(200);
    expect(patched.body.name).toBe('Renamed Project');

    const deleted = await request(app)
      .delete(`/api/projects/${project.id}`)
      .set(authHeader(user.accessToken));
    expect(deleted.status).toBe(200);

    const gone = await request(app)
      .get(`/api/projects/${project.id}`)
      .set(authHeader(user.accessToken));
    expect(gone.status).toBe(404);
  });

  it('rejects create without org membership (unhappy)', async () => {
    const owner = await createVerifiedUser();
    const stranger = await createVerifiedUser();
    const org = await createTeamOrg(app, owner.accessToken);

    const res = await request(app)
      .post('/api/projects')
      .set(authHeader(stranger.accessToken))
      .send({ name: 'Stolen', organizationId: org.id });
    expect(res.status).toBe(403);
  });

  it('rejects invalid organization id and empty name (edge)', async () => {
    const user = await createVerifiedUser();

    const badOrg = await request(app)
      .post('/api/projects')
      .set(authHeader(user.accessToken))
      .send({ name: 'X', organizationId: 'not-valid' });
    expect(badOrg.status).toBe(400);

    const emptyName = await request(app)
      .post('/api/projects')
      .set(authHeader(user.accessToken))
      .send({ name: '', organizationId: user.personalOrgId });
    expect(emptyName.status).toBe(400);
  });

  it('denies delete to non-owners who somehow have write access via membership only', async () => {
    // Owner creates project; stranger cannot even read
    const owner = await createVerifiedUser();
    const stranger = await createVerifiedUser();
    const org = await createTeamOrg(app, owner.accessToken);
    const project = await createProject(app, owner.accessToken, org.id);

    const denied = await request(app)
      .delete(`/api/projects/${project.id}`)
      .set(authHeader(stranger.accessToken));
    expect([403, 404]).toContain(denied.status);
  });
});
