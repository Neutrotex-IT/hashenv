'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useConfirm } from '@/contexts/ConfirmContext';
import { useToast } from '@/contexts/ToastContext';
import { organizationsAPI, OrganizationSettingsResponse } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthReady } from '@/hooks/useAuthReady';

function hasConfiguredActions(settings: OrganizationSettingsResponse): boolean {
  const { panicButton } = settings;
  return (
    panicButton.flushEnvs ||
    panicButton.flushSecrets ||
    panicButton.revokeApiTokens ||
    panicButton.revokeCollaborators ||
    panicButton.downloadEnvs
  );
}

interface OrgPanicContextValue {
  visible: boolean;
  loading: boolean;
  execute: () => Promise<void>;
  eligibleProjectCount: number;
  orgName?: string;
  /** Triggers a lazy settings fetch when the panic UI is mounted (team orgs only). */
  requestProbe: () => void;
}

const OrgPanicContext = createContext<OrgPanicContextValue | null>(null);

export function OrgPanicProvider({ children }: { children: React.ReactNode }) {
  const { currentOrg } = useOrganization();
  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();
  const authReady = useAuthReady();
  const [probeEnabled, setProbeEnabled] = useState(false);
  const [executing, setExecuting] = useState(false);

  const teamOrgId = currentOrg?.type === 'team' ? currentOrg._id : undefined;

  useEffect(() => {
    setProbeEnabled(false);
  }, [teamOrgId]);

  const requestProbe = useCallback(() => {
    if (teamOrgId) {
      setProbeEnabled(true);
    }
  }, [teamOrgId]);

  const { data: panicSettings } = useQuery({
    queryKey: queryKeys.orgPanicSettings(teamOrgId ?? ''),
    queryFn: () => organizationsAPI.getSettings(teamOrgId!),
    enabled: authReady && !!teamOrgId && probeEnabled,
    staleTime: 60_000,
  });

  const visible =
    !!currentOrg &&
    !!panicSettings?.canExecute &&
    hasConfiguredActions(panicSettings);

  const execute = useCallback(async () => {
    if (!currentOrg?._id) {
      toastError('Panic button not configured. Please configure it in organization settings.');
      return;
    }

    let settings = panicSettings;
    if (!settings) {
      try {
        settings = await organizationsAPI.getSettings(currentOrg._id);
      } catch {
        toastError('Failed to load panic button settings.');
        return;
      }
    }

    if (!settings.canExecute) {
      toastError('You do not have permission to run panic actions on any project in this organization.');
      return;
    }

    const panicButtonSettings = settings.panicButton;
    const { flushEnvs, flushSecrets, revokeApiTokens, revokeCollaborators, downloadEnvs, askConfirmation } =
      panicButtonSettings;

    if (!hasConfiguredActions(settings)) {
      toastError('No panic actions configured. Configure them in organization settings first.');
      return;
    }

    if (askConfirmation) {
      const confirmMessage =
        `Run panic actions for ${currentOrg.name} on ${settings.eligibleProjectCount} ` +
        `${settings.eligibleProjectCount === 1 ? 'project' : 'projects'} you are allowed to affect?\n\n` +
        `${downloadEnvs ? '• Download all environment files\n' : ''}` +
        `${flushEnvs ? '• Delete all environment files\n' : ''}` +
        `${flushSecrets ? '• Delete all secrets and associated accounts\n' : ''}` +
        `${revokeApiTokens ? '• Revoke all API tokens\n' : ''}` +
        `${revokeCollaborators ? '• Revoke all collaborator access\n' : ''}`;

      const ok = await confirm({
        title: 'Execute panic actions?',
        message: confirmMessage,
        confirmLabel: 'Continue',
        variant: 'danger',
      });
      if (!ok) return;
    }

    const password = window.prompt('Enter your password to execute panic actions:');
    if (!password) {
      toastError('Password is required to execute panic actions');
      return;
    }

    setExecuting(true);
    try {
      const result = await organizationsAPI.panic(currentOrg._id, password);

      if (result.results?.downloadEnvs && result.results?.downloadContent) {
        const mimeType = result.results.downloadMimeType || 'application/json';
        const blob = new Blob([result.results.downloadContent], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', result.results.downloadFilename || 'hashenv-backup.json');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } else if (result.results?.downloadError) {
        toastError(result.results.downloadError);
      }

      const actions = [];
      if (result.results?.downloadEnvs) actions.push('downloaded');
      if (result.results?.flushEnvs) actions.push('envs flushed');
      if (result.results?.flushSecrets) actions.push('secrets flushed');
      if (result.results?.revokeApiTokens) actions.push('API tokens revoked');
      if (result.results?.revokeCollaborators) actions.push('collaborators revoked');

      toastSuccess(`Panic actions executed: ${actions.join(', ')}`);
      window.dispatchEvent(new CustomEvent('hashenv:panic-executed'));
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      toastError(axiosErr.response?.data?.error || 'Failed to execute panic actions');
    } finally {
      setExecuting(false);
    }
  }, [confirm, currentOrg, panicSettings, toastError, toastSuccess]);

  const value = useMemo(
    () => ({
      visible,
      loading: executing,
      execute,
      eligibleProjectCount: panicSettings?.eligibleProjectCount ?? 0,
      orgName: currentOrg?.name,
      requestProbe,
    }),
    [visible, executing, execute, panicSettings?.eligibleProjectCount, currentOrg?.name, requestProbe]
  );

  return <OrgPanicContext.Provider value={value}>{children}</OrgPanicContext.Provider>;
}

export function useOrgPanic() {
  const context = useContext(OrgPanicContext);
  if (!context) {
    throw new Error('useOrgPanic must be used within OrgPanicProvider');
  }
  return context;
}
