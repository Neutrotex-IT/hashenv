import mongoose from 'mongoose';
import { ProjectApiToken } from '../models/ProjectApiToken';
import type { IProject } from '../models/Project';
import { getUserOrgRole } from './authorization';
import { getProjectMemberAttributes, hasProjectCapability } from './abac';

/**
 * Revoke all API tokens created by a user for the given projects.
 */
export async function revokeApiTokensForUser(
  userId: string,
  projectIds: Array<string | mongoose.Types.ObjectId>
): Promise<number> {
  if (projectIds.length === 0) {
    return 0;
  }

  const result = await ProjectApiToken.deleteMany({
    createdBy: userId,
    projectId: { $in: projectIds },
  });

  return result.deletedCount ?? 0;
}

/**
 * Verify the token creator still has project access and can manage tokens.
 */
export async function isApiTokenCreatorAuthorized(
  createdBy: string,
  project: IProject
): Promise<boolean> {
  const orgRole = await getUserOrgRole(createdBy, project.organizationId.toString());
  if (!orgRole) {
    return false;
  }

  const attributes = await getProjectMemberAttributes(createdBy, project, orgRole);
  if (!attributes.accessLevel) {
    return false;
  }

  return hasProjectCapability(attributes, 'project:manage_tokens');
}
