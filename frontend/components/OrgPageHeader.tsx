'use client';

import { PageHeader } from '@/components/ui/PageHeader';

interface OrgPageHeaderProps {
  orgId: string;
  orgName: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export function OrgPageHeader({
  orgId,
  orgName,
  title,
  description,
  actions,
}: OrgPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: orgName, href: `/organizations/${orgId}/members` },
        { label: title },
      ]}
      actions={actions}
    />
  );
}
