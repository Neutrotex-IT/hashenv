import { describe, expect, it } from 'vitest';
import {
  assertEnvAllowed,
  isValidEnvSlug,
  normalizeEnvSlug,
} from '../lib/environments';

describe('environment slug validation', () => {
  const project = { environments: ['dev', 'staging', 'prod', 'qa'] };

  it('accepts valid slugs', () => {
    expect(isValidEnvSlug('qa')).toBe(true);
    expect(isValidEnvSlug('preview-1')).toBe(true);
  });

  it('rejects reserved and invalid slugs', () => {
    expect(isValidEnvSlug('all')).toBe(false);
    expect(isValidEnvSlug('1bad')).toBe(false);
    expect(isValidEnvSlug('a')).toBe(false);
  });

  it('normalizes slug casing', () => {
    expect(normalizeEnvSlug(' QA ')).toBe('qa');
  });

  it('assertEnvAllowed returns normalized slug for configured env', () => {
    expect(assertEnvAllowed(project, 'QA')).toBe('qa');
  });

  it('assertEnvAllowed rejects unconfigured slug', () => {
    expect(() => assertEnvAllowed(project, 'production')).toThrow(/not configured/);
  });
});
