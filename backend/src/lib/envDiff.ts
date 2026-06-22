export interface EnvDiffEntry {
  key: string;
  oldValue?: string;
  newValue?: string;
}

export interface EnvDiffResult {
  added: EnvDiffEntry[];
  removed: EnvDiffEntry[];
  changed: Array<{ key: string; oldValue: string; newValue: string }>;
  unchanged: Array<{ key: string; oldValue: string; newValue: string }>;
}

function parseEnvLines(content: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    map.set(key, value);
  }
  return map;
}

export function diffEnvContent(oldContent: string, newContent: string): EnvDiffResult {
  const oldMap = parseEnvLines(oldContent);
  const newMap = parseEnvLines(newContent);
  const keys = new Set([...oldMap.keys(), ...newMap.keys()]);

  const added: EnvDiffEntry[] = [];
  const removed: EnvDiffEntry[] = [];
  const changed: Array<{ key: string; oldValue: string; newValue: string }> = [];
  const unchanged: Array<{ key: string; oldValue: string; newValue: string }> = [];

  for (const key of [...keys].sort()) {
    const oldValue = oldMap.get(key);
    const newValue = newMap.get(key);

    if (oldValue === undefined && newValue !== undefined) {
      added.push({ key, newValue });
    } else if (oldValue !== undefined && newValue === undefined) {
      removed.push({ key, oldValue });
    } else if (oldValue !== undefined && newValue !== undefined && oldValue !== newValue) {
      changed.push({ key, oldValue, newValue });
    } else if (oldValue !== undefined && newValue !== undefined) {
      unchanged.push({ key, oldValue, newValue });
    }
  }

  return { added, removed, changed, unchanged };
}
