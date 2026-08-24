export const SECRET_FILE_TYPES = [
  'env',
  'flutter_secrets',
  'json',
  'yaml',
  'toml',
  'ini',
  'properties',
  'xml',
  'tfvars',
  'plist',
  'cert',
  'config',
  'enc',
  'custom',
] as const;

export type SecretFileType = (typeof SECRET_FILE_TYPES)[number];

/** Maximum retained versions per (componentId, environment, fileName). */
export const SECRET_FILE_MAX_VERSIONS = 20;

export const UPLOAD_ALLOWED_EXTENSIONS = new Set([
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.ini',
  '.conf',
  '.config',
  '.properties',
  '.xml',
  '.key',
  '.pem',
  '.p12',
  '.pfx',
  '.jks',
  '.keystore',
  '.enc',
  '.tfvars',
  '.plist',
]);

export const MAX_SECRET_FILE_BYTES = 50 * 1024;

const FILE_TYPE_BY_EXTENSION: Record<string, SecretFileType> = {
  '.json': 'json',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.ini': 'ini',
  '.conf': 'config',
  '.config': 'config',
  '.properties': 'properties',
  '.xml': 'xml',
  '.key': 'cert',
  '.pem': 'cert',
  '.p12': 'cert',
  '.pfx': 'cert',
  '.jks': 'cert',
  '.keystore': 'cert',
  '.enc': 'enc',
  '.tfvars': 'tfvars',
  '.plist': 'plist',
};

export function isEnvFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower === '.env' || lower.startsWith('.env.');
}

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

function isSafeSecretFileName(fileName: string): boolean {
  if (!fileName || fileName.includes('\0')) {
    return false;
  }
  if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }
  if (fileName.length > 255) {
    return false;
  }
  return true;
}

export function isAllowedFileUploadName(fileName: string): boolean {
  if (!isSafeSecretFileName(fileName)) {
    return false;
  }
  if (isEnvFileName(fileName)) {
    return true;
  }
  const extension = extractExtension(fileName);
  return Boolean(extension && UPLOAD_ALLOWED_EXTENSIONS.has(extension));
}

const BLOCKED_PASTE_EXTENSIONS = new Set([
  '.zip',
  '.tar',
  '.gz',
  '.tgz',
  '.7z',
  '.rar',
  '.exe',
  '.dll',
  '.so',
  '.dylib',
  '.bin',
  '.dmg',
  '.iso',
  '.img',
  '.msi',
  '.deb',
  '.rpm',
  '.apk',
  '.ipa',
]);

export function isAllowedPasteFileName(fileName: string): boolean {
  if (!isSafeSecretFileName(fileName)) {
    return false;
  }
  if (isEnvFileName(fileName)) {
    return true;
  }
  const trimmed = fileName.trim();
  const dot = trimmed.lastIndexOf('.');
  if (dot <= 0 || dot >= trimmed.length - 1) {
    return false;
  }
  const extension = trimmed.slice(dot).toLowerCase();
  if (BLOCKED_PASTE_EXTENSIONS.has(extension)) {
    return false;
  }
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(trimmed);
}

export function isAllowedSecretFileName(fileName: string): boolean {
  return isAllowedFileUploadName(fileName) || isAllowedPasteFileName(fileName);
}

export function inferSecretFileType(fileName: string): SecretFileType {
  const lower = fileName.toLowerCase();
  if (isEnvFileName(lower)) {
    return 'env';
  }
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
    case '.plist':
      return 'application/json';
    case '.yaml':
    case '.yml':
      return 'application/x-yaml';
    case '.xml':
      return 'application/xml';
    case '.properties':
      return 'text/x-java-properties';
    case '.pem':
      return 'application/x-pem-file';
    case '.p12':
    case '.pfx':
      return 'application/x-pkcs12';
    default:
      if (fileType === 'env' || isEnvFileName(fileName)) {
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

/**
 * Keep only the newest SECRET_FILE_MAX_VERSIONS documents for a file key.
 * Call after creating a new version.
 */
export async function pruneOldSecretFileVersions(
  componentId: string,
  environment: string,
  fileName: string,
  keep: number = SECRET_FILE_MAX_VERSIONS
): Promise<number> {
  const SecretFile = (await import('../models/SecretFile')).default;
  const stale = await SecretFile.find({ componentId, environment, fileName })
    .sort({ version: -1 })
    .skip(keep)
    .select('_id')
    .lean();

  if (stale.length === 0) {
    return 0;
  }

  const result = await SecretFile.deleteMany({
    _id: { $in: stale.map((doc) => doc._id) },
  });
  return result.deletedCount ?? 0;
}

/**
 * Cap versions for every (componentId, environment, fileName) group that exceeds the limit.
 * Used as an idempotent startup backfill.
 */
export async function pruneAllOversizedSecretFileVersionGroups(
  keep: number = SECRET_FILE_MAX_VERSIONS
): Promise<number> {
  const SecretFile = (await import('../models/SecretFile')).default;
  const groups = await SecretFile.aggregate<{
    _id: { componentId: string; environment: string; fileName: string };
    count: number;
  }>([
    {
      $group: {
        _id: {
          componentId: '$componentId',
          environment: '$environment',
          fileName: '$fileName',
        },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: keep } } },
  ]);

  let pruned = 0;
  for (const group of groups) {
    pruned += await pruneOldSecretFileVersions(
      String(group._id.componentId),
      group._id.environment,
      group._id.fileName,
      keep
    );
  }
  return pruned;
}

export const UPLOAD_ACCEPT_ATTRIBUTE =
  '.env,.json,.yaml,.yml,.toml,.ini,.conf,.config,.properties,.xml,.key,.pem,.p12,.pfx,.jks,.keystore,.enc,.tfvars,.plist';

export const UPLOAD_EXTENSION_HINT =
  '.env, .env.*, .json, .yaml, .yml, .toml, .ini, .conf, .config, .properties, .xml, .key, .pem, .p12, .pfx, .jks, .keystore, .enc, .tfvars, .plist';
