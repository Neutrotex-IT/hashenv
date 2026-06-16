import OrgInvite from '../models/OrgInvite';
import OrgMember from '../models/OrgMember';
import Organization from '../models/Organization';
import User from '../models/User';
import { canGrantOrgPermissions, canInviteToOrganization } from './abac';
import { OrgPermission, sanitizeOrgPermissions } from './permissions';
import { generateVerificationToken, sendOrgInviteEmail } from './email';

const INVITE_EXPIRES_DAYS = 7;

export async function createAndSendOrgInvite(
  orgId: string,
  email: string,
  role: 'member' | 'admin',
  invitedBy: string,
  permissions: OrgPermission[] = [],
  inviterAttributes?: { role: 'owner' | 'admin' | 'member'; permissions: OrgPermission[] }
) {
  const org = await Organization.findById(orgId);
  if (!org) {
    throw new Error('Organization not found');
  }
  if (org.type === 'personal') {
    throw new Error('Cannot invite members to a personal workspace');
  }

  const normalizedEmail = email.toLowerCase().trim();
  const sanitizedPermissions = sanitizeOrgPermissions(permissions);

  if (inviterAttributes) {
    const inviteCheck = canInviteToOrganization(inviterAttributes, {
      targetRole: role,
      targetPermissions: role === 'admin' ? [] : sanitizedPermissions,
    });
    if (!inviteCheck.allowed) {
      throw new Error(inviteCheck.reason || 'You cannot send this invite');
    }
  }

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    const existingMember = await OrgMember.findOne({
      organizationId: orgId,
      userId: existingUser._id,
    });
    if (existingMember) {
      throw new Error('User is already a member of this organization');
    }
  }

  const token = generateVerificationToken();
  const expiresAt = new Date(Date.now() + INVITE_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

  let invite = await OrgInvite.findOne({
    organizationId: orgId,
    email: normalizedEmail,
    status: 'pending',
  });

  const invitePermissions = role === 'admin' ? [] : sanitizedPermissions;

  if (invite) {
    invite.token = token;
    invite.role = role;
    invite.permissions = invitePermissions;
    invite.expiresAt = expiresAt;
    invite.invitedBy = invitedBy as any;
    await invite.save();
  } else {
    invite = await OrgInvite.create({
      organizationId: orgId,
      email: normalizedEmail,
      role,
      permissions: invitePermissions,
      token,
      invitedBy,
      expiresAt,
      status: 'pending',
    });
  }

  const inviter = await User.findById(invitedBy);
  try {
    await sendOrgInviteEmail(normalizedEmail, token, org.name, inviter?.name || 'A team admin');
  } catch (emailError) {
    console.error('Failed to send organization invite email:', emailError);
    if (process.env.NODE_ENV === 'production') {
      throw emailError;
    }
  }

  return invite;
}

export async function getInvitePreview(token: string) {
  const invite = await OrgInvite.findOne({ token }).populate('organizationId', 'name slug type');
  if (!invite) {
    return null;
  }

  const org = invite.organizationId as any;
  const expired = invite.expiresAt < new Date();
  const userExists = !!(await User.findOne({ email: invite.email }));

  return {
    type: 'organization' as const,
    email: invite.email,
    role: invite.role,
    permissions: invite.permissions,
    status: invite.status,
    expired,
    organization: org?._id
      ? { _id: org._id.toString(), name: org.name, slug: org.slug, type: org.type }
      : null,
    requiresRegistration: !userExists,
    canAccept: invite.status === 'pending' && !expired,
  };
}

export async function acceptOrgInvite(token: string, userId: string) {
  const invite = await OrgInvite.findOne({ token, status: 'pending' });
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

  const existingMember = await OrgMember.findOne({
    organizationId: invite.organizationId,
    userId,
  });

  if (existingMember) {
    invite.status = 'accepted';
    invite.acceptedAt = new Date();
    invite.acceptedBy = user._id;
    await invite.save();

    const org = await Organization.findById(invite.organizationId);
    return {
      alreadyMember: true,
      organizationId: invite.organizationId.toString(),
      organizationName: org?.name,
    };
  }

  await OrgMember.create({
    organizationId: invite.organizationId,
    userId,
    role: invite.role,
    permissions: invite.role === 'admin' ? [] : sanitizeOrgPermissions(invite.permissions),
  });

  invite.status = 'accepted';
  invite.acceptedAt = new Date();
  invite.acceptedBy = user._id;
  await invite.save();

  const org = await Organization.findById(invite.organizationId);
  return {
    alreadyMember: false,
    organizationId: invite.organizationId.toString(),
    organizationName: org?.name,
  };
}

export async function acceptPendingInvitesForUser(userId: string, email: string) {
  const invites = await OrgInvite.find({
    email: email.toLowerCase(),
    status: 'pending',
    expiresAt: { $gt: new Date() },
  });

  const accepted: Array<{ organizationId: string; organizationName?: string }> = [];

  for (const invite of invites) {
    try {
      const result = await acceptOrgInvite(invite.token, userId);
      accepted.push({
        organizationId: result.organizationId,
        organizationName: result.organizationName,
      });
    } catch {
      // Skip invites that cannot be accepted automatically
    }
  }

  return accepted;
}
