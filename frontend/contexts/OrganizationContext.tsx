'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { organizationsAPI, Organization, setForbiddenHandler } from '@/lib/api';
import { useAuth } from './AuthContext';

interface OrganizationContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  loading: boolean;
  error: string | null;
  setCurrentOrg: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

const CURRENT_ORG_KEY = 'hashenv_current_org';

export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshOrganizations = useCallback(async () => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setOrganizations([]);
      setCurrentOrgState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const orgs = await organizationsAPI.list();
      setOrganizations(orgs);

      // Restore last selected org or default to personal org
      const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
      const savedOrg = savedOrgId ? orgs.find((o: Organization) => o._id === savedOrgId) : null;
      
      if (savedOrg) {
        setCurrentOrgState(savedOrg);
      } else {
        // Default to personal org
        const personalOrg = orgs.find((o: Organization) => o.type === 'personal');
        if (personalOrg) {
          setCurrentOrgState(personalOrg);
          localStorage.setItem(CURRENT_ORG_KEY, personalOrg._id);
        } else if (orgs.length > 0) {
          setCurrentOrgState(orgs[0]);
          localStorage.setItem(CURRENT_ORG_KEY, orgs[0]._id);
        }
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    refreshOrganizations();
  }, [authLoading, refreshOrganizations]);

  useEffect(() => {
    setForbiddenHandler(() => {
      void refreshOrganizations();
    });
    return () => setForbiddenHandler(null);
  }, [refreshOrganizations]);

  const setCurrentOrg = useCallback((org: Organization) => {
    setCurrentOrgState(org);
    localStorage.setItem(CURRENT_ORG_KEY, org._id);
  }, []);

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrg,
        loading,
        error,
        setCurrentOrg,
        refreshOrganizations,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}
