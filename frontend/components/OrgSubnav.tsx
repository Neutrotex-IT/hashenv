'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Organization } from '@/lib/api';
import { hasOrgPermission, OrgPermission } from '@/lib/permissions';

interface OrgSubnavProps {
  org: Organization | undefined;
}

export function OrgSubnav({ org }: OrgSubnavProps) {
  const params = useParams();
  const pathname = usePathname();
  const orgId = params.orgId as string;

  const customPermissions = (org?.permissions ?? []) as OrgPermission[];
  const canUpdate = org
    ? hasOrgPermission(org.role, customPermissions, 'org:update')
    : false;
  const canAudit = org
    ? hasOrgPermission(org.role, customPermissions, 'org:audit')
    : false;

  const links = [
    { href: `/organizations/${orgId}/members`, label: 'Members', show: true },
    { href: `/organizations/${orgId}/settings`, label: 'Settings', show: canUpdate },
    { href: `/organizations/${orgId}/audit`, label: 'Audit', show: canAudit },
  ].filter((link) => link.show);

  if (links.length <= 1) return null;

  return (
    <nav className="mb-6 border-b border-[var(--border)]">
      <div className="-mb-px flex gap-6">
        {links.map((link) => {
          const isActive = pathname === link.href;
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
