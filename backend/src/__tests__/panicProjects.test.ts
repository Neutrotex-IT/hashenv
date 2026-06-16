import { describe, expect, it, vi, beforeEach } from 'vitest';
import mongoose from 'mongoose';

vi.mock('../models/OrgMember', () => ({
  default: {
    find: vi.fn(),
  },
}));

vi.mock('../models/Project', () => ({
  default: {
    find: vi.fn(),
  },
}));

import OrgMember from '../models/OrgMember';
import Project from '../models/Project';
import { getPanicEligibleProjects } from '../lib/panicProjects';

describe('getPanicEligibleProjects', () => {
  const userId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('queries created projects and orgs where user is owner or admin', async () => {
    const orgId = new mongoose.Types.ObjectId();
    vi.mocked(OrgMember.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ organizationId: orgId }]),
    } as any);

    vi.mocked(Project.find).mockResolvedValue([]);

    await getPanicEligibleProjects(userId);

    expect(Project.find).toHaveBeenCalledWith({
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { organizationId: { $in: [orgId] } },
      ],
    });
  });

  it('only queries createdBy when user has no elevated org memberships', async () => {
    vi.mocked(OrgMember.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([]),
    } as any);

    vi.mocked(Project.find).mockResolvedValue([]);

    await getPanicEligibleProjects(userId);

    expect(Project.find).toHaveBeenCalledWith({
      $or: [{ createdBy: new mongoose.Types.ObjectId(userId) }],
    });
  });
});
