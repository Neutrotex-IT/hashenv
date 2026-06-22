'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';

/** True when auth bootstrap finished and the user has a resolved session (or confirmed guest). */
export function useAuthReady() {
  const { loading: authLoading, isAuthenticated } = useAuth();
  return !authLoading && isAuthenticated;
}

/** True when auth and organization context are ready for org-scoped API calls. */
export function useOrgDataReady() {
  const authReady = useAuthReady();
  const { loading: orgLoading } = useOrganization();
  return authReady && !orgLoading;
}
