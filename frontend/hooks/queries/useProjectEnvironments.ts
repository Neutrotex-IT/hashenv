'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { environmentsAPI, ProjectEnvironment } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthReady } from '@/hooks/useAuthReady';

export function useProjectEnvironments(projectId: string | undefined) {
  const authReady = useAuthReady();

  return useQuery<ProjectEnvironment[]>({
    queryKey: queryKeys.projectEnvironments(projectId ?? ''),
    queryFn: () => environmentsAPI.list(projectId!),
    enabled: authReady && !!projectId,
  });
}

export function useInvalidateProjectEnvironments() {
  const queryClient = useQueryClient();
  return (projectId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.projectEnvironments(projectId) });
  };
}

export async function fetchProjectEnvironments(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string
): Promise<ProjectEnvironment[]> {
  return queryClient.fetchQuery({
    queryKey: queryKeys.projectEnvironments(projectId),
    queryFn: () => environmentsAPI.list(projectId),
  });
}

export type { ProjectEnvironment };
