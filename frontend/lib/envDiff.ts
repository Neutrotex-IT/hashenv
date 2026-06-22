export type EnvDiffType = 'added' | 'removed' | 'changed' | 'unchanged';

export interface EnvDiffLine {
  type: EnvDiffType;
  key: string;
  oldValue?: string;
  newValue?: string;
}

export interface ServerEnvDiff {
  added: Array<{ key: string; newValue?: string }>;
  removed: Array<{ key: string; oldValue?: string }>;
  changed: Array<{ key: string; oldValue: string; newValue: string }>;
  unchanged: Array<{ key: string; oldValue: string; newValue: string }>;
}

export function mapServerDiffToLines(serverDiff: ServerEnvDiff): EnvDiffLine[] {
  return [
    ...serverDiff.added.map((item) => ({
      type: 'added' as const,
      key: item.key,
      newValue: item.newValue,
    })),
    ...serverDiff.removed.map((item) => ({
      type: 'removed' as const,
      key: item.key,
      oldValue: item.oldValue,
    })),
    ...serverDiff.changed.map((item) => ({
      type: 'changed' as const,
      key: item.key,
      oldValue: item.oldValue,
      newValue: item.newValue,
    })),
    ...serverDiff.unchanged.map((item) => ({
      type: 'unchanged' as const,
      key: item.key,
      oldValue: item.oldValue,
      newValue: item.newValue,
    })),
  ].sort((a, b) => a.key.localeCompare(b.key));
}

export function countDiffChanges(lines: EnvDiffLine[]): { added: number; removed: number; changed: number } {
  return {
    added: lines.filter((l) => l.type === 'added').length,
    removed: lines.filter((l) => l.type === 'removed').length,
    changed: lines.filter((l) => l.type === 'changed').length,
  };
}
