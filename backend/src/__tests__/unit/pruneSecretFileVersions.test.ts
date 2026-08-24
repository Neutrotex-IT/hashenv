import { beforeEach, describe, expect, it, vi } from 'vitest';

const findMock = vi.fn();
const deleteManyMock = vi.fn();
const aggregateMock = vi.fn();

vi.mock('../../models/SecretFile', () => ({
  default: {
    find: findMock,
    deleteMany: deleteManyMock,
    aggregate: aggregateMock,
  },
}));

import {
  SECRET_FILE_MAX_VERSIONS,
  pruneAllOversizedSecretFileVersionGroups,
  pruneOldSecretFileVersions,
} from '../../lib/secretFiles';

function chainFind(docs: Array<{ _id: string }>) {
  const lean = vi.fn().mockResolvedValue(docs);
  const select = vi.fn().mockReturnValue({ lean });
  const skip = vi.fn().mockReturnValue({ select });
  const sort = vi.fn().mockReturnValue({ skip });
  findMock.mockReturnValue({ sort });
  return { sort, skip, select, lean };
}

describe('pruneOldSecretFileVersions', () => {
  beforeEach(() => {
    findMock.mockReset();
    deleteManyMock.mockReset();
    aggregateMock.mockReset();
  });

  it('exports a retention cap of 20', () => {
    expect(SECRET_FILE_MAX_VERSIONS).toBe(20);
  });

  it('deletes nothing when at or under the cap', async () => {
    chainFind([]);
    const deleted = await pruneOldSecretFileVersions('comp1', 'dev', '.env');
    expect(deleted).toBe(0);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it('deletes stale ids beyond the keep window', async () => {
    chainFind([{ _id: 'old1' }, { _id: 'old2' }]);
    deleteManyMock.mockResolvedValue({ deletedCount: 2 });

    const deleted = await pruneOldSecretFileVersions('comp1', 'dev', '.env', 20);
    expect(deleted).toBe(2);
    expect(deleteManyMock).toHaveBeenCalledWith({ _id: { $in: ['old1', 'old2'] } });
  });

  it('pruneAllOversizedSecretFileVersionGroups walks oversized groups', async () => {
    aggregateMock.mockResolvedValue([
      {
        _id: { componentId: 'c1', environment: 'dev', fileName: '.env' },
        count: 25,
      },
    ]);
    chainFind([{ _id: 'x' }]);
    deleteManyMock.mockResolvedValue({ deletedCount: 1 });

    const pruned = await pruneAllOversizedSecretFileVersionGroups();
    expect(pruned).toBe(1);
    expect(aggregateMock).toHaveBeenCalled();
  });
});
