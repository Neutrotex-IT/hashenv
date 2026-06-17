'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
