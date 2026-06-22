import OrgMember from '../models/OrgMember';
import Project, { IProject } from '../models/Project';
import { getUserOrgRole } from './authorization';
import { getProjectMemberAttributes, hasProjectCapability } from './abac';

/**
 * Projects in an organization the user may act on during panic:
 * - projects they created
 * - all projects when they are org owner/admin
 * - projects where they were explicitly granted project:panic
 */
export async function getPanicEligibleProjectsForOrg(
  userId: string,
  organizationId: string
): Promise<IProject[]> {
  const projects = await Project.find({ organizationId });
  const orgRole = await getUserOrgRole(userId, organizationId);
  const eligible: IProject[] = [];

  for (const project of projects) {
    const attributes = await getProjectMemberAttributes(userId, project, orgRole);
    if (
      attributes.isOwner ||
      attributes.isOrgElevated ||
      hasProjectCapability(attributes, 'project:panic')
    ) {
      eligible.push(project);
    }
  }

  return eligible;
}

/**
 * All projects across every organization membership where the user may run panic.
 */
export async function getPanicEligibleProjects(userId: string): Promise<IProject[]> {
  const memberships = await OrgMember.find({ userId }).select('organizationId');
  const eligible: IProject[] = [];
  const seen = new Set<string>();

  for (const membership of memberships) {
    const orgProjects = await getPanicEligibleProjectsForOrg(
      userId,
      membership.organizationId.toString()
    );

    for (const project of orgProjects) {
      const projectId = project._id.toString();
      if (!seen.has(projectId)) {
        seen.add(projectId);
        eligible.push(project);
      }
    }
  }

  return eligible;
}

export async function canExecutePanicInOrg(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const projects = await getPanicEligibleProjectsForOrg(userId, organizationId);
  return projects.length > 0;
}
