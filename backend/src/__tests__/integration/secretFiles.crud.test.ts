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

describe('Secret file CRUD lifecycle', () => {
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
    const component = await createComponent(app, user.accessToken, project.id, `Web ${uniqueSuffix()}`);
    token = user.accessToken;
    projectId = project.id;
    componentId = component.id;
  });

  afterAll(async () => {
    await closeTestApp();
  });

  const base = () => `/api/projects/${projectId}/components/${componentId}/secret-files`;

  it('uploads, lists, reads, updates, and deletes secret files (happy)', async () => {
    const created = await request(app)
      .post(base())
      .set(authHeader(token))
      .field('environment', 'dev')
      .field('fileName', '.env')
      .field('content', 'FOO=bar\nBAZ=qux\n');
    expect(created.status).toBe(201);
    expect(created.body.version).toBe(1);
    expect(created.body.fileName).toBe('.env');

    const list = await request(app)
      .get(`${base()}/versions`)
      .query({ environment: 'dev' })
      .set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body.length).toBeGreaterThanOrEqual(1);

    const content = await request(app)
      .get(`${base()}/${created.body._id}/content`)
      .set(authHeader(token));
    expect(content.status).toBe(200);
    expect(content.body.content).toContain('FOO=bar');

    const v2 = await request(app)
      .post(base())
      .set(authHeader(token))
      .field('environment', 'dev')
      .field('fileName', '.env')
      .field('content', 'FOO=updated\n');
    expect(v2.status).toBe(201);
    expect(v2.body.version).toBe(2);

    const deleted = await request(app)
      .delete(`${base()}/${v2.body._id}`)
      .set(authHeader(token));
    expect(deleted.status).toBe(200);
  });

  it('rejects unknown environment and disallowed file names (unhappy)', async () => {
    const badEnv = await request(app)
      .post(base())
      .set(authHeader(token))
      .field('environment', 'production')
      .field('fileName', '.env')
      .field('content', 'A=1\n');
    expect(badEnv.status).toBe(400);

    const badName = await request(app)
      .post(base())
      .set(authHeader(token))
      .field('environment', 'dev')
      .field('fileName', 'malware.exe')
      .field('content', 'x');
    expect(badName.status).toBe(400);
  });

  it('requires content or file body (edge)', async () => {
    const res = await request(app)
      .post(base())
      .set(authHeader(token))
      .field('environment', 'dev')
      .field('fileName', '.env');
    expect(res.status).toBe(400);
  });

  it('blocks delete of environment with versions unless force=true (edge)', async () => {
    await request(app)
      .post(base())
      .set(authHeader(token))
      .field('environment', 'dev')
      .field('fileName', '.env')
      .field('content', 'A=1\n')
      .expect(201);

    const blocked = await request(app)
      .delete(`/api/projects/${projectId}/environments/dev`)
      .set(authHeader(token));
    expect(blocked.status).toBe(400);
    expect(blocked.body.versionCount).toBeGreaterThan(0);

    const forced = await request(app)
      .delete(`/api/projects/${projectId}/environments/dev`)
      .query({ force: 'true' })
      .set(authHeader(token));
    expect(forced.status).toBe(200);
  });

  it('caps retained versions at 20 per file key', async () => {
    for (let i = 1; i <= 21; i++) {
      const res = await request(app)
        .post(base())
        .set(authHeader(token))
        .field('environment', 'dev')
        .field('fileName', '.env')
        .field('content', `FOO=v${i}\n`);
      expect(res.status).toBe(201);
      expect(res.body.version).toBe(i);
    }

    const list = await request(app)
      .get(`${base()}/versions`)
      .query({ environment: 'dev', file: '.env' })
      .set(authHeader(token));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(20);
    const versions = list.body.map((v: { version: number }) => v.version).sort((a: number, b: number) => a - b);
    expect(versions[0]).toBe(2);
    expect(versions[versions.length - 1]).toBe(21);
  });
});
