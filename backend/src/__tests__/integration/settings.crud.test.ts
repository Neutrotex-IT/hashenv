import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { getTestApp, resetDatabase, closeTestApp } from '../helpers/testApp';
import { authHeader, createVerifiedUser } from '../helpers/factories';
import UserSettings from '../../models/UserSettings';

describe('User settings CRUD lifecycle (flushDuration / Q2)', () => {
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

  it('reads defaults, updates flushDuration, and disables it (happy)', async () => {
    const user = await createVerifiedUser();

    const initial = await request(app)
      .get('/api/settings')
      .set(authHeader(user.accessToken));
    expect(initial.status).toBe(200);
    expect(initial.body.flushDuration).toBeNull();

    const updated = await request(app)
      .put('/api/settings')
      .set(authHeader(user.accessToken))
      .send({ flushDuration: 12 });
    expect(updated.status).toBe(200);
    expect(updated.body.flushDuration).toBe(12);

    const persisted = await UserSettings.findOne({ userId: user.userId });
    expect(persisted?.flushDuration).toBe(12);

    const disabled = await request(app)
      .put('/api/settings')
      .set(authHeader(user.accessToken))
      .send({ flushDuration: null });
    expect(disabled.status).toBe(200);
    expect(disabled.body.flushDuration).toBeNull();
  });

  it('rejects unauthenticated access and out-of-range duration (unhappy)', async () => {
    const unauth = await request(app).get('/api/settings');
    expect(unauth.status).toBe(401);

    const user = await createVerifiedUser();
    const tooLow = await request(app)
      .put('/api/settings')
      .set(authHeader(user.accessToken))
      .send({ flushDuration: 0 });
    expect(tooLow.status).toBe(400);

    const tooHigh = await request(app)
      .put('/api/settings')
      .set(authHeader(user.accessToken))
      .send({ flushDuration: 1001 });
    expect(tooHigh.status).toBe(400);
  });

  it('accepts boundary values 1 and 1000 (edge)', async () => {
    const user = await createVerifiedUser();

    const min = await request(app)
      .put('/api/settings')
      .set(authHeader(user.accessToken))
      .send({ flushDuration: 1 });
    expect(min.status).toBe(200);
    expect(min.body.flushDuration).toBe(1);

    const max = await request(app)
      .put('/api/settings')
      .set(authHeader(user.accessToken))
      .send({ flushDuration: 1000 });
    expect(max.status).toBe(200);
    expect(max.body.flushDuration).toBe(1000);
  });
});
