'use client';

import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { ProjectSubnav } from '@/components/ProjectSubnav';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Link
              href="/dashboard"
              className="text-sm text-[var(--accent)] hover:text-[var(--accent-hover)] inline-block mb-4"
            >
              ← Back to Dashboard
            </Link>
            <ProjectSubnav />
            {children}
          </div>
        </div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
