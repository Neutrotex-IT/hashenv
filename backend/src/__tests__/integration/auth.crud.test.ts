import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { getTestApp, resetDatabase, closeTestApp } from '../helpers/testApp';
import {
  TEST_PASSWORD,
  authHeader,
  createVerifiedUser,
  uniqueSuffix,
} from '../helpers/factories';
import User from '../../models/User';

describe('Auth CRUD lifecycle', () => {
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

  it('registers, verifies, logs in, refreshes, and logs out (happy path)', async () => {
    const suffix = uniqueSuffix();
    const email = `reg_${suffix}@test.local`;
    const username = `reg_${suffix}`;

    const register = await request(app).post('/api/auth/register').send({
      name: 'Register User',
      username,
      email,
      password: TEST_PASSWORD,
    });
    expect(register.status).toBe(201);
    expect(register.body.message).toMatch(/verify/i);

    const user = await User.findOne({ email }).select('+emailVerificationToken');
    expect(user).toBeTruthy();
    expect(user!.emailVerified).toBe(false);

    const verify = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: user!.emailVerificationToken });
    expect(verify.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send({
      email,
      password: TEST_PASSWORD,
    });
    expect(login.status).toBe(200);
    expect(login.body.accessToken).toBeTruthy();
    expect(login.headers['set-cookie']).toBeTruthy();

    const me = await request(app)
      .get('/api/auth/me')
      .set(authHeader(login.body.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(email);

    const cookies = login.headers['set-cookie'];
    const refresh = await request(app)
      .post('/api/auth/refresh')
      .set('Cookie', cookies);
    expect(refresh.status).toBe(200);
    expect(refresh.body.accessToken).toBeTruthy();

    const logout = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);
    expect(logout.status).toBe(200);
  });

  it('rejects duplicate email and username (unhappy)', async () => {
    const user = await createVerifiedUser();

    const dupEmail = await request(app).post('/api/auth/register').send({
      name: 'Other',
      username: `other_${uniqueSuffix()}`,
      email: user.email,
      password: TEST_PASSWORD,
    });
    expect(dupEmail.status).toBe(400);

    const dupUser = await request(app).post('/api/auth/register').send({
      name: 'Other',
      username: user.username,
      email: `other_${uniqueSuffix()}@test.local`,
      password: TEST_PASSWORD,
    });
    expect(dupUser.status).toBe(400);
  });

  it('rejects weak passwords and invalid emails (edge)', async () => {
    const weak = await request(app).post('/api/auth/register').send({
      name: 'Weak',
      username: `weak_${uniqueSuffix()}`,
      email: `weak_${uniqueSuffix()}@test.local`,
      password: 'short',
    });
    expect(weak.status).toBe(400);

    const badEmail = await request(app).post('/api/auth/register').send({
      name: 'Bad',
      username: `bad_${uniqueSuffix()}`,
      email: 'not-an-email',
      password: TEST_PASSWORD,
    });
    expect(badEmail.status).toBe(400);
  });

  it('blocks login when email is not verified (unhappy)', async () => {
    const suffix = uniqueSuffix();
    await request(app).post('/api/auth/register').send({
      name: 'Unverified',
      username: `uv_${suffix}`,
      email: `uv_${suffix}@test.local`,
      password: TEST_PASSWORD,
    });

    const login = await request(app).post('/api/auth/login').send({
      email: `uv_${suffix}@test.local`,
      password: TEST_PASSWORD,
    });
    expect(login.status).toBe(403);
    expect(login.body.emailVerified).toBe(false);
  });

  it('rejects wrong password and missing token (unhappy)', async () => {
    const user = await createVerifiedUser();

    const badLogin = await request(app).post('/api/auth/login').send({
      email: user.email,
      password: 'WrongPass1!',
    });
    expect(badLogin.status).toBe(401);

    const me = await request(app).get('/api/auth/me');
    expect(me.status).toBe(401);
  });

  it('rejects invalid verification tokens (edge)', async () => {
    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: 'deadbeef'.repeat(8) });
    expect(res.status).toBe(400);
  });
});
