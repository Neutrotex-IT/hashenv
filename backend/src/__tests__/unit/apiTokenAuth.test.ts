import { describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';
import {
  requireApiScope,
  requireApiTokenProject,
  type ApiTokenRequest,
} from '../../lib/apiTokenAuth';

function mockResponse() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as Response & { statusCode: number; body: unknown };
}

describe('requireApiScope', () => {
  it('rejects requests without an authenticated API token', () => {
    const req = {} as ApiTokenRequest;
    const res = mockResponse();
    const next = vi.fn();

    requireApiScope('read')(req, res, next);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'API token required' });
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects requests missing required scopes', () => {
    const req = {
      apiToken: {
        tokenId: 'token-1',
        projectId: 'project-1',
        scopes: ['read'],
        createdBy: 'user-1',
      },
    } as ApiTokenRequest;
    const res = mockResponse();
    const next = vi.fn();

    requireApiScope('write')(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({
      error: 'Insufficient permissions',
      required: ['write'],
      granted: ['read'],
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows requests that include all required scopes', () => {
    const req = {
      apiToken: {
        tokenId: 'token-1',
        projectId: 'project-1',
        scopes: ['read', 'write'],
        createdBy: 'user-1',
      },
    } as ApiTokenRequest;
    const res = mockResponse();
    const next = vi.fn();

    requireApiScope('read', 'write')(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });
});

describe('requireApiTokenProject', () => {
  it('rejects when token project does not match route project', () => {
    const req = {
      params: { projectId: 'project-b' },
      apiToken: {
        tokenId: 'token-1',
        projectId: 'project-a',
        scopes: ['read'],
        createdBy: 'user-1',
      },
    } as unknown as ApiTokenRequest;
    const res = mockResponse();
    const next = vi.fn();

    requireApiTokenProject(req, res, next);

    expect(res.statusCode).toBe(403);
    expect(res.body).toEqual({ error: 'Token not authorized for this project' });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows when token project matches route project', () => {
    const req = {
      params: { projectId: 'project-a' },
      apiToken: {
        tokenId: 'token-1',
        projectId: 'project-a',
        scopes: ['read'],
        createdBy: 'user-1',
      },
    } as unknown as ApiTokenRequest;
    const res = mockResponse();
    const next = vi.fn();

    requireApiTokenProject(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
