'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsAPI } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useOrgDataReady } from '@/hooks/useAuthReady';

export interface ProjectListItem {
  _id: string;
  name: string;
  organizationId?: {
    _id: string;
    name: string;
    slug: string;
    type: 'personal' | 'team';
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  members: Array<{
    userId: {
      _id: string;
      name: string;
      email: string;
    };
    permission: 'read' | 'write';
  }>;
  createdAt: string;
  environmentSlugs?: string[];
  effectivePermissions?: string[];
}

export function useProjects(orgId?: string) {
  const orgDataReady = useOrgDataReady();

  return useQuery({
    queryKey: queryKeys.projects(orgId),
    queryFn: () => projectsAPI.list(orgId) as Promise<ProjectListItem[]>,
    enabled: orgDataReady && !!orgId,
  });
}

export function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return (orgId?: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects(orgId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projects() });
  };
}
