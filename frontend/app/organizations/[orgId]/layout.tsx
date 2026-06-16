'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOrganization } from '@/contexts/OrganizationContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { OrgSubnav } from '@/components/OrgSubnav';

export default function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgId = params.orgId as string;
  const { organizations } = useOrganization();
  const org = organizations.find((item) => item._id === orgId);

  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-6">
              <Link
                href="/dashboard"
                className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block mb-4"
              >
                ← Back to Dashboard
              </Link>
              {org && (
                <p className="text-sm text-[var(--text-muted)]">{org.name}</p>
              )}
            </div>
            <OrgSubnav org={org} />
            {children}
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
