import mongoose from 'mongoose';
import OrgMember from '../models/OrgMember';
import Project, { IProject } from '../models/Project';

/**
 * Projects the user may act on during panic / auto-flush:
 * - projects they created
 * - all projects in orgs where they are owner or admin
 */
export async function getPanicEligibleProjects(userId: string): Promise<IProject[]> {
  const elevatedMemberships = await OrgMember.find({
    userId,
    role: { $in: ['owner', 'admin'] },
  }).select('organizationId');

  const elevatedOrgIds = elevatedMemberships.map((m) => m.organizationId);

  const query: Record<string, unknown> = {
    $or: [{ createdBy: new mongoose.Types.ObjectId(userId) }],
  };

  if (elevatedOrgIds.length > 0) {
    (query.$or as Record<string, unknown>[]).push({ organizationId: { $in: elevatedOrgIds } });
  }

  return Project.find(query);
}
