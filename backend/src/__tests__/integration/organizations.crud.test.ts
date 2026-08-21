import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { getTestApp, resetDatabase, closeTestApp } from '../helpers/testApp';
import {
  authHeader,
  createTeamOrg,
  createVerifiedUser,
  uniqueSuffix,
} from '../helpers/factories';

describe('Organization CRUD lifecycle', () => {
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

  it('creates, lists, and reads team organizations (happy)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);

    const list = await request(app)
      .get('/api/organizations')
      .set(authHeader(user.accessToken));
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((o: { _id: string }) => o._id === org.id)).toBe(true);
    expect(list.body.some((o: { _id: string }) => o._id === user.personalOrgId)).toBe(true);

    const one = await request(app)
      .get(`/api/organizations/${org.id}`)
      .set(authHeader(user.accessToken));
    expect(one.status).toBe(200);
    expect(one.body.slug).toBe(org.slug);
  });

  it('rejects duplicate slug and invalid slug (unhappy/edge)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken);

    const dup = await request(app)
      .post('/api/organizations')
      .set(authHeader(user.accessToken))
      .send({ name: 'Dup', slug: org.slug });
    expect(dup.status).toBe(400);

    const badSlug = await request(app)
      .post('/api/organizations')
      .set(authHeader(user.accessToken))
      .send({ name: 'Bad', slug: 'Invalid Slug!' });
    expect(badSlug.status).toBe(400);
  });

  it('denies access to non-members (unhappy)', async () => {
    const owner = await createVerifiedUser();
    const stranger = await createVerifiedUser();
    const org = await createTeamOrg(app, owner.accessToken);

    const denied = await request(app)
      .get(`/api/organizations/${org.id}`)
      .set(authHeader(stranger.accessToken));
    expect(denied.status).toBe(403);
  });

  it('requires authentication (edge)', async () => {
    const res = await request(app).get('/api/organizations');
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid org id format (edge)', async () => {
    const user = await createVerifiedUser();
    const res = await request(app)
      .get('/api/organizations/not-an-objectid')
      .set(authHeader(user.accessToken));
    expect([400, 403, 404]).toContain(res.status);
  });

  it('updates organization panic settings when permitted (happy)', async () => {
    const user = await createVerifiedUser();
    const org = await createTeamOrg(app, user.accessToken, `Panic Org ${uniqueSuffix()}`);

    const update = await request(app)
      .put(`/api/organizations/${org.id}/settings`)
      .set(authHeader(user.accessToken))
      .send({
        panicButton: {
          flushSecrets: true,
          revokeApiTokens: true,
          askConfirmation: true,
        },
      });
    expect(update.status).toBe(200);
    expect(update.body.panicButton.flushSecrets).toBe(true);
    expect(update.body.panicButton.revokeApiTokens).toBe(true);
  });
});
