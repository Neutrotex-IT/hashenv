import { hasOrgPermission, OrgPermission } from '@/lib/permissions';

export interface NavLink {
  name: string;
  href: string;
  exact?: boolean;
}

export function getWorkspaceNav(): NavLink[] {
  return [
    { name: 'Dashboard', href: '/dashboard', exact: true },
    { name: 'New project', href: '/projects/new' },
  ];
}

export function getAccountNav(): NavLink[] {
  return [{ name: 'Account settings', href: '/settings', exact: true }];
}

export function getOrgNav(
  orgId: string,
  role: 'member' | 'admin' | 'owner' | undefined,
  permissions: OrgPermission[]
): NavLink[] {
  if (!role) return [];
  const items: NavLink[] = [];

  if (
    hasOrgPermission(role, permissions, 'org:invite') ||
    hasOrgPermission(role, permissions, 'org:manage_members')
  ) {
    items.push({
      name: 'Members',
      href: `/organizations/${orgId}/members`,
      exact: true,
    });
  }

  if (hasOrgPermission(role, permissions, 'org:update')) {
    items.push({
      name: 'Organization settings',
      href: `/organizations/${orgId}/settings`,
      exact: true,
    });
  }

  if (hasOrgPermission(role, permissions, 'org:audit')) {
    items.push({
      name: 'Audit log',
      href: `/organizations/${orgId}/audit`,
      exact: true,
    });
  }

  return items;
}

export function getProjectNav(projectId: string): NavLink[] {
  return [
    { name: 'Env files', href: `/projects/${projectId}`, exact: true },
    { name: 'Environments', href: `/projects/${projectId}/environments` },
    { name: 'Members', href: `/projects/${projectId}/members` },
    { name: 'API tokens', href: `/projects/${projectId}/tokens` },
    { name: 'Activity', href: `/projects/${projectId}/activity` },
    { name: 'Project settings', href: `/projects/${projectId}/settings` },
  ];
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
    { id: 'panic', label: 'Panic button' },
  ] as const;
}
