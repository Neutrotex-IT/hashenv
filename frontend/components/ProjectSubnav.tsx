'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

export function ProjectSubnav() {
  const params = useParams();
  const pathname = usePathname();
  const projectId = params.id as string;
  const base = `/projects/${projectId}`;

  const links = [
    { href: base, label: 'Overview', exact: true },
    { href: `${base}/members`, label: 'Members' },
    { href: `${base}/tokens`, label: 'Tokens' },
    { href: `${base}/activity`, label: 'Activity' },
    { href: `${base}/settings`, label: 'Settings' },
    { href: `${base}/environments`, label: 'Environments' },
  ];

  return (
    <nav className="mb-6 border-b border-[var(--border)]">
      <div className="-mb-px flex flex-wrap gap-4 sm:gap-6">
        {links.map((link) => {
          const isActive = link.exact
            ? pathname === link.href
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-[var(--accent)] text-[var(--accent)]'
                  : 'border-transparent text-[var(--text-muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
