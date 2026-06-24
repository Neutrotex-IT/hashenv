'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar } from './ui/Avatar';

interface UserMenuProps {
  onLogout: () => void;
}

export function UserMenu({ onLogout }: UserMenuProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2.5 rounded-[var(--radius-md)] px-2 py-1.5 motion-colors hover:bg-[var(--surface-hover)]"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={user.name} size="md" />
        <span className="hidden max-w-[140px] truncate text-sm font-medium text-[var(--foreground)] sm:block">
          {user.name}
        </span>
        <svg
          className={`h-4 w-4 text-[var(--text-muted)] motion-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div role="menu" className="dropdown-menu dropdown-menu--align-end absolute right-0 top-full z-[var(--z-dropdown)] mt-2 w-[280px]">
          <div className="dropdown-header">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{user.name}</p>
                <p className="truncate text-xs text-[var(--text-muted)]">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="dropdown-section">
            <MenuLink href="/settings" icon="settings" onClick={() => setOpen(false)}>
              Account settings
            </MenuLink>
            <MenuLink href="/dashboard" icon="dashboard" onClick={() => setOpen(false)}>
              Dashboard
            </MenuLink>
          </div>

          <div className="dropdown-divider dropdown-section">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="dropdown-item dropdown-item--danger"
            >
              <LogoutIcon />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: string;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <Link href={href} role="menuitem" onClick={onClick} className="dropdown-item">
      <MenuIcon name={icon} />
      {children}
    </Link>
  );
}

function MenuIcon({ name }: { name: string }) {
  const className = 'h-4 w-4 shrink-0 text-[var(--text-muted)]';
  if (name === 'settings') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zm0 6a1 1 0 011-1h4a1 1 0 011 1v8a1 1 0 01-1 1h-4a1 1 0 01-1-1v-8zM4 13a1 1 0 011-1h4a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
