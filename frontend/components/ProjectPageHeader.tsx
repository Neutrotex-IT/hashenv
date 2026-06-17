'use client';

import { PageHeader } from '@/components/ui/PageHeader';

interface ProjectPageHeaderProps {
  projectId: string;
  projectName: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function ProjectPageHeader({
  projectId,
  projectName,
  title,
  description,
  actions,
}: ProjectPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: projectName, href: `/projects/${projectId}` },
        { label: title },
      ]}
      actions={actions}
    />
  );
}
