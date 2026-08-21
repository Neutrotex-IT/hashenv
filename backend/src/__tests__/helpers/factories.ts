import request from 'supertest';
import type { Application } from 'express';
import User from '../../models/User';
import { hashPassword, generateAccessToken } from '../../lib/auth';
import Organization from '../../models/Organization';
import OrgMember from '../../models/OrgMember';
import { createOrgEncryptionKey } from '../../crypto';

export const TEST_PASSWORD = 'TestPass1!';

export interface TestUserContext {
  userId: string;
  email: string;
  username: string;
  name: string;
  accessToken: string;
  personalOrgId: string;
}

let userCounter = 0;

export function uniqueSuffix(): string {
  userCounter += 1;
  return `${Date.now()}${userCounter}${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Create a verified user with personal org + encryption key, return access token.
 * Bypasses email verification (same end state as register + verify).
 */
export async function createVerifiedUser(
  overrides: Partial<{ name: string; email: string; username: string; password: string }> = {}
): Promise<TestUserContext> {
  const suffix = uniqueSuffix();
  const name = overrides.name || `User ${suffix}`;
  const email = (overrides.email || `user_${suffix}@test.local`).toLowerCase();
  const username = (overrides.username || `user_${suffix}`).toLowerCase();
  const password = overrides.password || TEST_PASSWORD;

  const hashedPassword = await hashPassword(password);
  const user = await User.create({
    name,
    username,
    email,
    password: hashedPassword,
    emailVerified: true,
  });

  const personalOrg = await Organization.create({
    name: `${name}'s Workspace`,
    slug: `personal-${user._id.toString()}`,
    type: 'personal',
    createdBy: user._id,
  });

  await OrgMember.create({
    organizationId: personalOrg._id,
    userId: user._id,
    role: 'owner',
  });

  await createOrgEncryptionKey(personalOrg._id.toString());

  const accessToken = generateAccessToken(user._id.toString(), user.email);

  return {
    userId: user._id.toString(),
    email: user.email,
    username: user.username,
    name: user.name,
    accessToken,
    personalOrgId: personalOrg._id.toString(),
  };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export async function createTeamOrg(
  app: Application,
  token: string,
  name?: string,
  slug?: string
): Promise<{ id: string; name: string; slug: string }> {
  const suffix = uniqueSuffix();
  const res = await request(app)
    .post('/api/organizations')
    .set(authHeader(token))
    .send({
      name: name || `Team ${suffix}`,
      slug: slug || `team-${suffix}`.toLowerCase().replace(/[^a-z0-9-]/g, ''),
    })
    .expect(201);

  return { id: res.body._id, name: res.body.name, slug: res.body.slug };
}

export async function createProject(
  app: Application,
  token: string,
  organizationId: string,
  name?: string
): Promise<{ id: string; name: string; organizationId: string }> {
  const suffix = uniqueSuffix();
  const res = await request(app)
    .post('/api/projects')
    .set(authHeader(token))
    .send({
      name: name || `Project ${suffix}`,
      organizationId,
    })
    .expect(201);

  return {
    id: res.body._id,
    name: res.body.name,
    organizationId: res.body.organizationId?._id || res.body.organizationId,
  };
}

export async function createComponent(
  app: Application,
  token: string,
  projectId: string,
  name?: string
): Promise<{ id: string; name: string; slug: string }> {
  const suffix = uniqueSuffix();
  const res = await request(app)
    .post(`/api/projects/${projectId}/components`)
    .set(authHeader(token))
    .send({ name: name || `Component ${suffix}` })
    .expect(201);

  return { id: res.body._id, name: res.body.name, slug: res.body.slug };
}
