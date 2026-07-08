export const SECRET_FILE_TYPES = [
  'env',
  'flutter_secrets',
  'json',
  'yaml',
  'properties',
  'custom',
] as const;

export type SecretFileType = (typeof SECRET_FILE_TYPES)[number];

export const ALLOWED_SECRET_FILE_EXTENSIONS = new Set([
  '.env',
  '.json',
  '.yaml',
  '.yml',
  '.properties',
  '.secrets',
  '.pem',
  '.txt',
]);

export const MAX_SECRET_FILE_BYTES = 50 * 1024;

const FILE_TYPE_BY_EXTENSION: Record<string, SecretFileType> = {
  '.env': 'env',
  '.secrets': 'flutter_secrets',
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.properties': 'properties',
  '.pem': 'custom',
  '.txt': 'custom',
};

export function extractExtension(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower === '.env') {
    return '.env';
  }
  const dotIndex = lower.lastIndexOf('.');
  if (dotIndex <= 0) {
    return '';
  }
  return lower.slice(dotIndex);
}

export function isAllowedSecretFileName(fileName: string): boolean {
  if (!fileName || fileName.includes('\0')) {
    return false;
  }
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }
  if (fileName.length > 255) {
    return false;
  }
  const extension = extractExtension(fileName);
  if (!extension || !ALLOWED_SECRET_FILE_EXTENSIONS.has(extension)) {
    return false;
  }
  return true;
}

export function inferSecretFileType(fileName: string): SecretFileType {
  const lower = fileName.toLowerCase();
  if (lower === 'secrets.json') {
    return 'flutter_secrets';
  }
  const extension = extractExtension(fileName);
  return FILE_TYPE_BY_EXTENSION[extension] ?? 'custom';
}

export function sanitizeSecretFileName(fileName: string): string {
  return fileName.trim().replace(/[\r\n]/g, '');
}

export function contentTypeForSecretFile(fileName: string, fileType?: SecretFileType): string {
  const extension = extractExtension(fileName);
  switch (extension) {
    case '.json':
      return 'application/json';
    case '.yaml':
    case '.yml':
      return 'application/x-yaml';
    case '.properties':
      return 'text/x-java-properties';
    case '.pem':
      return 'application/x-pem-file';
    default:
      if (fileType === 'env' || extension === '.env') {
        return 'text/plain';
      }
      return 'text/plain';
  }
}

export function buildContentDisposition(fileName: string): string {
  const safe = sanitizeSecretFileName(fileName);
  const asciiFallback = safe.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_') || 'secrets-file';
  const encoded = encodeURIComponent(safe);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}
