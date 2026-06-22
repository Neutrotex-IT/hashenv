'use client';

import { useOrganization } from '@/contexts/OrganizationContext';
import { OrgPanicButton } from './OrgPanicButton';
import { UserMenu } from './UserMenu';

interface TopBarProps {
  onLogout: () => void;
  onMenuOpen?: () => void;
}

export function TopBar({ onLogout, onMenuOpen }: TopBarProps) {
  const { currentOrg } = useOrganization();

  return (
    <header className="sticky top-0 z-[var(--z-sticky)] flex h-[var(--topbar-height)] shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuOpen}
          className="rounded-[var(--radius-md)] p-2 text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)] lg:hidden"
          aria-label="Open navigation menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-muted)]">Workspace</p>
          <h1 className="truncate text-base font-semibold text-[var(--foreground)]">
            {currentOrg?.name ?? 'HashEnv'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <OrgPanicButton variant="header" />
        <UserMenu onLogout={onLogout} />
      </div>
    </header>
  );
}
