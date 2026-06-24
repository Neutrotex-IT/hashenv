import {
  canAccessOrgMembers,
  canAccessProjectMembers,
  canConfigureOrgPanic,
  canManageProjectTokens,
  canReadProject,
  hasOrgPermission,
  OrgPermission,
} from '@/lib/permissions';

export interface NavLink {
  name: string;
  href: string;
  exact?: boolean;
}

export function getWorkspaceNav(options?: {
  role?: 'owner' | 'admin' | 'member';
  permissions?: OrgPermission[];
}): NavLink[] {
  const items: NavLink[] = [{ name: 'Dashboard', href: '/dashboard', exact: true }];

  if (
    !options?.role ||
    hasOrgPermission(options.role, options.permissions ?? [], 'org:create_project')
  ) {
    items.push({ name: 'New project', href: '/projects/new' });
  }

  return items;
}

export function getAccountNav(): NavLink[] {
  return [{ name: 'Account settings', href: '/settings', exact: true }];
}

export function getOrgNav(
  orgId: string,
  role: 'member' | 'admin' | 'owner' | undefined,
  permissions: OrgPermission[],
  orgType: 'personal' | 'team' = 'team'
): NavLink[] {
  if (!role) return [];
  const items: NavLink[] = [];

  if (orgType === 'team' && canAccessOrgMembers(role, permissions)) {
    items.push({
      name: 'Members',
      href: `/organizations/${orgId}/members`,
      exact: true,
    });
  }

  if (
    hasOrgPermission(role, permissions, 'org:update') ||
    canConfigureOrgPanic(role, permissions)
  ) {
    items.push({
      name: 'Organization settings',
      href: `/organizations/${orgId}/settings`,
      exact: true,
    });
  }

  if (orgType === 'team' && hasOrgPermission(role, permissions, 'org:audit')) {
    items.push({
      name: 'Audit log',
      href: `/organizations/${orgId}/audit`,
      exact: true,
    });
  }

  return items;
}

export function getProjectNav(
  projectId: string,
  options?: { collaborationEnabled?: boolean; effectivePermissions?: string[] }
): NavLink[] {
  const effective = options?.effectivePermissions ?? [];
  const permissionsLoaded = options?.effectivePermissions !== undefined;

  const items: NavLink[] = [];

  if (!permissionsLoaded || canReadProject(effective)) {
    items.push({ name: 'Secrets', href: `/projects/${projectId}`, exact: true });
  }

  items.push({ name: 'Environments', href: `/projects/${projectId}/environments` });

  if (
    options?.collaborationEnabled !== false &&
    (!permissionsLoaded || canAccessProjectMembers(effective))
  ) {
    items.push({ name: 'Members', href: `/projects/${projectId}/members` });
  }

  if (!permissionsLoaded || canManageProjectTokens(effective)) {
    items.push({ name: 'API tokens', href: `/projects/${projectId}/tokens` });
  }

  if (!permissionsLoaded || canReadProject(effective)) {
    items.push({ name: 'Activity', href: `/projects/${projectId}/activity` });
  }

  items.push({ name: 'Project settings', href: `/projects/${projectId}/settings` });

  return items;
}

export function isNavActive(
  pathname: string,
  href: string,
  exact?: boolean
): boolean {
  if (exact) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getSettingsSections() {
  return [
    { id: 'profile', label: 'Profile' },
    { id: 'auto-flush', label: 'Auto-flush' },
  ] as const;
}
