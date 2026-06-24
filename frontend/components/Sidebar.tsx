'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { OrgSwitcher } from './OrgSwitcher';
import { CreateOrganizationModal } from './CreateOrganizationModal';
import {
  getWorkspaceNav,
  getAccountNav,
  getOrgNav,
  isNavActive,
  NavLink,
} from '@/lib/navigation';
import { OrgPermission } from '@/lib/permissions';
import { useProjects, useInvalidateProjects } from '@/hooks/queries/useProjects';

interface SidebarProps {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const RAIL_ICONS: { id: string; href: string; label: string; icon: string; exact?: boolean }[] = [
  { id: 'dashboard', href: '/dashboard', label: 'Dashboard', icon: 'dashboard', exact: true },
  { id: 'settings', href: '/settings', label: 'Account settings', icon: 'settings', exact: true },
];

function RailIcon({ name }: { name: string }) {
  const className = 'h-5 w-5';
  switch (name) {
    case 'dashboard':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
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
    case 'plus':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 4v16m8-8H4" />
        </svg>
      );
    default:
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
  }
}

function iconForOrgLink(link: NavLink): string {
  if (link.href.endsWith('/members')) return 'users';
  if (link.href.endsWith('/audit')) return 'audit';
  return 'settings';
}

function PaneLink({
  item,
  pathname,
  onNavigate,
  indent = false,
}: {
  item: NavLink;
  pathname: string;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  const active = isNavActive(pathname, item.href, item.exact);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`relative flex items-center gap-2.5 rounded-[var(--radius-md)] py-2 text-sm transition-colors ${
        indent ? 'pl-5 pr-3' : 'px-3'
      } ${
        active
          ? 'bg-[var(--accent-muted)] font-medium text-[var(--foreground)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
      }`}
    >
      {active && (
        <span className="absolute bottom-1 left-0 top-1 w-0.5 rounded-full bg-[var(--accent)]" aria-hidden />
      )}
      <span className="truncate">{item.name}</span>
    </Link>
  );
}

export function Sidebar({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { currentOrg } = useOrganization();
  const invalidateProjects = useInvalidateProjects();
  const { data: projectList = [] } = useProjects(currentOrg?._id);
  const [projectSearch, setProjectSearch] = useState('');
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const projects = useMemo(
    () => projectList.map((p) => ({ _id: p._id, name: p.name })),
    [projectList]
  );

  const orgPermissions = (currentOrg?.permissions ?? []) as OrgPermission[];
  const projectIdMatch = pathname.match(/^\/projects\/([^/]+)/);
  const activeProjectId = projectIdMatch?.[1];

  useEffect(() => {
    const onPanic = () => {
      invalidateProjects(currentOrg?._id);
    };
    window.addEventListener('hashenv:panic-executed', onPanic);
    return () => window.removeEventListener('hashenv:panic-executed', onPanic);
  }, [currentOrg?._id, invalidateProjects]);

  const workspaceNav = getWorkspaceNav(
    currentOrg ? { role: currentOrg.role, permissions: orgPermissions } : undefined
  );
  const accountNav = getAccountNav();
  const orgNav =
    currentOrg?.type === 'team'
      ? getOrgNav(currentOrg._id, currentOrg.role, orgPermissions, currentOrg.type)
      : [];

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, projectSearch]);

  const orgRailLinks = orgNav.map((link) => ({
    id: link.href,
    href: link.href,
    label: link.name,
    icon: iconForOrgLink(link),
    exact: link.exact,
  }));

  const showPane = !collapsed || mobileOpen;

  const sidebarInner = (
    <div className="flex h-full">
      {/* Icon rail */}
      <div className="flex w-[var(--sidebar-rail)] shrink-0 flex-col items-center border-r border-[var(--border-subtle)] bg-[var(--surface)] py-3">
        <Link
          href="/dashboard"
          className="mb-4 flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)]"
          title="HashEnv"
        >
          <Image
            src="/hashenv-transparent.svg"
            alt="HashEnv"
            width={36}
            height={36}
            className="h-9 w-9"
          />
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1">
          {RAIL_ICONS.map((item) => {
            const active = isNavActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onMobileClose}
                title={item.label}
                className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] transition-colors ${
                  active
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                }`}
              >
                <RailIcon name={item.icon} />
              </Link>
            );
          })}

          {orgRailLinks.length > 0 && (
            <div className="my-2 h-px w-6 bg-[var(--border-subtle)]" aria-hidden />
          )}

          {orgRailLinks.map((item) => {
            const active = isNavActive(pathname, item.href, item.exact);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={onMobileClose}
                title={item.label}
                className={`flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] transition-colors ${
                  active
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]'
                }`}
              >
                <RailIcon name={item.icon} />
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          className="mt-auto hidden h-10 w-10 items-center justify-center rounded-[var(--radius-md)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] lg:flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {collapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 5l7 7-7 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
            )}
          </svg>
        </button>
      </div>

      {/* Nav pane */}
      {showPane && (
        <div className="flex w-[var(--sidebar-pane)] shrink-0 flex-col bg-[var(--surface)]">
          <div className="flex h-[var(--topbar-height)] shrink-0 items-center justify-between border-b border-[var(--border)] px-3">
            <span className="text-sm font-semibold text-[var(--foreground)]">HashEnv</span>
            <button
              type="button"
              onClick={onMobileClose}
              className="rounded-[var(--radius-md)] p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] lg:hidden"
              aria-label="Close menu"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="border-b border-[var(--border-subtle)] p-3">
            <OrgSwitcher />
          </div>

          <div className="p-3">
            <div className="relative">
              <svg
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search projects…"
                value={projectSearch}
                onChange={(e) => setProjectSearch(e.target.value)}
                className="h-9 w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-hover)] pl-9 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
              />
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 pb-4">
            {workspaceNav.length > 0 && (
              <div className="mb-2">
                <p className="nav-section-label">Workspace</p>
                {workspaceNav.map((item) => (
                  <PaneLink key={item.href} item={item} pathname={pathname} onNavigate={onMobileClose} />
                ))}
              </div>
            )}

            <div className="mb-2">
              <p className="nav-section-label">Projects</p>
              {filteredProjects.length === 0 ? (
                <p className="px-3 py-2 text-xs text-[var(--text-muted)]">
                  {projectSearch ? 'No matching projects' : 'No projects yet'}
                </p>
              ) : (
                filteredProjects.map((project) => (
                  <PaneLink
                    key={project._id}
                    item={{ name: project.name, href: `/projects/${project._id}`, exact: true }}
                    pathname={pathname}
                    onNavigate={onMobileClose}
                    indent
                  />
                ))
              )}
            </div>

            {orgNav.length > 0 && (
              <div className="mb-2">
                <p className="nav-section-label">{currentOrg?.name ?? 'Organization'}</p>
                {orgNav.map((item) => (
                  <PaneLink key={item.href} item={item} pathname={pathname} onNavigate={onMobileClose} />
                ))}
              </div>
            )}

            <div>
              <p className="nav-section-label">Account</p>
              {accountNav.map((item) => (
                <PaneLink key={item.href} item={item} pathname={pathname} onNavigate={onMobileClose} />
              ))}
            </div>
          </nav>
        </div>
      )}

      <CreateOrganizationModal isOpen={createOrgOpen} onClose={() => setCreateOrgOpen(false)} />
    </div>
  );

  const sidebarWidth = collapsed && !mobileOpen
    ? 'var(--sidebar-rail)'
    : 'calc(var(--sidebar-rail) + var(--sidebar-pane))';

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[calc(var(--z-sidebar)-1)] bg-black/60 lg:hidden"
          onClick={onMobileClose}
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        style={{ width: sidebarWidth }}
        className={`fixed left-0 top-0 z-[var(--z-sidebar)] h-full border-r border-[var(--border)] motion-panel ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {sidebarInner}
      </aside>
    </>
  );
}

export function sidebarOffsetClass(collapsed: boolean): string {
  return collapsed ? 'lg:ml-[var(--sidebar-rail)]' : 'lg:ml-[calc(var(--sidebar-rail)+var(--sidebar-pane))]';
}
