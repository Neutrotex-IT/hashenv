export type EnvDiffType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface EnvDiffLine {
  type: EnvDiffType;
  key: string;
  oldValue?: string;
  newValue?: string;
}

export function parseEnvLines(content: string): Map<string, string> {
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

export function diffEnvContent(oldContent: string, newContent: string): EnvDiffLine[] {
  const oldMap = parseEnvLines(oldContent);
  const newMap = parseEnvLines(newContent);
  const keys = new Set([...oldMap.keys(), ...newMap.keys()]);
  const result: EnvDiffLine[] = [];

  for (const key of [...keys].sort()) {
    const oldValue = oldMap.get(key);
    const newValue = newMap.get(key);

    if (oldValue === undefined && newValue !== undefined) {
      result.push({ type: 'added', key, newValue });
    } else if (oldValue !== undefined && newValue === undefined) {
      result.push({ type: 'removed', key, oldValue });
    } else if (oldValue !== newValue) {
      result.push({ type: 'changed', key, oldValue, newValue });
    } else {
      result.push({ type: 'unchanged', key, oldValue, newValue });
    }
  }

  return result;
}

export function countDiffChanges(lines: EnvDiffLine[]): { added: number; removed: number; changed: number } {
  return {
    added: lines.filter((l) => l.type === 'added').length,
    removed: lines.filter((l) => l.type === 'removed').length,
    changed: lines.filter((l) => l.type === 'changed').length,
  };
}
