'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { AuthenticatedLayout } from '@/components/AuthenticatedLayout';
import { ProjectShell } from '@/components/ProjectShell';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <ProjectShell>{children}</ProjectShell>
      </AuthenticatedLayout>
    </ProtectedRoute>
  );
}
