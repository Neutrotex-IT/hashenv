export const queryKeys = {
  projects: (orgId?: string) => ['projects', orgId ?? 'all'] as const,
  project: (projectId: string) => ['project', projectId] as const,
  projectPermissions: (projectId: string) => ['project', projectId, 'permissions'] as const,
  projectEnvironments: (projectId: string) => ['project', projectId, 'environments'] as const,
  orgPanicSettings: (orgId: string) => ['organization', orgId, 'panic-settings'] as const,
};
