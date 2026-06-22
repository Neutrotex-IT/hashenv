import { describe, expect, it, vi, beforeEach } from 'vitest';

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

vi.mock('../lib/authorization', () => ({
  getUserOrgRole: vi.fn(),
}));

vi.mock('../lib/abac', () => ({
  getProjectMemberAttributes: vi.fn(),
  hasProjectCapability: vi.fn(),
}));

import OrgMember from '../models/OrgMember';
import Project from '../models/Project';
import { getUserOrgRole } from '../lib/authorization';
import { getProjectMemberAttributes, hasProjectCapability } from '../lib/abac';
import {
  canExecutePanicInOrg,
  getPanicEligibleProjects,
  getPanicEligibleProjectsForOrg,
} from '../lib/panicProjects';

describe('getPanicEligibleProjectsForOrg', () => {
  const userId = '507f1f77bcf86cd799439011';
  const organizationId = '607f1f77bcf86cd799439012';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns projects where the user is owner, org elevated, or has project:panic', async () => {
    const ownedProject = { _id: 'p1', organizationId };
    const grantedProject = { _id: 'p2', organizationId };
    const deniedProject = { _id: 'p3', organizationId };

    vi.mocked(Project.find).mockResolvedValue([ownedProject, grantedProject, deniedProject] as never);
    vi.mocked(getUserOrgRole).mockResolvedValue('member');
    vi.mocked(getProjectMemberAttributes).mockImplementation(async (_userId, project) => {
      if (project._id === 'p1') {
        return {
          accessLevel: 'write',
          permissions: [],
          isOwner: true,
          isOrgElevated: false,
        };
      }
      if (project._id === 'p2') {
        return {
          accessLevel: 'write',
          permissions: ['project:panic'],
          isOwner: false,
          isOrgElevated: false,
        };
      }
      return {
        accessLevel: 'write',
        permissions: [],
        isOwner: false,
        isOrgElevated: false,
      };
    });
    vi.mocked(hasProjectCapability).mockImplementation((attributes, capability) => {
      if (capability !== 'project:panic') {
        return false;
      }
      return attributes.permissions.includes('project:panic');
    });

    const projects = await getPanicEligibleProjectsForOrg(userId, organizationId);

    expect(projects).toEqual([ownedProject, grantedProject]);
    expect(Project.find).toHaveBeenCalledWith({ organizationId });
  });
});

describe('getPanicEligibleProjects', () => {
  const userId = '507f1f77bcf86cd799439011';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('aggregates eligible projects across organization memberships', async () => {
    vi.mocked(OrgMember.find).mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { organizationId: 'org-1' },
        { organizationId: 'org-2' },
      ]),
    } as never);

    const projectA = { _id: 'p1' };
    const projectB = { _id: 'p2' };

    vi.mocked(Project.find)
      .mockResolvedValueOnce([projectA] as never)
      .mockResolvedValueOnce([projectB] as never);
    vi.mocked(getUserOrgRole).mockResolvedValue('admin');
    vi.mocked(getProjectMemberAttributes).mockResolvedValue({
      accessLevel: 'write',
      permissions: [],
      isOwner: false,
      isOrgElevated: true,
    });
    vi.mocked(hasProjectCapability).mockReturnValue(false);

    const projects = await getPanicEligibleProjects(userId);

    expect(projects).toEqual([projectA, projectB]);
  });
});

describe('canExecutePanicInOrg', () => {
  it('returns true when at least one project is eligible', async () => {
    vi.mocked(Project.find).mockResolvedValue([{ _id: 'p1' }] as never);
    vi.mocked(getUserOrgRole).mockResolvedValue('owner');
    vi.mocked(getProjectMemberAttributes).mockResolvedValue({
      accessLevel: 'write',
      permissions: [],
      isOwner: false,
      isOrgElevated: true,
    });
    vi.mocked(hasProjectCapability).mockReturnValue(false);

    await expect(canExecutePanicInOrg('user', 'org')).resolves.toBe(true);
  });
});
