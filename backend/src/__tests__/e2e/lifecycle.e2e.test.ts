import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Application } from 'express';
import { getTestApp, resetDatabase, closeTestApp } from '../helpers/testApp';
import {
  TEST_PASSWORD,
  authHeader,
  uniqueSuffix,
} from '../helpers/factories';
import User from '../../models/User';

/**
 * End-to-end API flow: register → verify → org → project → env → component →
 * secret file + secret + account + API token → cleanup delete cascade.
 */
describe('E2E full product lifecycle', () => {
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

  it('runs a complete CRUD lifecycle across nested resources', async () => {
    const suffix = uniqueSuffix();
    const email = `e2e_${suffix}@test.local`;
    const username = `e2e_${suffix}`;

    // Auth
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'E2E User',
        username,
        email,
        password: TEST_PASSWORD,
      })
      .expect(201);

    const dbUser = await User.findOne({ email }).select('+emailVerificationToken');
    await request(app)
      .get('/api/auth/verify-email')
      .query({ token: dbUser!.emailVerificationToken })
      .expect(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email, password: TEST_PASSWORD })
      .expect(200);
    const token = login.body.accessToken as string;

    // Organization
    const org = await request(app)
      .post('/api/organizations')
      .set(authHeader(token))
      .send({ name: `E2E Org ${suffix}`, slug: `e2e-org-${suffix}` })
      .expect(201);

    // Project
    const project = await request(app)
      .post('/api/projects')
      .set(authHeader(token))
      .send({ name: `E2E Project ${suffix}`, organizationId: org.body._id })
      .expect(201);
    const projectId = project.body._id as string;

    // Environment
    await request(app)
      .post(`/api/projects/${projectId}/environments`)
      .set(authHeader(token))
      .send({ name: 'qa' })
      .expect(201);

    // Component
    const component = await request(app)
      .post(`/api/projects/${projectId}/components`)
      .set(authHeader(token))
      .send({ name: 'Backend API', description: 'Main API' })
      .expect(201);
    const componentId = component.body._id as string;

    // Secret file
    const envFile = await request(app)
      .post(`/api/projects/${projectId}/components/${componentId}/secret-files`)
      .set(authHeader(token))
      .field('environment', 'qa')
      .field('fileName', '.env')
      .field('content', 'DATABASE_URL=postgres://local/db\n')
      .expect(201);
    expect(envFile.body.version).toBe(1);

    // Secret
    const secret = await request(app)
      .post(`/api/projects/${projectId}/components/${componentId}/secrets`)
      .set(authHeader(token))
      .send({ name: 'JWT_SECRET', content: 'e2e-jwt-value' })
      .expect(201);

    const secretRead = await request(app)
      .get(`/api/projects/${projectId}/components/${componentId}/secrets/${secret.body._id}/content`)
      .set(authHeader(token))
      .expect(200);
    expect(secretRead.body.content).toBe('e2e-jwt-value');

    // Associated account
    const account = await request(app)
      .post(`/api/projects/${projectId}/accounts`)
      .set(authHeader(token))
      .send({
        label: 'GitHub Deploy',
        provider: 'github',
        email: 'deploy@example.com',
        password: 'gh-token-value',
      })
      .expect(201);

    // API token + public API
    const apiToken = await request(app)
      .post(`/api/projects/${projectId}/tokens`)
      .set(authHeader(token))
      .send({ name: 'e2e-ci', scopes: ['read', 'write'] })
      .expect(201);

    const publicPull = await request(app)
      .get(`/api/v1/projects/${projectId}/components/${componentId}/secret-files`)
      .query({ environment: 'qa', file: '.env' })
      .set({ Authorization: `Bearer ${apiToken.body.token}` })
      .expect(200);
    expect(publicPull.text).toContain('DATABASE_URL=');

    // Updates
    await request(app)
      .patch(`/api/projects/${projectId}`)
      .set(authHeader(token))
      .send({ name: `E2E Project ${suffix} Updated` })
      .expect(200);

    await request(app)
      .put(`/api/projects/${projectId}/components/${componentId}/secrets/${secret.body._id}`)
      .set(authHeader(token))
      .send({ content: 'rotated-jwt' })
      .expect(200);

    // Deletes (leaf → root)
    await request(app)
      .delete(`/api/projects/${projectId}/tokens/${apiToken.body._id}`)
      .set(authHeader(token))
      .expect(200);

    await request(app)
      .delete(`/api/projects/${projectId}/accounts/${account.body._id}`)
      .set(authHeader(token))
      .expect(200);

    await request(app)
      .delete(`/api/projects/${projectId}/components/${componentId}/secrets/${secret.body._id}`)
      .set(authHeader(token))
      .expect(200);

    await request(app)
      .delete(`/api/projects/${projectId}/components/${componentId}/secret-files/${envFile.body._id}`)
      .set(authHeader(token))
      .expect(200);

    await request(app)
      .delete(`/api/projects/${projectId}/components/${componentId}`)
      .set(authHeader(token))
      .expect(200);

    await request(app)
      .delete(`/api/projects/${projectId}/environments/qa`)
      .set(authHeader(token))
      .expect(200);

    await request(app)
      .delete(`/api/projects/${projectId}`)
      .set(authHeader(token))
      .expect(200);

    await request(app)
      .get(`/api/projects/${projectId}`)
      .set(authHeader(token))
      .expect(404);
  });

  it('isolates tenants: stranger cannot read another org project (unhappy e2e)', async () => {
    const suffix = uniqueSuffix();

    const ownerReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Owner',
        username: `owner_${suffix}`,
        email: `owner_${suffix}@test.local`,
        password: TEST_PASSWORD,
      })
      .expect(201);
    void ownerReg;

    const ownerDb = await User.findOne({ email: `owner_${suffix}@test.local` }).select(
      '+emailVerificationToken'
    );
    await request(app)
      .get('/api/auth/verify-email')
      .query({ token: ownerDb!.emailVerificationToken })
      .expect(200);
    const ownerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: `owner_${suffix}@test.local`, password: TEST_PASSWORD })
      .expect(200);

    const strangerReg = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Stranger',
        username: `stranger_${suffix}`,
        email: `stranger_${suffix}@test.local`,
        password: TEST_PASSWORD,
      })
      .expect(201);
    void strangerReg;

    const strangerDb = await User.findOne({ email: `stranger_${suffix}@test.local` }).select(
      '+emailVerificationToken'
    );
    await request(app)
      .get('/api/auth/verify-email')
      .query({ token: strangerDb!.emailVerificationToken })
      .expect(200);
    const strangerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: `stranger_${suffix}@test.local`, password: TEST_PASSWORD })
      .expect(200);

    const org = await request(app)
      .post('/api/organizations')
      .set(authHeader(ownerLogin.body.accessToken))
      .send({ name: `Private ${suffix}`, slug: `private-${suffix}` })
      .expect(201);

    const project = await request(app)
      .post('/api/projects')
      .set(authHeader(ownerLogin.body.accessToken))
      .send({ name: 'Secret Project', organizationId: org.body._id })
      .expect(201);

    const denied = await request(app)
      .get(`/api/projects/${project.body._id}`)
      .set(authHeader(strangerLogin.body.accessToken));
    expect([403, 404]).toContain(denied.status);
  });
});
