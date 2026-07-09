export const SECRET_FILE_TYPE_OPTIONS = [
  { value: 'env', label: 'Environment (.env / .env.*)' },
  { value: 'json', label: 'JSON (.json)' },
  { value: 'yaml', label: 'YAML (.yaml / .yml)' },
  { value: 'toml', label: 'TOML (.toml)' },
  { value: 'ini', label: 'INI (.ini)' },
  { value: 'config', label: 'Config (.conf / .config)' },
  { value: 'properties', label: 'Properties (.properties)' },
  { value: 'xml', label: 'XML (.xml)' },
  { value: 'tfvars', label: 'Terraform (.tfvars)' },
  { value: 'plist', label: 'Plist (.plist)' },
  { value: 'cert', label: 'Certificate / Key' },
  { value: 'enc', label: 'Encrypted (.enc)' },
  { value: 'flutter_secrets', label: 'Flutter secrets (secrets.json)' },
  { value: 'custom', label: 'Custom' },
] as const;

const EXTENSION_BY_TYPE: Record<string, string> = {
  env: '.env',
  flutter_secrets: 'secrets.json',
  json: 'config.json',
  yaml: 'config.yaml',
  toml: 'config.toml',
  ini: 'config.ini',
  config: 'config.conf',
  properties: 'application.properties',
  xml: 'config.xml',
  tfvars: 'terraform.tfvars',
  plist: 'config.plist',
  cert: 'cert.pem',
  enc: 'secrets.enc',
  custom: 'secrets.txt',
};

const UPLOAD_ALLOWED_EXTENSIONS = new Set([
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

export function isEnvFileName(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower === '.env' || lower.startsWith('.env.');
}

function isSafeSecretFileName(fileName: string): boolean {
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
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
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) {
    return false;
  }
  return UPLOAD_ALLOWED_EXTENSIONS.has(fileName.slice(dot).toLowerCase());
}

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
  const blocked = ['.zip', '.tar', '.gz', '.exe', '.dll', '.bin', '.dmg', '.msi', '.apk'];
  const extension = trimmed.slice(dot).toLowerCase();
  if (blocked.includes(extension)) {
    return false;
  }
  return /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(trimmed);
}

export function isAllowedSecretFileName(fileName: string): boolean {
  return isAllowedFileUploadName(fileName) || isAllowedPasteFileName(fileName);
}

export function inferSecretFileType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (isEnvFileName(lower)) return 'env';
  if (lower.endsWith('.secrets') || lower === 'secrets.json') return 'flutter_secrets';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
  if (lower.endsWith('.toml')) return 'toml';
  if (lower.endsWith('.ini')) return 'ini';
  if (lower.endsWith('.conf') || lower.endsWith('.config')) return 'config';
  if (lower.endsWith('.properties')) return 'properties';
  if (lower.endsWith('.xml')) return 'xml';
  if (lower.endsWith('.tfvars')) return 'tfvars';
  if (lower.endsWith('.plist')) return 'plist';
  if (/\.(key|pem|p12|pfx|jks|keystore)$/.test(lower)) return 'cert';
  if (lower.endsWith('.enc')) return 'enc';
  return 'custom';
}

export function defaultFileNameForType(fileType: string, uploadedName?: string): string {
  if (uploadedName?.trim()) return uploadedName.trim();
  return EXTENSION_BY_TYPE[fileType] || 'secrets.txt';
}

export function formatSecretFileType(fileType: string): string {
  return SECRET_FILE_TYPE_OPTIONS.find((option) => option.value === fileType)?.label || fileType;
}

export const UPLOAD_ACCEPT_ATTRIBUTE =
  '.env,.json,.yaml,.yml,.toml,.ini,.conf,.config,.properties,.xml,.key,.pem,.p12,.pfx,.jks,.keystore,.enc,.tfvars,.plist';

export const UPLOAD_EXTENSION_HINT =
  '.env, .env.*, .json, .yaml, .yml, .toml, .ini, .conf, .config, .properties, .xml, .key, .pem, .p12, .pfx, .jks, .keystore, .enc, .tfvars, .plist';
