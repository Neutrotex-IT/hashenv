import { describe, expect, it } from 'vitest';
import { canManageOrgMember, canPerformOrgAction } from '../lib/abac';
import {
  ALL_ORG_PERMISSIONS,
  getEffectiveOrgPermissions,
  getProjectCapabilitiesFromAccess,
  OrgPermission,
  sanitizeOrgPermissions,
  sanitizeProjectPermissions,
} from '../lib/permissions';

describe('getEffectiveOrgPermissions', () => {
  it('grants all permissions to owners and admins', () => {
    expect(getEffectiveOrgPermissions('owner', []).has('org:create_project')).toBe(true);
    expect(getEffectiveOrgPermissions('admin', []).has('org:invite')).toBe(true);
  });

  it('uses explicit grants only for members', () => {
    const effective = getEffectiveOrgPermissions('member', ['org:invite']);
    expect(effective.has('org:invite')).toBe(true);
    expect(effective.has('org:create_project')).toBe(false);
  });

  it('does not inherit role defaults when member grants are empty', () => {
    for (const permission of ALL_ORG_PERMISSIONS) {
      expect(getEffectiveOrgPermissions('member', []).has(permission)).toBe(false);
    }
  });

  it('grants only the permissions explicitly stored for members', () => {
    const granted: OrgPermission[] = ['org:invite', 'org:audit'];
    const effective = getEffectiveOrgPermissions('member', granted);

    for (const permission of ALL_ORG_PERMISSIONS) {
      expect(effective.has(permission)).toBe(granted.includes(permission));
    }
  });
});

describe('canPerformOrgAction', () => {
  it.each(ALL_ORG_PERMISSIONS)(
    'denies %s when it is not explicitly granted to a member',
    (permission) => {
      expect(canPerformOrgAction({ role: 'member', permissions: [] }, permission)).toBe(false);
    }
  );

  it.each(ALL_ORG_PERMISSIONS)(
    'allows %s when it is explicitly granted to a member',
    (permission) => {
      expect(canPerformOrgAction({ role: 'member', permissions: [permission] }, permission)).toBe(
        true
      );
    }
  );
});

describe('getProjectCapabilitiesFromAccess', () => {
  it('derives read/write from access level only', () => {
    const readOnly = getProjectCapabilitiesFromAccess('read', []);
    expect(readOnly.has('project:read')).toBe(true);
    expect(readOnly.has('project:write')).toBe(false);
    expect(readOnly.has('project:invite')).toBe(false);
    expect(readOnly.has('project:manage_members')).toBe(false);
    expect(readOnly.has('project:manage_tokens')).toBe(false);
    expect(readOnly.has('project:panic')).toBe(false);

    const writeAccess = getProjectCapabilitiesFromAccess('write', []);
    expect(writeAccess.has('project:read')).toBe(true);
    expect(writeAccess.has('project:write')).toBe(true);
    expect(writeAccess.has('project:invite')).toBe(false);
  });

  it('uses explicit project capability grants without hidden defaults', () => {
    const capabilities = getProjectCapabilitiesFromAccess('write', ['project:invite']);
    expect(capabilities.has('project:invite')).toBe(true);
    expect(capabilities.has('project:manage_members')).toBe(false);
    expect(capabilities.has('project:manage_tokens')).toBe(false);
    expect(capabilities.has('project:panic')).toBe(false);
  });

  it('includes project:panic when explicitly granted', () => {
    const capabilities = getProjectCapabilitiesFromAccess('write', ['project:panic']);
    expect(capabilities.has('project:panic')).toBe(true);
  });

  it('includes project:export when explicitly granted', () => {
    const capabilities = getProjectCapabilitiesFromAccess('read', ['project:export']);
    expect(capabilities.has('project:export')).toBe(true);
    expect(capabilities.has('project:write')).toBe(false);
  });
});

describe('canManageOrgMember', () => {
  it('allows members with org:manage_members to manage peer members', () => {
    const actor = { role: 'member' as const, permissions: ['org:manage_members' as OrgPermission] };
    expect(canManageOrgMember(actor, 'member')).toBe(true);
  });

  it('blocks members with org:manage_members from managing admins', () => {
    const actor = { role: 'member' as const, permissions: ['org:manage_members' as OrgPermission] };
    expect(canManageOrgMember(actor, 'admin')).toBe(false);
  });

  it('blocks members without org:manage_members from managing anyone', () => {
    const actor = { role: 'member' as const, permissions: [] };
    expect(canManageOrgMember(actor, 'member')).toBe(false);
  });

  it('never allows managing the owner role', () => {
    expect(canManageOrgMember({ role: 'owner', permissions: [] }, 'owner')).toBe(false);
    expect(canManageOrgMember({ role: 'admin', permissions: [] }, 'owner')).toBe(false);
  });
});

describe('permission sanitization', () => {
  it('filters unknown org permissions and deduplicates values', () => {
    const sanitized = sanitizeOrgPermissions([
      'org:invite',
      'org:invite',
      'org:not_real',
      42,
      'org:audit',
    ]);

    expect(sanitized).toEqual(['org:invite', 'org:audit']);
  });

  it('returns an empty array for non-array org permission input', () => {
    expect(sanitizeOrgPermissions(null)).toEqual([]);
    expect(sanitizeOrgPermissions('org:invite')).toEqual([]);
  });

  it('filters unknown project permissions and deduplicates values', () => {
    const sanitized = sanitizeProjectPermissions([
      'project:panic',
      'project:panic',
      'project:fake',
      'project:export',
    ]);

    expect(sanitized).toEqual(['project:panic', 'project:export']);
  });
});

describe('resource scope', () => {
  it('treats missing resourceScope as unrestricted', async () => {
    const { scopeListsFromStoredIds } = await import('../lib/resourceScope');
    expect(scopeListsFromStoredIds('full', undefined, undefined)).toEqual({
      componentIds: null,
      accountIds: null,
    });
    expect(scopeListsFromStoredIds(undefined, undefined, undefined)).toEqual({
      componentIds: null,
      accountIds: null,
    });
  });

  it('treats restricted scope with empty arrays as no access', async () => {
    const { scopeListsFromStoredIds } = await import('../lib/resourceScope');
    expect(scopeListsFromStoredIds('restricted', [], [])).toEqual({
      componentIds: [],
      accountIds: [],
    });
  });

  it('stores restricted scope explicitly on members', async () => {
    const { applyMemberScopeFields, resolveMemberResourceScope, scopeListsFromMember } = await import(
      '../lib/resourceScope'
    );
    const member: {
      resourceScope?: 'full' | 'restricted';
      componentIds?: import('mongoose').Types.ObjectId[];
      accountIds?: import('mongoose').Types.ObjectId[];
    } = {};

    applyMemberScopeFields(member, {
      mode: 'restricted',
      componentIds: ['507f1f77bcf86cd799439011'],
      accountIds: [],
    });

    expect(member.resourceScope).toBe('restricted');
    expect(resolveMemberResourceScope(member)).toBe('restricted');
    expect(scopeListsFromMember(member)).toEqual({
      componentIds: ['507f1f77bcf86cd799439011'],
      accountIds: [],
    });
  });

  it('allows unrestricted actors to access any scoped resource id', async () => {
    const { canAccessScopedResource } = await import('../lib/resourceScope');
    expect(canAccessScopedResource(null, 'abc', true)).toBe(true);
    expect(canAccessScopedResource(['abc'], 'def', true)).toBe(true);
  });

  it('enforces allowlists for restricted actors', async () => {
    const { canAccessScopedResource } = await import('../lib/resourceScope');
    expect(canAccessScopedResource(null, 'abc', false)).toBe(true);
    expect(canAccessScopedResource(['abc'], 'abc', false)).toBe(true);
    expect(canAccessScopedResource(['abc'], 'def', false)).toBe(false);
    expect(canAccessScopedResource([], 'abc', false)).toBe(false);
  });

  it('blocks restricted actors from granting full resource access', async () => {
    const { canGrantResourceScope } = await import('../lib/resourceScope');
    const actor = {
      unrestricted: false,
      componentIds: ['a'],
      accountIds: null,
    };
    expect(canGrantResourceScope(actor, { resourceAccess: 'full' }).allowed).toBe(false);
    expect(
      canGrantResourceScope(actor, {
        resourceAccess: 'restricted',
        componentIds: ['a'],
        accountIds: [],
      }).allowed
    ).toBe(true);
    expect(
      canGrantResourceScope(actor, {
        resourceAccess: 'restricted',
        componentIds: ['b'],
        accountIds: [],
      }).allowed
    ).toBe(false);
  });

  it('requires at least one resource for restricted grants', async () => {
    const { parseRestrictedResourceScope } = await import('../lib/resourceScope');
    expect(parseRestrictedResourceScope({ resourceAccess: 'full' })).toEqual({ mode: 'full' });
    expect(parseRestrictedResourceScope({ resourceAccess: 'restricted', componentIds: [], accountIds: [] })).toEqual({
      error: 'Select at least one component or account for restricted access',
    });
    expect(
      parseRestrictedResourceScope({ resourceAccess: 'restricted', componentIds: ['507f1f77bcf86cd799439011'] })
    ).toEqual({
      mode: 'restricted',
      componentIds: ['507f1f77bcf86cd799439011'],
      accountIds: [],
    });
  });
});
