import mongoose from 'mongoose';
import Project from '../models/Project';
import ProjectInvite from '../models/ProjectInvite';
import OrgMember from '../models/OrgMember';
import User from '../models/User';
import { canGrantProjectPermissions } from './abac';
import { ProjectPermission, sanitizeProjectPermissions } from './permissions';
import { generateVerificationToken, sendProjectInviteEmail } from './email';

const INVITE_EXPIRES_DAYS = 3;

export async function createAndSendProjectInvite(
  projectId: string,
  email: string,
  permission: 'read' | 'write',
  permissions: ProjectPermission[],
  invitedBy: string,
  inviterContext: {
    accessLevel: 'read' | 'write' | null;
    permissions: ProjectPermission[];
    isOwner: boolean;
    isOrgElevated: boolean;
    orgRole: 'owner' | 'admin' | 'member' | null;
  }
) {
  const project = await Project.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const sanitizedPermissions = sanitizeProjectPermissions(permissions);

  const grantCheck = canGrantProjectPermissions(inviterContext, {
    accessLevel: permission,
    targetPermissions: sanitizedPermissions,
  });
  if (!grantCheck.allowed) {
    throw new Error(grantCheck.reason || 'You cannot send this project invite');
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const isOrgMember = await OrgMember.findOne({
      organizationId: project.organizationId,
      userId: existingUser._id,
    });
    if (!isOrgMember) {
      throw new Error('User must be a member of the organization before joining this project');
    }

    const existingMember = project.members.find(
      (member) => member.userId.toString() === existingUser._id.toString()
    );
    if (existingMember) {
      throw new Error('User is already a member of this project');
    }
  }

  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  let invite = await ProjectInvite.findOne({
    projectId,
    email: normalizedEmail,
    status: 'pending',
  });

  if (invite) {
    invite.token = token;
    invite.permission = permission;
    invite.permissions = sanitizedPermissions;
    invite.expiresAt = expiresAt;
    invite.invitedBy = invitedBy as any;
    await invite.save();
  } else {
    invite = await ProjectInvite.create({
      projectId,
      organizationId: project.organizationId,
      email: normalizedEmail,
      permission,
      permissions: sanitizedPermissions,
      token,
      invitedBy,
      expiresAt,
      status: 'pending',
    });
  }

  const inviter = await User.findById(invitedBy);
  try {
    await sendProjectInviteEmail(
      normalizedEmail,
      token,
      project.name,
      inviter?.name || 'A project collaborator'
    );
  } catch (emailError) {
    console.error('Failed to send project invite email:', emailError);
    if (process.env.NODE_ENV === 'production') {
      throw emailError;
    }
  }

  return invite;
}

export async function getProjectInvitePreview(token: string) {
  const invite = await ProjectInvite.findOne({ token })
    .populate('projectId', 'name')
    .populate('organizationId', 'name slug type');

  if (!invite) {
    return null;
  }

  const project = invite.projectId as any;
  const org = invite.organizationId as any;
  const expired = invite.expiresAt < new Date();
  const userExists = !!(await User.findOne({ email: invite.email }));

  return {
    type: 'project' as const,
    email: invite.email,
    permission: invite.permission,
    status: invite.status,
    expired,
    project: project?._id ? { _id: project._id.toString(), name: project.name } : null,
    organization: org?._id
      ? { _id: org._id.toString(), name: org.name, slug: org.slug, type: org.type }
      : null,
    requiresRegistration: !userExists,
    canAccept: invite.status === 'pending' && !expired,
  };
}

export async function acceptProjectInvite(token: string, userId: string) {
  const invite = await ProjectInvite.findOne({ token, status: 'pending' });
  if (!invite || invite.expiresAt < new Date()) {
    throw new Error('Invalid or expired invite');
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new Error('User not found');
  }
  if (user.email !== invite.email) {
    throw new Error('This invite was sent to a different email address');
  }
  if (!user.emailVerified) {
    throw new Error('Please verify your email before accepting the invite');
  }

  const orgMember = await OrgMember.findOne({
    organizationId: invite.organizationId,
    userId,
  });
  if (!orgMember) {
    throw new Error('You must be a member of the organization before joining this project');
  }

  const project = await Project.findById(invite.projectId);
  if (!project) {
    throw new Error('Project not found');
  }

  const existingMemberIndex = project.members.findIndex(
    (member) => member.userId.toString() === userId
  );

  if (existingMemberIndex >= 0) {
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    invite.acceptedBy = user._id;
    await invite.save();

    return {
      alreadyMember: true,
      projectId: invite.projectId.toString(),
      projectName: project.name,
    };
  }

  project.members.push({
    userId: user._id as mongoose.Types.ObjectId,
    permission: invite.permission,
    permissions: sanitizeProjectPermissions(invite.permissions),
  });
  await project.save();

  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  invite.acceptedBy = user._id;
  await invite.save();

  return {
    alreadyMember: false,
    projectId: invite.projectId.toString(),
    projectName: project.name,
  };
}
