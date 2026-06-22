import type { IProject } from '../models/Project';

export const DEFAULT_ENVIRONMENTS = ['dev', 'staging', 'prod'] as const;
export const MAX_ENVIRONMENTS_PER_PROJECT = 20;
export const RESERVED_ENV_SLUGS = new Set(['all', 'default', 'latest']);

const ENV_SLUG_PATTERN = /^[a-z][a-z0-9-]{1,31}$/;

export function normalizeEnvSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEnvSlug(slug: string): boolean {
  const normalized = normalizeEnvSlug(slug);
  if (!ENV_SLUG_PATTERN.test(normalized)) {
    return false;
  }
  if (RESERVED_ENV_SLUGS.has(normalized)) {
    return false;
  }
  return true;
}

export function getProjectEnvironments(project: Pick<IProject, 'environments'>): string[] {
  if (project.environments && project.environments.length > 0) {
    return [...project.environments];
  }
  return [...DEFAULT_ENVIRONMENTS];
}

export function assertEnvAllowed(project: Pick<IProject, 'environments'>, slug: string): string {
  const normalized = normalizeEnvSlug(slug);
  if (!isValidEnvSlug(normalized)) {
    throw new Error(
      'Environment must be 2-32 lowercase characters, start with a letter, and use only letters, numbers, and hyphens'
    );
  }
  const allowed = getProjectEnvironments(project);
  if (!allowed.includes(normalized)) {
    throw new Error(`Environment "${normalized}" is not configured for this project`);
  }
  return normalized;
}
