'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, ProjectPermissionsResponse } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthReady } from '@/hooks/useAuthReady';

export interface ProjectDetail {
  _id: string;
  name: string;
  organizationId?: string | { _id: string; name?: string; slug?: string; type?: string };
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
    permissions?: string[];
  }>;
  createdAt: string;
}

export function useProject(projectId: string | undefined) {
  const authReady = useAuthReady();

  return useQuery<ProjectDetail>({
    queryKey: queryKeys.project(projectId ?? ''),
    queryFn: () => projectsAPI.get(projectId!) as Promise<ProjectDetail>,
    enabled: authReady && !!projectId,
  });
}

export function useProjectPermissions(projectId: string | undefined) {
  const authReady = useAuthReady();

  return useQuery<ProjectPermissionsResponse>({
    queryKey: queryKeys.projectPermissions(projectId ?? ''),
    queryFn: () => projectsAPI.getPermissions(projectId!),
    enabled: authReady && !!projectId,
  });
}

export function useInvalidateProject() {
  const queryClient = useQueryClient();
  return (projectId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.projectPermissions(projectId) });
  };
}

export type { ProjectPermissionsResponse };
