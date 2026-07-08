export const SECRET_FILE_TYPE_OPTIONS = [
  { value: 'env', label: 'Environment (.env)' },
  { value: 'flutter_secrets', label: 'Flutter secrets (.secrets / secrets.json)' },
  { value: 'json', label: 'JSON (.json)' },
  { value: 'yaml', label: 'YAML (.yaml / .yml)' },
  { value: 'properties', label: 'Properties (.properties)' },
  { value: 'custom', label: 'Custom' },
] as const;

const EXTENSION_BY_TYPE: Record<string, string> = {
  env: '.env',
  flutter_secrets: 'secrets.json',
  json: 'config.json',
  yaml: 'config.yaml',
  properties: 'application.properties',
  custom: 'secrets.txt',
};

export function inferSecretFileType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower === '.env' || lower.endsWith('.env')) return 'env';
  if (lower.endsWith('.secrets') || lower === 'secrets.json') return 'flutter_secrets';
  if (lower.endsWith('.json')) return 'json';
  if (lower.endsWith('.yaml') || lower.endsWith('.yml')) return 'yaml';
  if (lower.endsWith('.properties')) return 'properties';
  return 'custom';
}

export function defaultFileNameForType(fileType: string, uploadedName?: string): string {
  if (uploadedName?.trim()) return uploadedName.trim();
  return EXTENSION_BY_TYPE[fileType] || 'secrets.txt';
}

export function isAllowedSecretFileName(fileName: string): boolean {
  if (!fileName || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    return false;
  }
  const allowed = ['.env', '.json', '.yaml', '.yml', '.properties', '.secrets', '.pem', '.txt'];
  if (fileName === '.env') return true;
  const dot = fileName.lastIndexOf('.');
  if (dot <= 0) return false;
  return allowed.includes(fileName.slice(dot).toLowerCase());
}

export function formatSecretFileType(fileType: string): string {
  return SECRET_FILE_TYPE_OPTIONS.find((option) => option.value === fileType)?.label || fileType;
}
