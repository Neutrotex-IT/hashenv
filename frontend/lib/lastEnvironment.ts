const STORAGE_KEY = 'hashenv_last_env';

type LastEnvMap = Record<string, string>;

function scopeKey(projectId: string, componentId: string): string {
  return `${projectId}:${componentId}`;
}

function readMap(): LastEnvMap {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as LastEnvMap;
  } catch {
    return {};
  }
}

function writeMap(map: LastEnvMap): void {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export function getLastEnvironment(projectId: string, componentId: string): string | null {
  const map = readMap();
  return map[scopeKey(projectId, componentId)] ?? null;
}

export function setLastEnvironment(projectId: string, componentId: string, environment: string): void {
  const map = readMap();
  map[scopeKey(projectId, componentId)] = environment;
  writeMap(map);
}

export function clearLastEnvironment(projectId: string, componentId: string): void {
  const map = readMap();
  delete map[scopeKey(projectId, componentId)];
  writeMap(map);
}
