import mongoose from 'mongoose';
import Component from '../models/Component';
import AssociatedAccount from '../models/AssociatedAccount';
import Project, { IProjectMember } from '../models/Project';
import { isValidObjectId } from '../middleware/validation';

const OBJECT_ID_PATTERN = /^[0-9a-fA-F]{24}$/;

export type ResourceScopeLists = {
  componentIds: string[] | null;
  accountIds: string[] | null;
};

export function sanitizeResourceIdList(ids: unknown): string[] {
  if (!Array.isArray(ids)) {
    return [];
  }

  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of ids) {
    if (typeof id === 'string' && OBJECT_ID_PATTERN.test(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  return result;
}

export function toObjectIdList(ids: string[]): mongoose.Types.ObjectId[] {
  return ids.map((id) => new mongoose.Types.ObjectId(id));
}

/** null = unrestricted; string[] = restricted allowlist (may be empty) */
export function scopeListsFromStoredIds(
  resourceScope: 'full' | 'restricted' | undefined,
  componentIds?: mongoose.Types.ObjectId[],
  accountIds?: mongoose.Types.ObjectId[]
): ResourceScopeLists {
  if (resourceScope !== 'restricted') {
    return { componentIds: null, accountIds: null };
  }

  return {
    componentIds: (componentIds ?? []).map((id) => id.toString()),
    accountIds: (accountIds ?? []).map((id) => id.toString()),
  };
}

export function resolveMemberResourceScope(
  member?: Pick<IProjectMember, 'resourceScope' | 'componentIds' | 'accountIds'>
): 'full' | 'restricted' {
  if (!member) {
    return 'full';
  }
  if (member.resourceScope === 'restricted' || member.resourceScope === 'full') {
    return member.resourceScope;
  }
  if (member.componentIds !== undefined || member.accountIds !== undefined) {
    return 'restricted';
  }
  return 'full';
}

export function scopeListsFromMember(
  member?: Pick<IProjectMember, 'resourceScope' | 'componentIds' | 'accountIds'>
): ResourceScopeLists {
  if (!member) {
    return { componentIds: [], accountIds: [] };
  }
  return scopeListsFromStoredIds(
    resolveMemberResourceScope(member),
    member.componentIds,
    member.accountIds
  );
}

export function isScopeUnrestricted(scope: string[] | null): boolean {
  return scope === null;
}

export function canAccessScopedResource(
  scope: string[] | null,
  resourceId: string,
  unrestricted: boolean
): boolean {
  if (unrestricted) {
    return true;
  }
  if (scope === null) {
    return true;
  }
  return scope.includes(resourceId);
}

export function canGrantResourceScope(
  actor: ResourceScopeLists & { unrestricted: boolean },
  grant: {
    resourceAccess?: 'full' | 'restricted';
    componentIds?: string[];
    accountIds?: string[];
  }
): { allowed: boolean; reason?: string } {
  if (actor.unrestricted) {
    return { allowed: true };
  }

  if (grant.resourceAccess === 'full') {
    return {
      allowed: false,
      reason: 'You cannot grant full project resource access because your own access is restricted',
    };
  }

  if (grant.resourceAccess !== 'restricted' && grant.componentIds === undefined && grant.accountIds === undefined) {
    return { allowed: true };
  }

  const componentIds = grant.componentIds ?? [];
  const accountIds = grant.accountIds ?? [];

  if (actor.componentIds !== null) {
    for (const id of componentIds) {
      if (!actor.componentIds.includes(id)) {
        return {
          allowed: false,
          reason: 'You cannot grant access to components outside your own scope',
        };
      }
    }
  }

  if (actor.accountIds !== null) {
    for (const id of accountIds) {
      if (!actor.accountIds.includes(id)) {
        return {
          allowed: false,
          reason: 'You cannot grant access to accounts outside your own scope',
        };
      }
    }
  }

  return { allowed: true };
}

export function parseRestrictedResourceScope(body: {
  resourceAccess?: unknown;
  componentIds?: unknown;
  accountIds?: unknown;
}):
  | { mode: 'full' }
  | { mode: 'restricted'; componentIds: string[]; accountIds: string[] }
  | { error: string } {
  if (body.resourceAccess !== 'restricted') {
    return { mode: 'full' };
  }

  const componentIds = sanitizeResourceIdList(body.componentIds);
  const accountIds = sanitizeResourceIdList(body.accountIds);

  if (componentIds.length === 0 && accountIds.length === 0) {
    return { error: 'Select at least one component or account for restricted access' };
  }

  return { mode: 'restricted', componentIds, accountIds };
}

export function memberScopeFieldsFromGrant(
  grant: { mode: 'full' } | { mode: 'restricted'; componentIds: string[]; accountIds: string[] }
): { componentIds?: mongoose.Types.ObjectId[]; accountIds?: mongoose.Types.ObjectId[] } {
  if (grant.mode === 'full') {
    return { componentIds: undefined, accountIds: undefined };
  }

  return {
    componentIds: toObjectIdList(grant.componentIds),
    accountIds: toObjectIdList(grant.accountIds),
  };
}

export function applyMemberScopeFields(
  member: {
    resourceScope?: 'full' | 'restricted';
    componentIds?: mongoose.Types.ObjectId[];
    accountIds?: mongoose.Types.ObjectId[];
  },
  grant: { mode: 'full' } | { mode: 'restricted'; componentIds: string[]; accountIds: string[] }
): void {
  if (grant.mode === 'full') {
    delete member.resourceScope;
    delete member.componentIds;
    delete member.accountIds;
    return;
  }

  member.resourceScope = 'restricted';
  member.componentIds = toObjectIdList(grant.componentIds);
  member.accountIds = toObjectIdList(grant.accountIds);
}

export async function validateProjectResourceIds(
  projectId: string,
  componentIds: string[],
  accountIds: string[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isValidObjectId(projectId)) {
    return { ok: false, error: 'Invalid project ID format' };
  }

  if (componentIds.length > 0) {
    const found = await Component.countDocuments({
      projectId,
      _id: { $in: componentIds },
    });
    if (found !== componentIds.length) {
      return { ok: false, error: 'One or more component IDs are invalid for this project' };
    }
  }

  if (accountIds.length > 0) {
    const found = await AssociatedAccount.countDocuments({
      projectId,
      _id: { $in: accountIds },
    });
    if (found !== accountIds.length) {
      return { ok: false, error: 'One or more account IDs are invalid for this project' };
    }
  }

  return { ok: true };
}

export async function removeResourceFromMemberScopes(
  projectId: string,
  field: 'componentIds' | 'accountIds',
  resourceId: string
): Promise<void> {
  if (!isValidObjectId(projectId) || !isValidObjectId(resourceId)) {
    return;
  }

  await Project.updateOne(
    { _id: projectId },
    { $pull: { [`members.$[].${field}`]: new mongoose.Types.ObjectId(resourceId) } }
  );
}

export function filterIdsByScope<T extends { _id: { toString(): string } }>(
  items: T[],
  scope: string[] | null,
  unrestricted: boolean
): T[] {
  if (unrestricted || scope === null) {
    return items;
  }
  const allowed = new Set(scope);
  return items.filter((item) => allowed.has(item._id.toString()));
}
