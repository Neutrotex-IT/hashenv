import { describe, expect, it } from 'vitest';
import { diffEnvContent } from '../lib/envDiff';

describe('env diff', () => {
  it('detects added, removed, and changed keys', () => {
    const oldContent = 'FOO=1\nBAR=2\n# comment\nBAZ=old';
    const newContent = 'FOO=1\nBAR=3\nQUX=new';

    const result = diffEnvContent(oldContent, newContent);

    expect(result.added).toEqual([{ key: 'QUX', newValue: 'new' }]);
    expect(result.removed).toEqual([{ key: 'BAZ', oldValue: 'old' }]);
    expect(result.changed).toEqual([{ key: 'BAR', oldValue: '2', newValue: '3' }]);
    expect(result.unchanged).toEqual([{ key: 'FOO', oldValue: '1', newValue: '1' }]);
  });

  it('returns empty diff for identical content', () => {
    const content = 'A=1\nB=2';
    const result = diffEnvContent(content, content);
    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.changed).toHaveLength(0);
    expect(result.unchanged).toEqual([
      { key: 'A', oldValue: '1', newValue: '1' },
      { key: 'B', oldValue: '2', newValue: '2' },
    ]);
  });
});
