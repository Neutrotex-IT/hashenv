import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearLastEnvironment,
  getLastEnvironment,
  setLastEnvironment,
} from './lastEnvironment';

describe('lastEnvironment', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when no environment is stored', () => {
    expect(getLastEnvironment('proj-1', 'comp-1')).toBeNull();
  });

  it('stores and retrieves the last environment per project/component scope', () => {
    setLastEnvironment('proj-1', 'comp-1', 'staging');
    setLastEnvironment('proj-1', 'comp-2', 'prod');
    setLastEnvironment('proj-2', 'comp-1', 'dev');

    expect(getLastEnvironment('proj-1', 'comp-1')).toBe('staging');
    expect(getLastEnvironment('proj-1', 'comp-2')).toBe('prod');
    expect(getLastEnvironment('proj-2', 'comp-1')).toBe('dev');
  });

  it('overwrites the stored environment for the same scope', () => {
    setLastEnvironment('proj-1', 'comp-1', 'dev');
    setLastEnvironment('proj-1', 'comp-1', 'qa');

    expect(getLastEnvironment('proj-1', 'comp-1')).toBe('qa');
  });

  it('clears the stored environment for a scope', () => {
    setLastEnvironment('proj-1', 'comp-1', 'staging');
    setLastEnvironment('proj-1', 'comp-2', 'prod');

    clearLastEnvironment('proj-1', 'comp-1');

    expect(getLastEnvironment('proj-1', 'comp-1')).toBeNull();
    expect(getLastEnvironment('proj-1', 'comp-2')).toBe('prod');
  });

  it('returns null when localStorage contains invalid JSON', () => {
    localStorage.setItem('hashenv_last_env', '{not-json');
    expect(getLastEnvironment('proj-1', 'comp-1')).toBeNull();
  });
});
