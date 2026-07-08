import { describe, expect, it } from 'vitest';
import {
  isValidComponentSlug,
  normalizeComponentSlug,
  slugFromComponentName,
} from '../lib/components';
import {
  buildContentDisposition,
  inferSecretFileType,
  isAllowedSecretFileName,
  sanitizeSecretFileName,
} from '../lib/secretFiles';

describe('component slug validation', () => {
  it('normalizes names into slugs', () => {
    expect(normalizeComponentSlug('Website App')).toBe('website-app');
    expect(slugFromComponentName('API')).toBe('api');
  });

  it('accepts valid slugs', () => {
    expect(isValidComponentSlug('website')).toBe(true);
    expect(isValidComponentSlug('mobile-app')).toBe(true);
  });

  it('rejects reserved slugs', () => {
    expect(isValidComponentSlug('new')).toBe(false);
    expect(isValidComponentSlug('default')).toBe(false);
  });
});

describe('secret file helpers', () => {
  it('infers file types from names', () => {
    expect(inferSecretFileType('.env')).toBe('env');
    expect(inferSecretFileType('secrets.json')).toBe('flutter_secrets');
    expect(inferSecretFileType('config.yaml')).toBe('yaml');
  });

  it('validates allowed secret file names', () => {
    expect(isAllowedSecretFileName('.env')).toBe(true);
    expect(isAllowedSecretFileName('secrets.json')).toBe(true);
    expect(isAllowedSecretFileName('../.env')).toBe(false);
    expect(isAllowedSecretFileName('archive.zip')).toBe(false);
  });

  it('sanitizes download file names', () => {
    expect(sanitizeSecretFileName(' secrets.json ')).toBe('secrets.json');
    expect(buildContentDisposition('secrets.json')).toContain('filename="secrets.json"');
    expect(buildContentDisposition('.env')).toContain('filename=".env"');
  });
});
