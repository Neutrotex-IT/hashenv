'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrgSwitcher } from './OrgSwitcher';
import { Button } from './ui/Button';
import {
  getWorkspaceNav,
  getAccountNav,
  getOrgNav,
  getProjectNav,
  isNavActive,
  NavLink,
} from '@/lib/navigation';
import { OrgPermission } from '@/lib/permissions';

interface SidebarProps {
  onLogout: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function NavIcon({ name }: { name: string }) {
  const className = 'h-5 w-5 shrink-0';

  switch (name) {
    case 'dashboard':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
        </svg>
      );
    case 'plus':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
        </svg>
      );
    case 'users':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'settings':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    case 'audit':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'files':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    case 'layers':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      );
    case 'key':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      );
    case 'activity':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
  }
}

function iconForLink(link: NavLink): string {
  if (link.href === '/dashboard') return 'dashboard';
  if (link.href === '/projects/new') return 'plus';
  if (link.href === '/settings') return 'settings';
  if (link.href.includes('/organizations/') && link.href.endsWith('/members')) return 'users';
  if (link.href.includes('/organizations/') && link.href.endsWith('/settings')) return 'settings';
  if (link.href.includes('/organizations/') && link.href.endsWith('/audit')) return 'audit';
  if (link.href.match(/\/projects\/[^/]+$/) && link.exact) return 'files';
  if (link.href.endsWith('/environments')) return 'layers';
  if (link.href.endsWith('/members')) return 'users';
  if (link.href.endsWith('/tokens')) return 'key';
  if (link.href.endsWith('/activity')) return 'activity';
  if (link.href.endsWith('/settings')) return 'settings';
  return 'default';
}

function NavSection({
  label,
  items,
  pathname,
  collapsed,
  onNavigate,
}: {
  label?: string;
  items: NavLink[];
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-1">
      {label && !collapsed && (
        <p className="px-3 pb-1 pt-4 text-[11px] font-medium uppercase tracking-wide text-[var(--text-muted)] first:pt-0">
          {label}
        </p>
      )}
      {items.map((item) => {
        const active = isNavActive(pathname, item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.name : undefined}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              active
                ? 'bg-[var(--accent)]/15 font-medium text-[var(--accent)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)]'
            }`}
          >
            <NavIcon name={iconForLink(item)} />
            {!collapsed && <span className="truncate">{item.name}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar({
  onLogout,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { currentOrg } = useOrganization();

  const orgPermissions = (currentOrg?.permissions ?? []) as OrgPermission[];
  const projectIdMatch = pathname.match(/^\/projects\/([^/]+)/);
  const activeProjectId = projectIdMatch?.[1];

  const workspaceNav = getWorkspaceNav();
  const accountNav = getAccountNav();
  const orgNav =
    currentOrg?.type === 'team'
      ? getOrgNav(currentOrg._id, currentOrg.role, orgPermissions)
      : [];
  const projectNav = activeProjectId ? getProjectNav(activeProjectId) : [];

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
        {!collapsed && (
          <Link href="/dashboard" className="text-lg font-semibold text-[var(--foreground)]">
            HashEnv
          </Link>
        )}
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="hidden rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] hover:text-[var(--foreground)] lg:block"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>
        <button
          type="button"
          onClick={onMobileClose}
          className="rounded-md p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-elevated)] lg:hidden"
          aria-label="Close menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {!collapsed && (
        <div className="border-b border-[var(--border)] p-4">
          <OrgSwitcher />
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-3">
        <NavSection
          label="Workspace"
          items={workspaceNav}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onMobileClose}
        />
        {orgNav.length > 0 && (
          <NavSection
            label={currentOrg?.name ?? 'Organization'}
            items={orgNav}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onMobileClose}
          />
        )}
        {projectNav.length > 0 && (
          <NavSection
            label="Project"
            items={projectNav}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onMobileClose}
          />
        )}
        <NavSection
          label="Account"
          items={accountNav}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={onMobileClose}
        />
      </nav>

      <div className="border-t border-[var(--border)] p-4">
        {!collapsed && user && (
          <div className="mb-3 rounded-md bg-[var(--surface-elevated)] p-3">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
          </div>
        )}
        <Button
          variant="danger"
          size="sm"
          onClick={onLogout}
          className="w-full"
          title={collapsed ? 'Logout' : undefined}
        >
          {!collapsed ? 'Logout' : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onMobileClose}
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 h-full border-r border-[var(--border)] bg-[var(--surface)] transition-all duration-300 ${
          collapsed ? 'w-16' : 'w-64'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
